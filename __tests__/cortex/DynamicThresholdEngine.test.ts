import { DynamicThresholdEngine } from '../../src/cortex/threshold/DynamicThresholdEngine';
import { ThresholdInputs, CortexMetrics } from '../../src/cortex/CortexTypes';

describe('DynamicThresholdEngine', () => {
  let engine: DynamicThresholdEngine;

  beforeEach(() => {
    engine = new DynamicThresholdEngine();
  });

  function makeInputs(overrides: Partial<ThresholdInputs> = {}): ThresholdInputs {
    return {
      systemLoad: 0,
      siteRiskScore: 0,
      thermalPressure: 0,
      adversarialSuspicion: 0,
      historicalConfidence: 0.5,
      recentEscalationRate: 0,
      ...overrides,
    };
  }

  it('returns a threshold in valid range', () => {
    const ctx = engine.getCurrentThreshold(makeInputs());
    expect(ctx.currentThreshold).toBeGreaterThanOrEqual(0.15);
    expect(ctx.currentThreshold).toBeLessThanOrEqual(0.85);
  });

  it('increases threshold under high system load', () => {
    const low = engine.getCurrentThreshold(makeInputs({ systemLoad: 0 }));
    engine.reset();
    const high = engine.getCurrentThreshold(makeInputs({ systemLoad: 0.9 }));
    expect(high.currentThreshold).toBeGreaterThan(low.currentThreshold);
  });

  it('decreases threshold on risky site', () => {
    const safe = engine.getCurrentThreshold(makeInputs({ siteRiskScore: 0 }));
    engine.reset();
    const risky = engine.getCurrentThreshold(makeInputs({ siteRiskScore: 0.9 }));
    expect(risky.currentThreshold).toBeLessThan(safe.currentThreshold);
  });

  it('increases threshold under thermal pressure', () => {
    const cool = engine.getCurrentThreshold(makeInputs({ thermalPressure: 0 }));
    engine.reset();
    const hot = engine.getCurrentThreshold(makeInputs({ thermalPressure: 0.9 }));
    expect(hot.currentThreshold).toBeGreaterThan(cool.currentThreshold);
  });

  it('applies EMA smoothing (threshold changes gradually)', () => {
    engine.getCurrentThreshold(makeInputs({ systemLoad: 0 }));
    const ctx = engine.getCurrentThreshold(makeInputs({ systemLoad: 1.0 }));
    // Should not jump directly to max — EMA dampens
    expect(ctx.currentThreshold).toBeLessThan(0.85);
    expect(ctx.dampingApplied).toBe(true);
  });

  it('applies double damping on large variations', () => {
    // Start with low load → threshold near base
    engine.getCurrentThreshold(makeInputs({ systemLoad: 0, thermalPressure: 0 }));
    // Jump to high load → large delta triggers damping
    const ctx = engine.getCurrentThreshold(
      makeInputs({ systemLoad: 1.0, thermalPressure: 1.0 }),
    );
    expect(ctx.dampingApplied).toBe(true);
  });

  it('calibrates base threshold based on metrics', () => {
    const initialBase = engine.getBaseThreshold();

    // Simulate too many escalations
    engine.calibrate({
      escalationRate: 0.5,
      falsePositiveRate: 0.1,
    } as CortexMetrics);

    expect(engine.getBaseThreshold()).toBeGreaterThan(initialBase);
  });

  it('lowers base threshold when system is too permissive', () => {
    const initialBase = engine.getBaseThreshold();

    engine.calibrate({
      escalationRate: 0.01,
      falsePositiveRate: 0.01,
    } as CortexMetrics);

    expect(engine.getBaseThreshold()).toBeLessThan(initialBase);
  });

  it('reset restores defaults', () => {
    engine.getCurrentThreshold(makeInputs({ systemLoad: 1 }));
    engine.reset();
    expect(engine.getBaseThreshold()).toBe(0.5);
  });
});
