import { RAGLifecycleController } from '../../src/cortex/rag/RAGLifecycleController';
import { ActiveRAGStore } from '../../src/cortex/rag/ActiveRAGStore';
import { CognitiveTelemetry } from '../../src/cortex/telemetry/CognitiveTelemetry';
import { AdversarialDefense } from '../../src/cortex/detection/AdversarialDefense';
import {
  CandidateSignature,
  ThreatSignature,
  FEATURE_VECTOR_SIZE,
} from '../../src/cortex/CortexTypes';

// Mock ActiveRAGStore
class MockRAGStore {
  signatures: Map<string, ThreatSignature> = new Map();
  private nextId = 0;

  async initialize() {}

  async addCandidate(candidate: CandidateSignature): Promise<void> {
    const id = `sig-${this.nextId++}`;
    const sig: ThreatSignature = {
      id,
      pattern: candidate.pattern,
      status: 'candidate',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSeenAt: Date.now(),
      occurrenceCount: 1,
      falsePositiveCount: 0,
      truePositiveCount: 0,
      confidence: candidate.initialConfidence,
      promotionHistory: [],
      sourceContext: {
        urlHash: candidate.contextSnapshot.urlHash,
        generatedByOracleId: candidate.sourceSignalId,
      },
    };
    this.signatures.set(id, sig);
  }

  async getCandidatesForReview(): Promise<ThreatSignature[]> {
    return Array.from(this.signatures.values()).filter(
      (s) => s.status === 'candidate' || s.status === 'probation',
    );
  }

  async getRecentCandidates(): Promise<ThreatSignature[]> {
    return Array.from(this.signatures.values()).filter(
      (s) => s.status === 'candidate',
    );
  }

  async updateStatus(id: string, status: string, reason: string): Promise<void> {
    const sig = this.signatures.get(id);
    if (sig) {
      sig.status = status as any;
      sig.updatedAt = Date.now();
    }
  }

  async recordOccurrence(id: string): Promise<void> {
    const sig = this.signatures.get(id);
    if (sig) {
      sig.occurrenceCount++;
      sig.lastSeenAt = Date.now();
    }
  }

  async recordFalsePositive(id: string): Promise<void> {
    const sig = this.signatures.get(id);
    if (sig) sig.falsePositiveCount++;
  }

  async recordTruePositive(id: string): Promise<void> {
    const sig = this.signatures.get(id);
    if (sig) sig.truePositiveCount++;
  }

  async pruneDeprecated(): Promise<number> {
    return 0;
  }

  isFallbackMode() { return false; }
  async getSignatureCount() { return { candidate: 0, probation: 0, confirmed: 0, deprecated: 0, quarantined: 0 }; }
}

// Mock telemetry
class MockTelemetry {
  logs: Array<{ type: string; details?: Record<string, unknown> }> = [];
  async log(type: string, details?: Record<string, unknown>) {
    this.logs.push({ type, details });
  }
}

describe('RAGLifecycleController', () => {
  let store: MockRAGStore;
  let telemetry: MockTelemetry;
  let adversarial: AdversarialDefense;
  let controller: RAGLifecycleController;

  beforeEach(() => {
    store = new MockRAGStore();
    telemetry = new MockTelemetry();
    adversarial = new AdversarialDefense();
    controller = new RAGLifecycleController(
      store as any,
      telemetry as any,
      adversarial,
    );
  });

  afterEach(() => {
    controller.stopPeriodicReview();
  });

  function makeCandidate(): CandidateSignature {
    const vec = new Float32Array(FEATURE_VECTOR_SIZE);
    vec[0] = Math.random();
    return {
      pattern: {
        version: 1,
        featureVector: vec,
        dominantCategory: 'tracker',
        textualHint: 'test',
      },
      sourceSignalId: 'oracle-1',
      generatedBy: 'oracle',
      initialConfidence: 0.7,
      contextSnapshot: {
        urlHash: 'hash-1',
        tabId: 1,
        timestamp: Date.now(),
        relatedSignalCount: 3,
      },
    };
  }

  it('registers a candidate signature', async () => {
    await controller.registerCandidate(makeCandidate());
    expect(store.signatures.size).toBe(1);

    const sig = Array.from(store.signatures.values())[0];
    expect(sig.status).toBe('candidate');
  });

  it('promotes candidate to probation after sufficient occurrences', async () => {
    await controller.registerCandidate(makeCandidate());
    const sigId = Array.from(store.signatures.keys())[0];

    // Simulate 3 occurrences
    for (let i = 0; i < 3; i++) {
      await controller.recordOccurrence(sigId);
    }

    await controller.performReview();

    const sig = store.signatures.get(sigId)!;
    expect(sig.status).toBe('probation');
  });

  it('does not promote candidate with high false positive rate', async () => {
    await controller.registerCandidate(makeCandidate());
    const sigId = Array.from(store.signatures.keys())[0];

    // 3 occurrences but 2 false positives
    for (let i = 0; i < 3; i++) {
      await controller.recordOccurrence(sigId);
    }
    await controller.recordFalsePositive(sigId);
    await controller.recordFalsePositive(sigId);

    await controller.performReview();

    const sig = store.signatures.get(sigId)!;
    expect(sig.status).toBe('candidate'); // Not promoted
  });

  it('promotes probation to confirmed after sufficient validation', async () => {
    await controller.registerCandidate(makeCandidate());
    const sigId = Array.from(store.signatures.keys())[0];
    const sig = store.signatures.get(sigId)!;

    // Set to probation manually
    sig.status = 'probation';
    sig.occurrenceCount = 8;
    sig.truePositiveCount = 5;
    sig.falsePositiveCount = 0;
    sig.createdAt = Date.now() - 86_400_001; // > 24h ago

    await controller.performReview();

    expect(sig.status).toBe('confirmed');
  });

  it('deprecates stale candidates', async () => {
    await controller.registerCandidate(makeCandidate());
    const sigId = Array.from(store.signatures.keys())[0];
    const sig = store.signatures.get(sigId)!;

    // Make it old with few occurrences
    sig.createdAt = Date.now() - 200_000_000; // > 48h
    sig.occurrenceCount = 1;

    await controller.performReview();

    expect(sig.status).toBe('deprecated');
  });

  it('logs telemetry on promotion', async () => {
    await controller.registerCandidate(makeCandidate());
    const sigId = Array.from(store.signatures.keys())[0];
    const sig = store.signatures.get(sigId)!;

    sig.status = 'probation';
    sig.occurrenceCount = 10;
    sig.truePositiveCount = 7;
    sig.falsePositiveCount = 0;
    sig.createdAt = Date.now() - 100_000_000;

    await controller.performReview();

    const promotionLog = telemetry.logs.find(
      (l) => l.type === 'signature_promoted',
    );
    expect(promotionLog).toBeDefined();
  });
});
