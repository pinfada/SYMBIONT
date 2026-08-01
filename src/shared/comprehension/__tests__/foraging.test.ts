import { KnowledgeModel } from '../KnowledgeModel';
import { HashingEmbedder } from '../embedder';
import {
  selectForagingSeeds,
  deriveForagingTargets,
  parseForagingTargets,
  type ForagingSeed,
} from '../foraging';
import type { SurfaceEntry } from '../SurfaceJournal';
import type { ChatCapable } from '../../llm/ContentAnalysis';

const emb = new HashingEmbedder(64);
const E = (t: string) => emb.embed(t);

/** Moteur factice : renvoie du JSON figé, quelle que soit la requête. */
function cannedEngine(raw: string): ChatCapable {
  return { chat: async () => raw };
}

const surface = (kind: SurfaceEntry['kind'], relatedClaimId?: string): SurfaceEntry => ({
  ts: 1,
  kind,
  claimText: 'peu importe',
  rationale: 'test',
  ...(relatedClaimId ? { relatedClaimId } : {}),
});

describe('selectForagingSeeds', () => {
  it('picks contested beliefs referenced by contredit/déplace surfaces', () => {
    const m = new KnowledgeModel();
    const contested = m.assimilate('la sûreté des vaccins est prouvée', E('la sûreté des vaccins est prouvée'), {
      now: 1,
    });
    contested.salience = 5; // saillante → ne sera PAS une graine « mince »

    const seeds = selectForagingSeeds(m, [surface('contredit', contested.id)]);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toEqual({ id: contested.id, text: contested.text, reason: 'contested' });
  });

  it('picks thin (low-salience) beliefs where the organism is shallow', () => {
    const m = new KnowledgeModel();
    const thin = m.assimilate('le cacao a doublé en Côte d’Ivoire', E('le cacao a doublé en Côte d’Ivoire'), {
      now: 1,
    });

    const seeds = selectForagingSeeds(m, []);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toEqual({ id: thin.id, text: thin.text, reason: 'thin' });
  });

  it('dedupes: a contested belief is not also emitted as thin', () => {
    const m = new KnowledgeModel();
    const c = m.assimilate('une croyance instable et mince', E('une croyance instable et mince'), { now: 1 });
    // salience 1 → qualifierait comme « thin », mais elle est déjà « contested ».
    const seeds = selectForagingSeeds(m, [surface('déplace', c.id)]);
    expect(seeds).toHaveLength(1);
    expect(seeds[0].reason).toBe('contested');
  });

  it('ignores non-contesting surface kinds and unknown claim ids', () => {
    const m = new KnowledgeModel();
    const c = m.assimilate('proposition saillante', E('proposition saillante'), { now: 1 });
    c.salience = 9;
    const seeds = selectForagingSeeds(m, [surface('complète', c.id), surface('contredit', 'c_inexistant')]);
    expect(seeds).toEqual([]);
  });

  it('caps at max', () => {
    const m = new KnowledgeModel();
    const texts = [
      'les abeilles pollinisent les vergers',
      'le pétrole a chuté à Rotterdam',
      'la fonte des glaciers alpins accélère',
      'le quartz piézoélectrique cadence les horloges',
      'la caféine bloque les récepteurs adénosine',
    ];
    for (const t of texts) m.assimilate(t, E(t), { now: 1 });
    expect(selectForagingSeeds(m, [], 2)).toHaveLength(2);
    expect(selectForagingSeeds(m, [])).toHaveLength(5); // sous le défaut (6)
  });
});

describe('deriveForagingTargets', () => {
  const seeds: ForagingSeed[] = [
    { id: 'a', text: 'croyance contestée', reason: 'contested' },
    { id: 'b', text: 'croyance mince', reason: 'thin' },
  ];

  it('returns [] when there are no seeds', async () => {
    const engine = cannedEngine('{"targets":[{"question":"toujours ignoré ?","seeds":[]}]}');
    expect(await deriveForagingTargets(engine, [])).toEqual([]);
  });

  it('parses targets and maps seed indices back to ids', async () => {
    const engine = cannedEngine(
      'Voici : {"targets":[{"question":"Pourquoi cette croyance est-elle instable ?","rationale":"à creuser","seeds":[0,1]}]} fin',
    );
    const targets = await deriveForagingTargets(engine, seeds, { curiosity: 1 });
    expect(targets).toHaveLength(1);
    expect(targets[0].question).toBe('Pourquoi cette croyance est-elle instable ?');
    expect(targets[0].rationale).toBe('à creuser');
    expect(targets[0].seedIds).toEqual(['a', 'b']);
    // Poids = contested (1) + thin (0.5) = 1.5, borné et fini.
    expect(targets[0].weight).toBe(1.5);
    expect(Number.isFinite(targets[0].weight)).toBe(true);
  });

  it('ignores out-of-range seed indices when mapping', async () => {
    const engine = cannedEngine('{"targets":[{"question":"une question ouverte valable ?","seeds":[0,7]}]}');
    const targets = await deriveForagingTargets(engine, seeds, { curiosity: 1 });
    expect(targets[0].seedIds).toEqual(['a']);
    expect(targets[0].weight).toBe(1); // seule la graine contestée compte
  });

  it('falls back gracefully to [] on garbage JSON', async () => {
    const engine = cannedEngine('désolé je ne sais pas répondre en JSON');
    expect(await deriveForagingTargets(engine, seeds, { curiosity: 1 })).toEqual([]);
  });

  it('curiosity scales the number of targets (higher ≥ lower)', async () => {
    const many =
      '{"targets":[' +
      Array.from({ length: 6 }, (_, i) => `{"question":"question ouverte numéro ${i} ?","seeds":[0]}`).join(',') +
      ']}';
    const engine = cannedEngine(many);
    const shy = await deriveForagingTargets(engine, seeds, { curiosity: 0 });
    const eager = await deriveForagingTargets(engine, seeds, { curiosity: 1 });
    expect(eager.length).toBeGreaterThanOrEqual(shy.length);
    expect(shy.length).toBe(1); // curiosité 0 → 1 cible
    expect(eager.length).toBe(6); // curiosité 1 → jusqu'à 6
  });

  it('max caps the number of targets below the curiosity limit', async () => {
    const many =
      '{"targets":[' +
      Array.from({ length: 6 }, (_, i) => `{"question":"question ouverte numéro ${i} ?","seeds":[0]}`).join(',') +
      ']}';
    const targets = await deriveForagingTargets(cannedEngine(many), seeds, { curiosity: 1, max: 2 });
    expect(targets).toHaveLength(2);
  });
});

describe('parseForagingTargets', () => {
  it('drops targets whose question is too short and defaults the rationale', () => {
    const seeds: ForagingSeed[] = [{ id: 'a', text: 't', reason: 'thin' }];
    const out = parseForagingTargets(
      '{"targets":[{"question":"ok","seeds":[0]},{"question":"une vraie question ouverte ?","seeds":[0]}]}',
      seeds,
      6,
    );
    expect(out).toHaveLength(1);
    expect(out[0].rationale).toContain('organisme');
    expect(out[0].weight).toBe(0.5);
  });

  it('returns [] on garbage', () => {
    expect(parseForagingTargets('pas du json', [], 6)).toEqual([]);
  });
});
