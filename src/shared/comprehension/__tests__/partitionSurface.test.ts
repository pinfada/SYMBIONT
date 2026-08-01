import { partitionSurface, type SurfaceEntry } from '../SurfaceJournal';

const entry = (ts: number): SurfaceEntry => ({
  ts,
  kind: 'contredit',
  claimText: `claim@${ts}`,
  rationale: 'r',
});

describe('partitionSurface', () => {
  it('splits entries into today (>= boundary) and earlier', () => {
    const boundary = 1000;
    const { today, earlier } = partitionSurface([entry(1500), entry(500), entry(1000)], boundary);
    expect(today.map((e) => e.ts)).toEqual([1500, 1000]);
    expect(earlier.map((e) => e.ts)).toEqual([500]);
  });

  it('handles an empty list', () => {
    expect(partitionSurface([], 1000)).toEqual({ today: [], earlier: [] });
  });

  it('puts everything in today when all are recent', () => {
    const { today, earlier } = partitionSurface([entry(2000), entry(3000)], 1000);
    expect(today).toHaveLength(2);
    expect(earlier).toHaveLength(0);
  });
});
