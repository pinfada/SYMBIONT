import { HashingEmbedder } from '../embedder';
import { hashingEmbedFn } from '../embedFn';
import { KnowledgeStore, type KVStorage } from '../KnowledgeStore';
import { SurfaceJournal } from '../SurfaceJournal';
import { KnowledgeModel } from '../KnowledgeModel';
import { readPage } from '../readingService';
import type { ChatCapable } from '../../llm/ContentAnalysis';

const emb = new HashingEmbedder(64);
const E = (t: string) => emb.embed(t);
const embed = hashingEmbedFn(emb);

function memStorage(): KVStorage {
  const store: Record<string, unknown> = {};
  return {
    get: async (key) => (key in store ? { [key]: store[key] } : {}),
    set: async (items) => {
      Object.assign(store, items);
    },
  };
}

function makeEngine(cfg: {
  claims: string[];
  relations?: Record<string, { kind: string; related: number; confidence: number }>;
}): ChatCapable {
  return {
    chat: async (messages) => {
      const sys = messages[0]?.content ?? '';
      const user = messages[1]?.content ?? '';
      if (sys.includes('extrais les affirmations')) return JSON.stringify({ claims: cfg.claims });
      const m = user.match(/AFFIRMATION :\n([\s\S]*?)\n\nCROYANCES/);
      const claim = m ? m[1].trim() : '';
      const rel = cfg.relations?.[claim] ?? { kind: 'nouveau', related: -1, confidence: 0.3 };
      return JSON.stringify({ ...rel, rationale: 'test' });
    },
  };
}

describe('KnowledgeStore', () => {
  it('persists and reloads the model, bounded by maxClaims', async () => {
    const storage = memStorage();
    const store = new KnowledgeStore({ storage, maxClaims: 2 });
    const model = new KnowledgeModel();
    model.assimilate('croyance alpha distincte', E('croyance alpha distincte'), { now: 1 });
    model.assimilate('croyance beta distincte', E('croyance beta distincte'), { now: 2 });
    const c = model.assimilate('croyance gamma distincte', E('croyance gamma distincte'), { now: 3 });
    c.salience = 5;
    expect(await store.save(model)).toBe(1);

    const reloaded = await store.load();
    expect(reloaded.size()).toBe(2);
    expect(reloaded.retrieve(E('croyance gamma distincte'), 1)[0].claim.text).toBe('croyance gamma distincte');
  });

  it('returns an empty model when nothing is stored', async () => {
    const store = new KnowledgeStore({ storage: memStorage() });
    expect((await store.load()).size()).toBe(0);
  });
});

describe('SurfaceJournal', () => {
  it('appends revisions newest-first and filters by time', async () => {
    const journal = new SurfaceJournal({ storage: memStorage(), max: 10 });
    await journal.append([{ claimText: 'A contredit', kind: 'contredit', confidence: 0.9, rationale: 'r' }], { now: 100, domain: 'a.test' });
    await journal.append([{ claimText: 'B complète', kind: 'complète', confidence: 0.8, rationale: 'r' }], { now: 200 });
    const all = await journal.load();
    expect(all[0].claimText).toBe('B complète');
    expect(await journal.since(150)).toHaveLength(1);
  });
});

describe('readPage', () => {
  it('digests into the persistent model and journals surfaced revisions', async () => {
    const storage = memStorage();
    const store = new KnowledgeStore({ storage });
    const journal = new SurfaceJournal({ storage });

    const seed = await store.load();
    seed.assimilate('la sûreté des vaccins est prouvée', E('la sûreté des vaccins est prouvée'), { now: 1 });
    await store.save(seed);

    const claim = 'la sûreté des vaccins est un mensonge';
    const engine = makeEngine({
      claims: [claim],
      relations: { [claim]: { kind: 'contredit', related: 0, confidence: 0.9 } },
    });

    const outcome = await readPage(engine, { store, journal }, embed, 'texte', { domain: 'x.test', now: 500 });
    expect(outcome.surface).toBe(true);
    expect(outcome.modelSize).toBe(2);
    expect(await journal.since(0)).toHaveLength(1);

    const store2 = new KnowledgeStore({ storage });
    expect((await store2.load()).size()).toBe(2);
  });

  it('grows the model across successive reads (persistence)', async () => {
    const storage = memStorage();
    const store = new KnowledgeStore({ storage });
    const journal = new SurfaceJournal({ storage });
    const engine = makeEngine({ claims: ['une affirmation totalement inédite ici'] });

    await readPage(engine, { store, journal }, embed, 'p1', { now: 1 });
    const after1 = (await store.load()).size();
    await readPage(engine, { store, journal }, embed, 'p2', { now: 2 });
    expect(after1).toBe(1);
    expect((await store.load()).size()).toBe(1);
  });
});
