import { decideAgency, DietLog, type DietItem } from '../agency';
import type { KVStorage } from '../KnowledgeStore';

const item = (over: Partial<DietItem> = {}): DietItem => ({
  ts: 1,
  surfaced: over.surfaced ?? true,
  ...(over.dominantKind ? { dominantKind: over.dominantKind } : {}),
  ...(over.reliability ? { reliability: over.reliability } : {}),
});

function memStorage(): KVStorage {
  const store: Record<string, unknown> = {};
  return {
    get: async (key) => (key in store ? { [key]: store[key] } : {}),
    set: async (items) => {
      Object.assign(store, items);
    },
  };
}

describe('decideAgency', () => {
  it('accepts by default (healthy energy, varied diet)', () => {
    const v = decideAgency({ energy: 80, recentDiet: [item({ surfaced: true }), item({ surfaced: false })] });
    expect(v.stance).toBe('accept');
    expect(v.canOverride).toBe(true);
  });

  it('redirects on a low-reliability streak (a PATTERN, not one item)', () => {
    const three = [
      item({ reliability: 'faible' }),
      item({ reliability: 'faible' }),
      item({ reliability: 'faible' }),
    ];
    expect(decideAgency({ energy: 80, recentDiet: three }).stance).toBe('redirect');
    // Un seul item peu fiable NE déclenche PAS.
    expect(decideAgency({ energy: 80, recentDiet: [item({ reliability: 'faible' })] }).stance).toBe('accept');
  });

  it('redirects on an echo chamber (>=4 reads that revise nothing)', () => {
    const echo = [item({ surfaced: false }), item({ surfaced: false }), item({ surfaced: false }), item({ surfaced: false })];
    const v = decideAgency({ energy: 80, recentDiet: echo });
    expect(v.stance).toBe('redirect');
    expect(v.suggestion).toBeTruthy();
    // 3 seulement → pas encore un schéma.
    expect(decideAgency({ energy: 80, recentDiet: echo.slice(0, 3) }).stance).toBe('accept');
  });

  it('is reluctant (not refusing) when energy is low', () => {
    const v = decideAgency({ energy: 10, recentDiet: [item()] });
    expect(v.stance).toBe('reluctant');
    expect(v.canOverride).toBe(true);
  });

  it('ALWAYS allows override, whatever the stance', () => {
    const scenarios: DietItem[][] = [
      [item({ reliability: 'faible' }), item({ reliability: 'faible' }), item({ reliability: 'faible' })],
      [item({ surfaced: false }), item({ surfaced: false }), item({ surfaced: false }), item({ surfaced: false })],
      [item()],
    ];
    for (const diet of scenarios) {
      expect(decideAgency({ energy: 5, recentDiet: diet }).canOverride).toBe(true);
    }
  });

  it('prioritizes low-reliability over echo when both hold', () => {
    const both = [
      item({ surfaced: false, reliability: 'faible' }),
      item({ surfaced: false, reliability: 'faible' }),
      item({ surfaced: false, reliability: 'faible' }),
      item({ surfaced: false }),
    ];
    expect(decideAgency({ energy: 80, recentDiet: both }).reason).toMatch(/peu fiable/i);
  });
});

describe('DietLog', () => {
  it('records newest-first and caps', async () => {
    const log = new DietLog({ storage: memStorage(), max: 2 });
    await log.record(item({ dominantKind: 'confirme' }));
    await log.record(item({ dominantKind: 'contredit' }));
    await log.record(item({ dominantKind: 'complète' }));
    const all = await log.load();
    expect(all).toHaveLength(2);
    expect(all[0].dominantKind).toBe('complète'); // le plus récent en tête
  });

  it('returns [] when empty', async () => {
    expect(await new DietLog({ storage: memStorage() }).load()).toEqual([]);
  });
});
