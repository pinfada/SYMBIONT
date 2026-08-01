import { coarsen, abstractRevision, integrateFragments } from '../collective';
import { KnowledgeModel } from '../KnowledgeModel';
import { HashingEmbedder, cosineSimilarity } from '../embedder';
import type { DeltaKind } from '../types';

const emb = new HashingEmbedder(64);
const E = (t: string) => emb.embed(t); // vecteur synchrone pour les tests

const l2norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));

// Fabrique un fragment partageable à partir d'un texte (comme le ferait le
// pipeline : texte → embedding → abstraction sans texte).
const frag = (kind: DeltaKind, text: string, now = 1000) =>
  abstractRevision(kind, E(text), { now });

describe('coarsen', () => {
  it('réduit la dimension à la cible', () => {
    const out = coarsen(E('les vaccins protègent contre la maladie'), 16);
    expect(out).toHaveLength(16);
  });

  it('renvoie un vecteur L2-normalisé (norme ≈ 1)', () => {
    const out = coarsen(E('le pétrole a chuté à Rotterdam'), 16);
    expect(l2norm(out)).toBeCloseTo(1, 6);
  });

  it('est déterministe', () => {
    const a = coarsen(E('gouvernance démocratique hybride'), 8);
    const b = coarsen(E('gouvernance démocratique hybride'), 8);
    expect(a).toEqual(b);
  });

  it('ne fait pas d’upsampling : vecteur plus court que la cible normalisé tel quel', () => {
    const short = [3, 4]; // norme 5
    const out = coarsen(short, 16);
    expect(out).toHaveLength(2);
    expect(out).toEqual([0.6, 0.8]);
    expect(l2norm(out)).toBeCloseTo(1, 6);
  });

  it('gère un vecteur vide (renvoie vide)', () => {
    expect(coarsen([], 16)).toEqual([]);
  });

  it('gère un vecteur nul (renvoie des zéros, pas de NaN)', () => {
    const zeros = new Array<number>(64).fill(0);
    const out = coarsen(zeros, 16);
    expect(out).toHaveLength(16);
    expect(out.every((x) => x === 0)).toBe(true);
  });
});

describe('abstractRevision', () => {
  it('ne contient AUCUN champ texte (partageable)', () => {
    const f = abstractRevision('contredit', E('les vaccins sont dangereux'), { now: 42 });
    expect(Object.keys(f).sort()).toEqual(['kind', 'strength', 'topic', 'ts']);
    expect(JSON.stringify(f)).not.toContain('vaccins');
  });

  it('produit un topic de longueur coarseDim (défaut 16)', () => {
    expect(abstractRevision('complète', E('sport sans abonnement'), { now: 1 }).topic).toHaveLength(16);
  });

  it('respecte coarseDim explicite et injecte now dans ts', () => {
    const f = abstractRevision('déplace', E('recadrage du cadre'), { now: 777, coarseDim: 8 });
    expect(f.topic).toHaveLength(8);
    expect(f.ts).toBe(777);
    expect(f.strength).toBeGreaterThan(0); // KIND_WEIGHT['déplace'] = 0.9
  });
});

describe('integrateFragments', () => {
  it('regroupe des fragments de topics proches en UN seul signal (count 2)', () => {
    const fragments = [
      frag('complète', 'les vaccins protègent contre la maladie grave'),
      frag('complète', 'les vaccins protègent bien contre la maladie'),
    ];
    const signals = integrateFragments(fragments, new KnowledgeModel());
    expect(signals).toHaveLength(1);
    expect(signals[0].count).toBe(2);
  });

  it('sépare des fragments de topics distincts en DEUX signaux', () => {
    const fragments = [
      frag('complète', 'les vaccins protègent contre la maladie grave'),
      frag('nouveau', 'le pétrole a chuté fortement à Rotterdam'),
    ];
    const signals = integrateFragments(fragments, new KnowledgeModel());
    expect(signals).toHaveLength(2);
    expect(signals.every((s) => s.count === 1)).toBe(true);
  });

  it('élit dominantKind par SOMME de strength (pas par comptage)', () => {
    // Même texte → topics identiques → un seul groupe. Deux 'complète' (0.55×2 =
    // 1.1) l'emportent sur un 'contredit' (1.0) : le comptage dirait l'inverse
    // par kind unique, la somme dit 'complète'.
    const text = 'sujet unique et partagé';
    const fragments = [
      frag('complète', text),
      frag('complète', text),
      frag('contredit', text),
    ];
    const [signal] = integrateFragments(fragments, new KnowledgeModel());
    expect(signal.count).toBe(3);
    expect(signal.dominantKind).toBe('complète');
    expect(signal.strength).toBeCloseTo(0.55 + 0.55 + 1.0, 6);
    expect(l2norm(signal.topic)).toBeCloseTo(1, 6);
  });

  it('trie les signaux par count décroissant', () => {
    const fragments = [
      frag('complète', 'les vaccins protègent contre la maladie grave'),
      frag('complète', 'les vaccins protègent bien contre la maladie'),
      frag('nouveau', 'le pétrole a chuté fortement à Rotterdam'),
    ];
    const signals = integrateFragments(fragments, new KnowledgeModel());
    expect(signals.map((s) => s.count)).toEqual([2, 1]);
  });

  it('pose matchedClaimId quand le modèle porte une croyance sur le même topic', () => {
    const text = 'les vaccins protègent contre la maladie grave';
    const model = new KnowledgeModel();
    const claim = model.assimilate(text, E(text), { now: 1 });
    const signals = integrateFragments([frag('complète', text)], model);
    expect(signals[0].matchedClaimId).toBe(claim.id);
    // Sanity : le topic du signal est bien proche du topic coarseni de la croyance.
    expect(cosineSimilarity(signals[0].topic, coarsen(claim.embedding, 16))).toBeGreaterThanOrEqual(0.6);
  });

  it('omet matchedClaimId (jamais undefined explicite) quand aucune croyance ne correspond', () => {
    const model = new KnowledgeModel();
    model.assimilate('la bourse de tokyo a ouvert en hausse', E('la bourse de tokyo a ouvert en hausse'), { now: 1 });
    const signals = integrateFragments([frag('nouveau', 'le pétrole a chuté fortement à Rotterdam')], model);
    expect(signals[0]).not.toHaveProperty('matchedClaimId');
  });

  it('est déterministe (aucune horloge ni aléatoire)', () => {
    const build = () => [
      frag('complète', 'les vaccins protègent contre la maladie grave'),
      frag('nouveau', 'le pétrole a chuté fortement à Rotterdam'),
    ];
    expect(integrateFragments(build(), new KnowledgeModel())).toEqual(
      integrateFragments(build(), new KnowledgeModel()),
    );
  });
});
