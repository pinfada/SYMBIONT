import { AdversarialDefense } from '../../src/cortex/detection/AdversarialDefense';
import { CortexSignal, CandidateSignature, FEATURE_VECTOR_SIZE } from '../../src/cortex/CortexTypes';

describe('AdversarialDefense', () => {
  let defense: AdversarialDefense;

  beforeEach(() => {
    defense = new AdversarialDefense();
  });

  function makeSignal(overrides: Partial<CortexSignal> = {}): CortexSignal {
    return {
      id: `sig-${Math.random()}`,
      timestamp: Date.now(),
      source: 'dom_mutation',
      tabId: 1,
      payload: {
        type: 'test',
        metadata: {},
      },
      resonanceSnapshot: {
        level: 0.3,
        state: 'normal',
        shadowMutationRatio: 0.2,
        jitter: 1,
      },
      ...overrides,
    };
  }

  it('detects delayed execution', () => {
    const signal = makeSignal({
      payload: {
        type: 'test',
        timeSinceLastUserAction: 10000,
        metadata: {},
      },
    });
    const result = defense.evaluateSignal(signal);
    expect(result.detectedTechniques).toContain('delayed_execution');
    expect(result.score).toBeGreaterThan(0);
  });

  it('detects anti-debug techniques', () => {
    const signal = makeSignal({
      payload: { type: 'test', metadata: { antiDebug: true } },
    });
    const result = defense.evaluateSignal(signal);
    expect(result.detectedTechniques).toContain('anti_debug');
  });

  it('detects micro mutations', () => {
    const signal = makeSignal({
      payload: { type: 'test', mutationCount: 150, metadata: {} },
      resonanceSnapshot: {
        level: 0.5,
        state: 'active',
        shadowMutationRatio: 0.9,
        jitter: 2,
      },
    });
    const result = defense.evaluateSignal(signal);
    expect(result.detectedTechniques).toContain('micro_mutation');
  });

  it('detects noise flooding', () => {
    const signal = makeSignal({
      resonanceSnapshot: {
        level: 0.3,
        state: 'normal',
        shadowMutationRatio: 0.95,
        jitter: 0.5,
      },
    });
    const result = defense.evaluateSignal(signal);
    expect(result.detectedTechniques).toContain('noise_flooding');
  });

  it('recommends defensive mode on high score', () => {
    const signal = makeSignal({
      payload: {
        type: 'test',
        timeSinceLastUserAction: 10000,
        mutationCount: 200,
        metadata: { antiDebug: true, environmentCheck: true },
      },
      resonanceSnapshot: {
        level: 0.7,
        state: 'active',
        shadowMutationRatio: 0.95,
        jitter: 0.3,
      },
    });
    const result = defense.evaluateSignal(signal);
    expect(result.recommendDefensiveMode).toBe(true);
  });

  it('detects timing patterns', () => {
    // Feed signals at regular intervals
    const baseTime = Date.now();
    for (let i = 0; i < 10; i++) {
      defense.evaluateSignal(
        makeSignal({
          id: `timing-${i}`,
          timestamp: baseTime + i * 1000, // Exactly 1s apart
        }),
      );
    }
    const result = defense.evaluateSignal(
      makeSignal({
        id: 'timing-final',
        timestamp: baseTime + 10000,
      }),
    );
    expect(result.detectedTechniques).toContain('timing_evasion');
  });

  it('detects poisoning with similar candidates', () => {
    const makeCandidate = (id: string): CandidateSignature => {
      const vec = new Float32Array(FEATURE_VECTOR_SIZE);
      // All very similar vectors (slight variation)
      vec[0] = 0.9;
      vec[1] = 0.8;
      vec[2] = 0.7;
      vec[3] = Math.random() * 0.01; // Tiny variation
      return {
        pattern: {
          version: 1,
          featureVector: vec,
          dominantCategory: 'tracker',
          textualHint: `test-${id}`,
        },
        sourceSignalId: id,
        generatedBy: 'oracle',
        initialConfidence: 0.8,
        contextSnapshot: {
          urlHash: 'test',
          tabId: 1,
          timestamp: Date.now(),
          relatedSignalCount: 1,
        },
      };
    };

    const candidates = Array.from({ length: 8 }, (_, i) =>
      makeCandidate(`candidate-${i}`),
    );

    const alert = defense.detectPoisoning(candidates);
    expect(alert).not.toBeNull();
    expect(alert!.recommendation).toBe('reject');
  });

  it('does not flag poisoning for diverse candidates', () => {
    const makeCandidate = (id: string, idx: number): CandidateSignature => {
      const vec = new Float32Array(FEATURE_VECTOR_SIZE);
      vec[idx % FEATURE_VECTOR_SIZE] = 1.0; // Each vector is very different
      return {
        pattern: {
          version: 1,
          featureVector: vec,
          dominantCategory: 'tracker',
          textualHint: `test-${id}`,
        },
        sourceSignalId: id,
        generatedBy: 'oracle',
        initialConfidence: 0.8,
        contextSnapshot: {
          urlHash: 'test',
          tabId: 1,
          timestamp: Date.now(),
          relatedSignalCount: 1,
        },
      };
    };

    const candidates = Array.from({ length: 6 }, (_, i) =>
      makeCandidate(`candidate-${i}`, i),
    );

    const alert = defense.detectPoisoning(candidates);
    expect(alert).toBeNull();
  });

  it('applies defensive jitter within bounds', () => {
    const base = 1000;
    for (let i = 0; i < 100; i++) {
      const result = defense.applyDefensiveJitter(base);
      expect(result).toBeGreaterThanOrEqual(base * 0.85);
      expect(result).toBeLessThanOrEqual(base * 1.15);
    }
  });

  it('manages defensive mode state', () => {
    expect(defense.isDefensiveMode()).toBe(false);
    defense.activateDefensiveMode();
    expect(defense.isDefensiveMode()).toBe(true);
    defense.deactivateDefensiveMode();
    expect(defense.isDefensiveMode()).toBe(false);
  });
});
