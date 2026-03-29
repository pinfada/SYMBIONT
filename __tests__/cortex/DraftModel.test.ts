import { DraftModel } from '../../src/cortex/models/DraftModel';
import { CortexSignal, AnomalyResult, AdversarialAssessment } from '../../src/cortex/CortexTypes';

describe('DraftModel', () => {
  let model: DraftModel;

  beforeEach(() => {
    model = new DraftModel();
  });

  function makeSignal(overrides: Partial<CortexSignal> = {}): CortexSignal {
    return {
      id: 'test-signal-1',
      timestamp: Date.now(),
      source: 'dom_mutation',
      tabId: 1,
      payload: {
        type: 'test',
        metadata: {},
      },
      resonanceSnapshot: {
        level: 0.1,
        state: 'quiet',
        shadowMutationRatio: 0.1,
        jitter: 0.5,
      },
      ...overrides,
    };
  }

  function makeAnomalyResult(overrides: Partial<AnomalyResult> = {}): AnomalyResult {
    return {
      signalId: 'test-signal-1',
      anomalyScore: 0.5,
      matchedSignatures: [],
      adversarialAssessment: {
        score: 0,
        detectedTechniques: [],
        poisoningRisk: 0,
        recommendDefensiveMode: false,
      },
      confidence: 0.5,
      factors: [],
      computeTimeMs: 1,
      ...overrides,
    };
  }

  it('classifies benign signals correctly', () => {
    const signal = makeSignal();
    const result = model.analyze(signal, makeAnomalyResult());
    expect(result.verdict).toBe('benign');
    expect(result.level).toBe('draft');
  });

  it('detects script injection', () => {
    const signal = makeSignal({ source: 'script_injection' });
    const result = model.analyze(signal, makeAnomalyResult());
    expect(result.matchedRules).toContain('DOM_SCRIPT_INJECT');
    expect(result.verdict).not.toBe('benign');
  });

  it('detects high shadow mutation ratio', () => {
    const signal = makeSignal({
      resonanceSnapshot: {
        level: 0.5,
        state: 'active',
        shadowMutationRatio: 0.85,
        jitter: 3,
      },
    });
    const result = model.analyze(signal, makeAnomalyResult());
    expect(result.matchedRules).toContain('DOM_SHADOW_ACTIVITY');
  });

  it('detects rapid DOM mutations', () => {
    const signal = makeSignal({
      payload: { type: 'test', mutationCount: 150, metadata: {} },
    });
    const result = model.analyze(signal, makeAnomalyResult());
    expect(result.matchedRules).toContain('DOM_RAPID_MUTATION');
  });

  it('detects canvas fingerprinting', () => {
    const signal = makeSignal({
      payload: { type: 'test', metadata: { canvasRead: true } },
    });
    const result = model.analyze(signal, makeAnomalyResult());
    expect(result.matchedRules).toContain('FP_CANVAS_READ');
  });

  it('detects anti-debug techniques', () => {
    const signal = makeSignal({
      payload: { type: 'test', metadata: { antiDebug: true } },
    });
    const result = model.analyze(signal, makeAnomalyResult());
    expect(result.matchedRules).toContain('ADV_ANTI_DEBUG');
  });

  it('increases confidence with multiple matching rules', () => {
    const signal = makeSignal({
      source: 'script_injection',
      payload: {
        type: 'test',
        mutationCount: 200,
        metadata: { hasEval: true, antiDebug: true },
      },
      resonanceSnapshot: {
        level: 0.8,
        state: 'critical',
        shadowMutationRatio: 0.9,
        jitter: 5,
      },
    });

    const result = model.analyze(signal, makeAnomalyResult());
    expect(result.matchedRules!.length).toBeGreaterThanOrEqual(3);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('completes within 50ms budget', () => {
    const signal = makeSignal({
      source: 'script_injection',
      payload: { type: 'test', metadata: { hasEval: true } },
    });
    const result = model.analyze(signal, makeAnomalyResult());
    expect(result.processingTimeMs).toBeLessThan(50);
  });

  it('serializes and restores weights', () => {
    model.applyFeedback('DOM_SCRIPT_INJECT', false);
    const weights = model.serializeWeights();

    const model2 = new DraftModel();
    model2.loadWeights(weights);
    const weights2 = model2.serializeWeights();

    expect(weights2['DOM_SCRIPT_INJECT']).toEqual(weights['DOM_SCRIPT_INJECT']);
  });

  it('adjusts weights on feedback', () => {
    const weightsBefore = model.serializeWeights();
    const originalWeight = weightsBefore['DOM_SCRIPT_INJECT'];

    model.applyFeedback('DOM_SCRIPT_INJECT', false);
    const weightsAfter = model.serializeWeights();

    expect(weightsAfter['DOM_SCRIPT_INJECT']).toBeLessThan(originalWeight);
  });

  it('rejects invalid weights on load', () => {
    model.loadWeights({ DOM_SCRIPT_INJECT: -5, FAKE_RULE: 0.5 });
    const weights = model.serializeWeights();
    // Invalid weight should keep default
    expect(weights['DOM_SCRIPT_INJECT']).toBeGreaterThan(0);
  });
});
