import { PolicyEngine } from '../../src/cortex/policy/PolicyEngine';
import { DiagnosticResult, CortexState, ResourceCost } from '../../src/cortex/CortexTypes';

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine();
  });

  function makeDiagnostic(
    overrides: Partial<DiagnosticResult> = {},
  ): DiagnosticResult {
    const cost: ResourceCost = {
      cpuTimeMs: 5,
      peakMemoryDeltaBytes: 0,
      workerUsed: false,
    };
    return {
      level: 'draft',
      signalId: 'test-1',
      verdict: 'benign',
      confidence: 0.5,
      explanation: 'test',
      recommendedAction: 'ignore',
      processingTimeMs: 5,
      resourceCost: cost,
      ...overrides,
    };
  }

  it('blocks high-confidence malicious threats', () => {
    const decision = engine.applyDecision(
      makeDiagnostic({ verdict: 'malicious', confidence: 0.9 }),
      CortexState.REFLEX_OBSERVATION,
    );
    expect(decision.action).toBe('block');
    expect(decision.shouldNotifyUser).toBe(true);
  });

  it('monitors medium-confidence malicious threats', () => {
    const decision = engine.applyDecision(
      makeDiagnostic({ verdict: 'malicious', confidence: 0.6 }),
      CortexState.REFLEX_OBSERVATION,
    );
    expect(decision.action).toBe('monitor');
  });

  it('monitors suspicious signals', () => {
    const decision = engine.applyDecision(
      makeDiagnostic({ verdict: 'suspicious', confidence: 0.7 }),
      CortexState.REFLEX_OBSERVATION,
    );
    expect(decision.action).toBe('monitor');
  });

  it('ignores benign signals', () => {
    const decision = engine.applyDecision(
      makeDiagnostic({ verdict: 'benign', confidence: 0.9 }),
      CortexState.REFLEX_OBSERVATION,
    );
    expect(decision.action).toBe('ignore');
  });

  it('escalates inconclusive signals with sufficient confidence', () => {
    const decision = engine.applyDecision(
      makeDiagnostic({ verdict: 'inconclusive', confidence: 0.6 }),
      CortexState.REFLEX_OBSERVATION,
    );
    expect(decision.action).toBe('escalate');
  });

  it('overrides to monitor in defensive mode', () => {
    const decision = engine.applyDecision(
      makeDiagnostic({ verdict: 'suspicious', confidence: 0.3 }),
      CortexState.DEFENSIVE_MODE,
    );
    expect(decision.action).toBe('monitor');
  });

  it('allows adding custom rules', () => {
    engine.addRule({
      id: 'CUSTOM_ALWAYS_BLOCK',
      name: 'Always block test',
      condition: (d) => d.signalId === 'block-me',
      action: 'block',
      priority: 200,
    });

    const decision = engine.applyDecision(
      makeDiagnostic({ signalId: 'block-me', verdict: 'suspicious', confidence: 0.3 }),
      CortexState.REFLEX_OBSERVATION,
    );
    expect(decision.action).toBe('block');
  });

  it('validates action permissions', () => {
    expect(engine.isAllowed('deep_analysis', CortexState.QUICK_ANALYSIS)).toBe(true);
    expect(engine.isAllowed('deep_analysis', CortexState.COGNITIVE_HIBERNATION)).toBe(false);
    expect(engine.isAllowed('learning', CortexState.DEEP_ANALYSIS)).toBe(true);
    expect(engine.isAllowed('learning', CortexState.REFLEX_OBSERVATION)).toBe(false);
  });
});
