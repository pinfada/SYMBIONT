import { KnowledgeModel } from '../KnowledgeModel';
import { HashingEmbedder } from '../embedder';

const emb = new HashingEmbedder(64);
const E = (t: string) => emb.embed(t); // vecteur synchrone pour les tests

describe('KnowledgeModel', () => {
  it('assimilates a new claim and grows', () => {
    const m = new KnowledgeModel();
    const c = m.assimilate('les vaccins sont sûrs', E('les vaccins sont sûrs'), { now: 1000, domain: 'sante.test' });
    expect(m.size()).toBe(1);
    expect(c.salience).toBe(1);
    expect(c.sources).toContain('sante.test');
  });

  it('reinforces (not duplicates) an identical claim', () => {
    const m = new KnowledgeModel();
    const t = 'les vaccins sont sûrs';
    m.assimilate(t, E(t), { now: 1000, domain: 'a.test' });
    const again = m.assimilate(t, E(t), { now: 2000, domain: 'b.test' });
    expect(m.size()).toBe(1);
    expect(again.salience).toBe(2);
    expect(again.lastSeen).toBe(2000);
    expect(again.sources).toEqual(['a.test', 'b.test']);
  });

  it('reinforces a near-duplicate belief instead of creating a new one', () => {
    const m = new KnowledgeModel();
    m.assimilate('la sûreté des vaccins est établie', E('la sûreté des vaccins est établie'), { now: 1 });
    const before = m.size();
    const t2 = 'la sûreté des vaccins est établie.';
    m.assimilate(t2, E(t2), { now: 2 });
    expect(m.size()).toBe(before);
  });

  it('retrieves the closest belief by query vector', () => {
    const m = new KnowledgeModel();
    m.assimilate('les vaccins sont sûrs et testés', E('les vaccins sont sûrs et testés'), { now: 1 });
    m.assimilate('le pétrole a chuté à Rotterdam', E('le pétrole a chuté à Rotterdam'), { now: 1 });
    const hits = m.retrieve(E('les vaccins sont-ils sûrs'), 1);
    expect(hits).toHaveLength(1);
    expect(hits[0].claim.text).toMatch(/vaccins/);
  });

  it('prunes to the most salient / recent', () => {
    const m = new KnowledgeModel();
    m.assimilate('alpha distincte', E('alpha distincte'), { now: 1 });
    m.assimilate('beta distincte', E('beta distincte'), { now: 2 });
    const g = m.assimilate('gamma distincte', E('gamma distincte'), { now: 3 });
    g.salience = 9;
    expect(m.prune(2)).toBe(1);
    expect(m.size()).toBe(2);
    expect(m.retrieve(E('gamma distincte'), 1)[0].claim.text).toBe('gamma distincte');
  });

  it('serializes and restores (no embedder needed)', () => {
    const m = new KnowledgeModel();
    m.assimilate('proposition A concrète', E('proposition A concrète'), { now: 1 });
    m.assimilate('proposition B distincte', E('proposition B distincte'), { now: 1 });
    const restored = KnowledgeModel.fromJSON(m.toJSON());
    expect(restored.size()).toBe(2);
    expect(restored.retrieve(E('proposition A concrète'), 1)[0].claim.text).toBe('proposition A concrète');
  });
});
