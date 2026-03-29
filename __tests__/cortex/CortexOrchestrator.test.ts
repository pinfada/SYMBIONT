import { CortexOrchestrator, CortexOrchestratorDeps } from '../../src/cortex/CortexOrchestrator';
import {
  CortexState,
  CortexSignal,
  AnomalyResult,
  DiagnosticResult,
  ResourceBudget,
  ThresholdContext,
  ResourceCost,
} from '../../src/cortex/CortexTypes';

// ─── Mocks ──────────────────────────────────────────────────────────

function makeSignal(overrides: Partial<CortexSignal> = {}): CortexSignal {
  return {
    id: `sig-${Math.random()}`,
    timestamp: Date.now(),
    source: 'dom_mutation',
    tabId: 1,
    payload: { type: 'test', metadata: {} },
    resonanceSnapshot: {
      level: 0.3,
      state: 'normal',
      shadowMutationRatio: 0.2,
      jitter: 1,
    },
    ...overrides,
  };
}

function makeBudget(overrides: Partial<ResourceBudget> = {}): ResourceBudget {
  return {
    available: true,
    vramEstimatePercent: 30,
    cpuLoadPercent: 40,
    memoryPressure: 0.3,
    thermalState: 'nominal',
    backpressureLevel: 'nominal',
    maxAllowedDurationMs: 3000,
    frameRate: 60,
    ...overrides,
  };
}

const defaultCost: ResourceCost = { cpuTimeMs: 5, peakMemoryDeltaBytes: 0, workerUsed: false };

function createMockDeps(): CortexOrchestratorDeps {
  return {
    thresholdEngine: {
      getCurrentThreshold: jest.fn().mockReturnValue({
        currentThreshold: 0.5,
        rawThreshold: 0.5,
        inputs: {},
        dampingApplied: false,
      } as ThresholdContext),
      calibrate: jest.fn(),
      reset: jest.fn(),
      getBaseThreshold: jest.fn().mockReturnValue(0.5),
    } as any,

    draftModel: {
      analyze: jest.fn().mockReturnValue({
        level: 'draft',
        signalId: 'test',
        verdict: 'benign',
        confidence: 0.9,
        explanation: 'test',
        recommendedAction: 'ignore',
        processingTimeMs: 5,
        resourceCost: defaultCost,
      } as DiagnosticResult),
      serializeWeights: jest.fn().mockReturnValue({}),
      loadWeights: jest.fn(),
      applyFeedback: jest.fn(),
    } as any,

    oracleModel: {
      analyze: jest.fn().mockResolvedValue({
        level: 'oracle',
        signalId: 'test',
        verdict: 'malicious',
        confidence: 0.85,
        explanation: 'test',
        recommendedAction: 'block',
        processingTimeMs: 500,
        resourceCost: { ...defaultCost, workerUsed: true },
      } as DiagnosticResult),
      shutdown: jest.fn().mockResolvedValue(undefined),
    } as any,

    ragStore: {
      getSiteRiskScore: jest.fn().mockResolvedValue(0.5),
      getConfirmedSignatures: jest.fn().mockResolvedValue([]),
      getSignatureCount: jest.fn().mockResolvedValue({
        candidate: 0, probation: 0, confirmed: 0, deprecated: 0, quarantined: 0,
      }),
    } as any,

    ragLifecycle: {
      recordOccurrence: jest.fn().mockResolvedValue(undefined),
      registerCandidate: jest.fn().mockResolvedValue(undefined),
      startPeriodicReview: jest.fn(),
      stopPeriodicReview: jest.fn(),
    } as any,

    guard: {
      checkBudget: jest.fn().mockReturnValue(makeBudget()),
      requestDeepBudget: jest.fn().mockReturnValue(makeBudget()),
      getSystemLoad: jest.fn().mockReturnValue(0.3),
      getThermalPressure: jest.fn().mockReturnValue(0.2),
      getThermalState: jest.fn().mockReturnValue('nominal'),
    } as any,

    reasoningGuard: {
      canStartDeepAnalysis: jest.fn().mockReturnValue({ allowed: true }),
      startAnalysis: jest.fn(),
      endAnalysis: jest.fn(),
      createTimeout: jest.fn().mockReturnValue(setTimeout(() => {}, 99999)),
    } as any,

    adversarial: {
      evaluateSignal: jest.fn().mockReturnValue({
        score: 0.1,
        detectedTechniques: [],
        poisoningRisk: 0,
        recommendDefensiveMode: false,
      }),
      activateDefensiveMode: jest.fn(),
      deactivateDefensiveMode: jest.fn(),
      isDefensiveMode: jest.fn().mockReturnValue(false),
    } as any,

    telemetry: {
      log: jest.fn().mockResolvedValue(undefined),
      getRecentConfidence: jest.fn().mockReturnValue(0.5),
      getEscalationRate: jest.fn().mockReturnValue(0.1),
      getAggregatedMetrics: jest.fn().mockResolvedValue({
        totalSignalsProcessed: 0,
        draftAnalysesCount: 0,
        oracleAnalysesCount: 0,
        averageDraftLatencyMs: 0,
        averageOracleLatencyMs: 0,
        falsePositiveRate: 0,
        escalationRate: 0,
        hibernationCount: 0,
        averageAnomalyScore: 0,
        signatureStats: { candidate: 0, probation: 0, confirmed: 0, deprecated: 0, quarantined: 0 },
        uptime: 0,
      }),
      forceFlush: jest.fn().mockResolvedValue(undefined),
    } as any,

    policyEngine: {
      applyDecision: jest.fn().mockReturnValue({
        action: 'ignore',
        verdict: 'benign',
        confidence: 0.9,
        justification: 'test',
        stateAfterDecision: CortexState.REFLEX_OBSERVATION,
        shouldNotifyUser: false,
      }),
    } as any,

    anomalyScorer: {
      score: jest.fn().mockResolvedValue({
        signalId: 'test',
        anomalyScore: 0.2,
        matchedSignatures: [],
        adversarialAssessment: {
          score: 0.1,
          detectedTechniques: [],
          poisoningRisk: 0,
          recommendDefensiveMode: false,
        },
        confidence: 0.5,
        factors: [],
        computeTimeMs: 2,
      } as AnomalyResult),
    } as any,
  };
}

describe('CortexOrchestrator', () => {
  let orchestrator: CortexOrchestrator;
  let deps: CortexOrchestratorDeps;

  beforeEach(async () => {
    jest.useFakeTimers();
    deps = createMockDeps();
    orchestrator = new CortexOrchestrator(deps);
    await orchestrator.initialize();
  });

  afterEach(async () => {
    jest.useRealTimers();
    await orchestrator.shutdown();
  });

  it('starts in REFLEX_OBSERVATION state', () => {
    expect(orchestrator.getState()).toBe(CortexState.REFLEX_OBSERVATION);
  });

  it('handles trivial signal (below threshold)', async () => {
    const signal = makeSignal();
    await orchestrator.processSignal(signal);

    expect(deps.telemetry.log).toHaveBeenCalledWith(
      'trivial_decision',
      expect.any(Object),
    );
    expect(deps.draftModel.analyze).not.toHaveBeenCalled();
  });

  it('escalates to Draft on ambiguous signal', async () => {
    (deps.anomalyScorer.score as jest.Mock).mockResolvedValue({
      signalId: 'test',
      anomalyScore: 0.7, // Above default threshold of 0.5
      matchedSignatures: [],
      adversarialAssessment: {
        score: 0.1,
        detectedTechniques: [],
        poisoningRisk: 0,
        recommendDefensiveMode: false,
      },
      confidence: 0.6,
      factors: [],
      computeTimeMs: 2,
    });

    await orchestrator.processSignal(makeSignal());

    expect(deps.draftModel.analyze).toHaveBeenCalled();
  });

  it('escalates to Oracle when Draft is insufficient', async () => {
    // High anomaly score
    (deps.anomalyScorer.score as jest.Mock).mockResolvedValue({
      signalId: 'test',
      anomalyScore: 0.7,
      matchedSignatures: [],
      adversarialAssessment: { score: 0.1, detectedTechniques: [], poisoningRisk: 0, recommendDefensiveMode: false },
      confidence: 0.6,
      factors: [],
      computeTimeMs: 2,
    });

    // Draft returns low confidence
    (deps.draftModel.analyze as jest.Mock).mockReturnValue({
      level: 'draft',
      signalId: 'test',
      verdict: 'suspicious',
      confidence: 0.4, // Below 0.7 threshold
      explanation: 'test',
      recommendedAction: 'escalate',
      processingTimeMs: 5,
      resourceCost: defaultCost,
    });

    await orchestrator.processSignal(makeSignal());

    expect(deps.oracleModel.analyze).toHaveBeenCalled();
    expect(deps.reasoningGuard.startAnalysis).toHaveBeenCalled();
    expect(deps.reasoningGuard.endAnalysis).toHaveBeenCalled();
  });

  it('enters hibernation on critical thermal state', async () => {
    (deps.anomalyScorer.score as jest.Mock).mockResolvedValue({
      signalId: 'test',
      anomalyScore: 0.7,
      matchedSignatures: [],
      adversarialAssessment: { score: 0.1, detectedTechniques: [], poisoningRisk: 0, recommendDefensiveMode: false },
      confidence: 0.6,
      factors: [],
      computeTimeMs: 2,
    });

    (deps.guard.checkBudget as jest.Mock).mockReturnValue(
      makeBudget({ thermalState: 'critical' }),
    );

    await orchestrator.processSignal(makeSignal());

    expect(orchestrator.getState()).toBe(CortexState.COGNITIVE_HIBERNATION);
    expect(deps.telemetry.log).toHaveBeenCalledWith(
      'hibernation_entered',
      expect.any(Object),
    );
  });

  it('refuses escalation when budget unavailable', async () => {
    (deps.anomalyScorer.score as jest.Mock).mockResolvedValue({
      signalId: 'test',
      anomalyScore: 0.7,
      matchedSignatures: [],
      adversarialAssessment: { score: 0.1, detectedTechniques: [], poisoningRisk: 0, recommendDefensiveMode: false },
      confidence: 0.6,
      factors: [],
      computeTimeMs: 2,
    });

    (deps.draftModel.analyze as jest.Mock).mockReturnValue({
      level: 'draft',
      signalId: 'test',
      verdict: 'suspicious',
      confidence: 0.4,
      explanation: 'test',
      recommendedAction: 'escalate',
      processingTimeMs: 5,
      resourceCost: defaultCost,
    });

    (deps.guard.requestDeepBudget as jest.Mock).mockReturnValue(
      makeBudget({ available: false, reason: 'thermal_too_high' }),
    );

    await orchestrator.processSignal(makeSignal());

    expect(deps.oracleModel.analyze).not.toHaveBeenCalled();
    expect(deps.telemetry.log).toHaveBeenCalledWith(
      'escalation_budget_denied',
      expect.any(Object),
    );
  });

  it('activates defensive mode on adversarial threat', async () => {
    (deps.anomalyScorer.score as jest.Mock).mockResolvedValue({
      signalId: 'test',
      anomalyScore: 0.2, // Low score but...
      matchedSignatures: [],
      adversarialAssessment: {
        score: 0.8,
        detectedTechniques: ['anti_debug'],
        poisoningRisk: 0.3,
        recommendDefensiveMode: true, // ... adversarial recommends defense
      },
      confidence: 0.6,
      factors: [],
      computeTimeMs: 2,
    });

    await orchestrator.processSignal(makeSignal());

    expect(deps.adversarial.activateDefensiveMode).toHaveBeenCalled();
  });

  it('registers candidate signature from Oracle', async () => {
    (deps.anomalyScorer.score as jest.Mock).mockResolvedValue({
      signalId: 'test',
      anomalyScore: 0.7,
      matchedSignatures: [],
      adversarialAssessment: { score: 0.1, detectedTechniques: [], poisoningRisk: 0, recommendDefensiveMode: false },
      confidence: 0.6,
      factors: [],
      computeTimeMs: 2,
    });

    (deps.draftModel.analyze as jest.Mock).mockReturnValue({
      level: 'draft',
      signalId: 'test',
      verdict: 'suspicious',
      confidence: 0.4,
      explanation: 'test',
      recommendedAction: 'escalate',
      processingTimeMs: 5,
      resourceCost: defaultCost,
    });

    const candidateSig = {
      pattern: { version: 1, featureVector: new Float32Array(48), dominantCategory: 'tracker' as const, textualHint: 'test' },
      sourceSignalId: 'test',
      generatedBy: 'oracle' as const,
      initialConfidence: 0.8,
      contextSnapshot: { urlHash: 'h', tabId: 1, timestamp: Date.now(), relatedSignalCount: 3 },
    };

    (deps.oracleModel.analyze as jest.Mock).mockResolvedValue({
      level: 'oracle',
      signalId: 'test',
      verdict: 'malicious',
      confidence: 0.85,
      explanation: 'test',
      recommendedAction: 'block',
      processingTimeMs: 500,
      resourceCost: { ...defaultCost, workerUsed: true },
      candidateSignature: candidateSig,
    });

    await orchestrator.processSignal(makeSignal());

    expect(deps.ragLifecycle.registerCandidate).toHaveBeenCalledWith(candidateSig);
  });

  it('returns to REFLEX_OBSERVATION after analysis completes', async () => {
    (deps.anomalyScorer.score as jest.Mock).mockResolvedValue({
      signalId: 'test',
      anomalyScore: 0.7,
      matchedSignatures: [],
      adversarialAssessment: { score: 0.1, detectedTechniques: [], poisoningRisk: 0, recommendDefensiveMode: false },
      confidence: 0.6,
      factors: [],
      computeTimeMs: 2,
    });

    await orchestrator.processSignal(makeSignal());

    expect(orchestrator.getState()).toBe(CortexState.REFLEX_OBSERVATION);
  });
});
