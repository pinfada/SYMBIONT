/**
 * CortexWorker — Web Worker dédié aux analyses Oracle (RT-06)
 *
 * Exécute les analyses cognitives profondes hors du thread principal.
 * Protocole basé sur messages typés avec timeout intégré.
 */

import {
  CortexWorkerMessage,
  CortexWorkerResponse,
  OracleInput,
  DiagnosticResult,
  SignatureMatch,
  CandidateSignature,
  SignaturePattern,
  ThreatSignature,
  Verdict,
  RecommendedAction,
  FEATURE_VECTOR_SIZE,
  cosineSimilarity,
} from '../CortexTypes';

// ─── Worker message handler ─────────────────────────────────────────

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', (event: MessageEvent<CortexWorkerMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'ORACLE_ANALYZE':
      handleOracleAnalyze(msg.id, msg.payload);
      break;
    case 'SIGNATURE_MATCH':
      handleSignatureMatch(msg.id, msg.payload);
      break;
    case 'ABORT':
      // Rien à faire côté worker, le main thread ignore les réponses
      break;
  }
});

// ─── Oracle analysis ────────────────────────────────────────────────

function handleOracleAnalyze(id: string, input: OracleInput): void {
  const startTime = performance.now();

  try {
    const budget = input.budget;
    const maxDuration = budget.maxAllowedDurationMs || 3000;

    // Pass 1 : Corrélation temporelle (max 300ms de budget)
    const temporalResult = analyzeTemporalCorrelation(
      input.signal,
      input.recentSignals,
    );

    let elapsed = performance.now() - startTime;
    if (elapsed > maxDuration - 200) {
      respondResult(id, buildResult(input, temporalResult, null, null, null, elapsed));
      return;
    }

    // Pass 2 : Analyse structurelle
    const structuralResult = analyzeStructure(input.signal);

    elapsed = performance.now() - startTime;
    const mergedConfidence = (temporalResult.confidence + structuralResult.confidence) / 2;
    if (mergedConfidence > 0.85) {
      respondResult(id, buildResult(input, temporalResult, structuralResult, null, null, elapsed));
      return;
    }
    if (elapsed > maxDuration - 200) {
      respondResult(id, buildResult(input, temporalResult, structuralResult, null, null, elapsed));
      return;
    }

    // Pass 3 : Corrélation historique
    const historicalResult = analyzeHistory(input.siteHistory);

    elapsed = performance.now() - startTime;
    if (elapsed > maxDuration - 400) {
      respondResult(id, buildResult(input, temporalResult, structuralResult, historicalResult, null, elapsed));
      return;
    }

    // Pass 4 : Vérification adversariale renforcée
    const adversarialResult = deepAdversarialCheck(input.signal);

    // Pass 5 : Génération de signature candidate
    let candidate: CandidateSignature | undefined;
    const finalConfidence = computeFinalConfidence(temporalResult, structuralResult, historicalResult, adversarialResult);
    const finalVerdict = computeVerdict(finalConfidence, temporalResult, structuralResult);

    if (finalConfidence > 0.7 && finalVerdict !== 'benign') {
      const hasExistingMatch = input.confirmedSignatures.some((sig) => {
        const sim = cosineSimilarity(
          buildFeatureVector(input.signal),
          sig.pattern.featureVector,
        );
        return sim > 0.85;
      });

      if (!hasExistingMatch) {
        candidate = generateCandidateSignature(input, finalConfidence);
      }
    }

    elapsed = performance.now() - startTime;

    const result: DiagnosticResult = {
      level: 'oracle',
      signalId: input.signal.id,
      verdict: finalVerdict,
      confidence: finalConfidence,
      explanation: buildExplanation(temporalResult, structuralResult, historicalResult, adversarialResult),
      candidateSignature: candidate,
      recommendedAction: determineAction(finalVerdict, finalConfidence),
      processingTimeMs: elapsed,
      resourceCost: {
        cpuTimeMs: elapsed,
        peakMemoryDeltaBytes: 0,
        workerUsed: true,
      },
    };

    respondResult(id, result);
  } catch (e) {
    const response: CortexWorkerResponse = {
      type: 'ERROR',
      id,
      error: e instanceof Error ? e.message : 'Unknown worker error',
    };
    ctx.postMessage(response);
  }
}

// ─── Signature matching ─────────────────────────────────────────────

function handleSignatureMatch(
  id: string,
  payload: { pattern: SignaturePattern; signatures: ThreatSignature[] },
): void {
  const startTime = performance.now();
  const matches: SignatureMatch[] = [];

  for (const sig of payload.signatures) {
    const similarity = cosineSimilarity(
      payload.pattern.featureVector,
      sig.pattern.featureVector,
    );
    if (similarity > 0.6) {
      matches.push({
        signatureId: sig.id,
        similarity,
        matchedSignature: sig,
        matchDuration: performance.now() - startTime,
      });
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity);

  const response: CortexWorkerResponse = {
    type: 'MATCH_RESULT',
    id,
    payload: matches,
    processingTime: performance.now() - startTime,
  };
  ctx.postMessage(response);
}

// ─── Analysis passes ────────────────────────────────────────────────

interface PassResult {
  score: number;
  confidence: number;
  details: string;
}

function analyzeTemporalCorrelation(
  signal: typeof import('../CortexTypes').CortexSignal extends never ? never : any,
  recentSignals: any[],
): PassResult {
  let score = 0;
  let confidence = 0.3;

  // Analyser la fréquence de signaux similaires
  const sameSource = recentSignals.filter((s) => s.source === signal.source);
  if (sameSource.length > 5) {
    score += 0.3;
    confidence += 0.1;
  }

  // Analyser la corrélation avec l'activité utilisateur
  if (signal.payload.timeSinceLastUserAction !== undefined) {
    if (signal.payload.timeSinceLastUserAction > 10000) {
      score += 0.4;
      confidence += 0.2;
    }
  }

  // Analyser les burst patterns
  if (recentSignals.length >= 3) {
    const intervals: number[] = [];
    for (let i = 1; i < Math.min(10, recentSignals.length); i++) {
      intervals.push(recentSignals[i].timestamp - recentSignals[i - 1].timestamp);
    }
    const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    if (avgInterval < 500) {
      score += 0.3; // Burst pattern
      confidence += 0.15;
    }
  }

  return { score: Math.min(1, score), confidence: Math.min(0.9, confidence), details: 'temporal_correlation' };
}

function analyzeStructure(signal: any): PassResult {
  let score = 0;
  let confidence = 0.3;
  const meta = signal.payload.metadata || {};

  if (signal.source === 'script_injection') { score += 0.4; confidence += 0.1; }
  if (meta.hasEval) { score += 0.3; confidence += 0.1; }
  if (meta.obfuscationDepth && meta.obfuscationDepth > 2) { score += 0.3; confidence += 0.15; }
  if (meta.hiddenIframe) { score += 0.3; confidence += 0.1; }
  if (meta.canvasRead) { score += 0.4; confidence += 0.15; }
  if (signal.resonanceSnapshot.shadowMutationRatio > 0.8) { score += 0.2; confidence += 0.1; }

  return { score: Math.min(1, score), confidence: Math.min(0.9, confidence), details: 'structural_analysis' };
}

function analyzeHistory(siteHistory: any[]): PassResult {
  if (!siteHistory || siteHistory.length === 0) {
    return { score: 0, confidence: 0.2, details: 'no_history' };
  }

  const latest = siteHistory[0];
  let score = latest.averageAnomalyScore || 0;
  let confidence = 0.3;

  const recentMalicious = (latest.previousVerdicts || []).filter(
    (v: any) => v.verdict === 'malicious' && Date.now() - v.timestamp < 86400000,
  );

  if (recentMalicious.length > 0) {
    score = Math.min(1, score + 0.3);
    confidence += 0.2;
  }

  return { score: Math.min(1, score), confidence: Math.min(0.8, confidence), details: 'historical_analysis' };
}

function deepAdversarialCheck(signal: any): PassResult {
  let score = 0;
  let confidence = 0.3;
  const meta = signal.payload.metadata || {};

  if (meta.antiDebug) { score += 0.4; confidence += 0.15; }
  if (meta.environmentCheck) { score += 0.3; confidence += 0.1; }
  if (meta.obfuscationDepth && meta.obfuscationDepth > 3) { score += 0.3; confidence += 0.15; }

  return { score: Math.min(1, score), confidence: Math.min(0.8, confidence), details: 'adversarial_check' };
}

// ─── Helpers ────────────────────────────────────────────────────────

function computeFinalConfidence(...passes: (PassResult | null)[]): number {
  const valid = passes.filter((p): p is PassResult => p !== null);
  if (valid.length === 0) return 0;
  const avg = valid.reduce((s, p) => s + p.confidence, 0) / valid.length;
  // Bonus pour convergence
  const scores = valid.map((p) => p.score);
  const allHigh = scores.every((s) => s > 0.4);
  return Math.min(0.95, avg + (allHigh ? 0.1 : 0));
}

function computeVerdict(confidence: number, temporal: PassResult, structural: PassResult): Verdict {
  const avgScore = (temporal.score + structural.score) / 2;
  if (avgScore > 0.7 && confidence > 0.6) return 'malicious';
  if (avgScore > 0.4) return 'suspicious';
  if (avgScore > 0.2) return 'inconclusive';
  return 'benign';
}

function determineAction(verdict: Verdict, confidence: number): RecommendedAction {
  if (verdict === 'malicious' && confidence >= 0.8) return 'block';
  if (verdict === 'malicious') return 'monitor';
  if (verdict === 'suspicious') return 'monitor';
  if (verdict === 'inconclusive') return 'escalate';
  return 'ignore';
}

function buildExplanation(...passes: (PassResult | null)[]): string {
  return passes
    .filter((p): p is PassResult => p !== null)
    .map((p) => `${p.details}: score=${p.score.toFixed(2)}, conf=${p.confidence.toFixed(2)}`)
    .join('; ');
}

function buildFeatureVector(signal: any): Float32Array {
  const vec = new Float32Array(FEATURE_VECTOR_SIZE);
  vec[0] = signal.resonanceSnapshot?.level || 0;
  vec[1] = signal.resonanceSnapshot?.shadowMutationRatio || 0;
  vec[2] = Math.min(1, (signal.payload?.mutationCount || 0) / 100);
  vec[8] = signal.source === 'script_injection' ? 1 : 0;
  vec[16] = signal.source === 'network_request' ? 1 : 0;
  vec[24] = Math.min(1, (signal.payload?.timeSinceLastUserAction || 0) / 30000);
  vec[32] = signal.source === 'css_fingerprint' ? 1 : 0;
  vec[33] = signal.source === 'webrtc_probe' ? 1 : 0;
  return vec;
}

function generateCandidateSignature(input: OracleInput, confidence: number): CandidateSignature {
  const signal = input.signal;
  return {
    pattern: {
      version: 1,
      featureVector: buildFeatureVector(signal),
      dominantCategory: inferCategory(signal),
      textualHint: `oracle_detected_${signal.source}_${Date.now()}`,
    },
    sourceSignalId: signal.id,
    generatedBy: 'oracle',
    initialConfidence: confidence,
    contextSnapshot: {
      urlHash: signal.payload.urlHash || '',
      tabId: signal.tabId,
      timestamp: Date.now(),
      relatedSignalCount: input.recentSignals.length,
    },
  };
}

function inferCategory(signal: any): string {
  if (signal.source === 'css_fingerprint' || signal.source === 'webrtc_probe') return 'fingerprinter';
  if (signal.source === 'script_injection') {
    if (signal.payload.metadata?.hasEval) return 'obfuscated_script';
    return 'malware_loader';
  }
  if (signal.source === 'network_request') {
    if (signal.payload.metadata?.largePayload) return 'data_exfiltrator';
    return 'tracker';
  }
  return 'unknown';
}

function respondResult(id: string, result: DiagnosticResult): void {
  const response: CortexWorkerResponse = {
    type: 'ORACLE_RESULT',
    id,
    payload: result,
    processingTime: result.processingTimeMs,
  };
  ctx.postMessage(response);
}
