import { KnowledgeModel } from '../KnowledgeModel';
import { HashingEmbedder } from '../embedder';

const emb = new HashingEmbedder(64);

describe('KnowledgeModel', () => {
  it('assimilates a new claim and grows', () => {
    const m = new KnowledgeModel(emb);
    const c = m.assimilate('les vaccins sont sûrs', { now: 1000, domain: 'sante.test' });
    expect(m.size()).toBe(1);
    expect(c.salience).toBe(1);
    expect(c.sources).toContain('sante.test');
  });

  it('reinforces (not duplicates) an identical claim', () => {
    const m = new KnowledgeModel(emb);
    m.assimilate('les vaccins sont sûrs', { now: 1000, domain: 'a.test' });
    const again = m.assimilate('les vaccins sont sûrs', { now: 2000, domain: 'b.test' });
    expect(m.size()).toBe(1);
    expect(again.salience).toBe(2);
    expect(again.lastSeen).toBe(2000);
    expect(again.sources).toEqual(['a.test', 'b.test']);
  });

  it('reinforces a near-duplicate belief instead of creating a new one', () => {
    const m = new KnowledgeModel(emb);
    m.assimilate('la sûreté des vaccins est établie', { now: 1 });
    const before = m.size();
    // Quasi identique (même sac de mots normalisé) → renforce.
    m.assimilate('la sûreté des vaccins est établie.', { now: 2 });
    expect(m.size()).toBe(before);
  });

  it('retrieves the closest belief', () => {
    const m = new KnowledgeModel(emb);
    m.assimilate('les vaccins sont sûrs et testés', { now: 1 });
    m.assimilate('le pétrole a chuté à Rotterdam', { now: 1 });
    const hits = m.retrieve('les vaccins sont-ils sûrs', 1);
    expect(hits).toHaveLength(1);
    expect(hits[0].claim.text).toMatch(/vaccins/);
  });

  it('serializes and restores', () => {
    const m = new KnowledgeModel(emb);
    m.assimilate('proposition A concrète', { now: 1 });
    m.assimilate('proposition B distincte', { now: 1 });
    const json = m.toJSON();
    const restored = KnowledgeModel.fromJSON(emb, json);
    expect(restored.size()).toBe(2);
    expect(restored.retrieve('proposition A concrète', 1)[0].claim.text).toBe('proposition A concrète');
  });
});
