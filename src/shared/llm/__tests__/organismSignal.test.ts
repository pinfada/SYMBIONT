import { vigilanceDelta, feedReliabilityToOrganism } from '../organismSignal';
import type { ReliabilityReport } from '../ContentAnalysis';

const mockUpdates: Array<Record<string, unknown>> = [];
let mockConsciousness = 50;

jest.mock('@shared/services/OrganismStateManager', () => ({
  organismStateManager: {
    getState: () => ({ consciousness: mockConsciousness }),
    updateState: async (u: Record<string, unknown>) => {
      mockUpdates.push(u);
    },
  },
}));

const report = (level: ReliabilityReport['level'], score: number): ReliabilityReport => ({
  level,
  score,
  summary: 's',
  signals: [],
  parsed: true,
});

/** Rapport d'échec tel que le produit parseReport quand rien n'est exploitable. */
const unparsedReport = (): ReliabilityReport => ({
  level: 'moyenne',
  score: 50,
  summary: 'Analyse indisponible.',
  signals: [],
  parsed: false,
});

describe('vigilanceDelta', () => {
  it('gives the strongest bump for low reliability', () => {
    expect(vigilanceDelta(report('faible', 10))).toBeGreaterThan(vigilanceDelta(report('moyenne', 50)));
    expect(vigilanceDelta(report('moyenne', 50))).toBeGreaterThan(vigilanceDelta(report('élevée', 90)));
    expect(vigilanceDelta(report('élevée', 90))).toBeGreaterThan(0);
  });

  it('returns zero for an unparsed report', () => {
    expect(vigilanceDelta(unparsedReport())).toBe(0);
  });
});

describe('feedReliabilityToOrganism', () => {
  beforeEach(() => {
    mockUpdates.length = 0;
    mockConsciousness = 50;
  });

  it('nudges the organism consciousness by the vigilance delta', async () => {
    await feedReliabilityToOrganism(report('faible', 10));
    expect(mockUpdates).toHaveLength(1);
    expect(mockUpdates[0].consciousness).toBeCloseTo(52.5);
  });

  it('clamps consciousness to 100', async () => {
    mockConsciousness = 99.5;
    await feedReliabilityToOrganism(report('faible', 5));
    expect(mockUpdates[0].consciousness).toBe(100);
  });

  it('never throws', async () => {
    await expect(feedReliabilityToOrganism(report('élevée', 88))).resolves.toBeUndefined();
  });

  it('leaves the organism untouched when the analysis could not be parsed', async () => {
    await feedReliabilityToOrganism(unparsedReport());
    expect(mockUpdates).toHaveLength(0);
  });
});
