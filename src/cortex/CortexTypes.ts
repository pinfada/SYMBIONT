/**
 * Symbiont-Cortex Engine v3.1 — Types fondamentaux
 *
 * Toutes les interfaces, enums et types partagés
 * par les sous-systèmes du moteur cognitif.
 */

import { generateSecureUUID } from '@shared/utils/uuid';

// ─── États du moteur ────────────────────────────────────────────────

export enum CortexState {
  IDLE = 'idle',
  REFLEX_OBSERVATION = 'reflex',
  QUICK_ANALYSIS = 'quick_analysis',
  DEEP_ANALYSIS = 'deep_analysis',
  CONTROLLED_LEARNING = 'learning',
  DEFENSIVE_MODE = 'defensive',
  COGNITIVE_HIBERNATION = 'hibernation',
  GRADUAL_RECOVERY = 'recovery',
}

export const VALID_TRANSITIONS: Record<CortexState, CortexState[]> = {
  [CortexState.IDLE]: [CortexState.REFLEX_OBSERVATION],
  [CortexState.REFLEX_OBSERVATION]: [
    CortexState.QUICK_ANALYSIS,
    CortexState.DEFENSIVE_MODE,
    CortexState.COGNITIVE_HIBERNATION,
    CortexState.IDLE,
  ],
  [CortexState.QUICK_ANALYSIS]: [
    CortexState.REFLEX_OBSERVATION,
    CortexState.DEEP_ANALYSIS,
    CortexState.DEFENSIVE_MODE,
    CortexState.COGNITIVE_HIBERNATION,
  ],
  [CortexState.DEEP_ANALYSIS]: [
    CortexState.CONTROLLED_LEARNING,
    CortexState.REFLEX_OBSERVATION,
    CortexState.COGNITIVE_HIBERNATION,
  ],
  [CortexState.CONTROLLED_LEARNING]: [CortexState.REFLEX_OBSERVATION],
  [CortexState.DEFENSIVE_MODE]: [
    CortexState.REFLEX_OBSERVATION,
    CortexState.COGNITIVE_HIBERNATION,
  ],
  [CortexState.COGNITIVE_HIBERNATION]: [CortexState.GRADUAL_RECOVERY],
  [CortexState.GRADUAL_RECOVERY]: [
    CortexState.REFLEX_OBSERVATION,
    CortexState.IDLE,
    CortexState.COGNITIVE_HIBERNATION,
  ],
};

// ─── Sources de signaux ─────────────────────────────────────────────

export type SignalSource =
  | 'dom_mutation'
  | 'script_injection'
  | 'network_request'
  | 'behavior_anomaly'
  | 'css_fingerprint'
  | 'webrtc_probe';

// ─── Signal d'entrée ────────────────────────────────────────────────

export interface CortexSignal {
  id: string;
  timestamp: number;
  source: SignalSource;
  tabId: number;
  payload: {
    type: string;
    elementSelector?: string;
    attributeChanges?: Array<{
      name: string;
      oldValue: string | null;
      newValue: string;
    }>;
    scriptHash?: string;
    urlHash?: string;
    networkTarget?: string;
    mutationCount?: number;
    timeSinceLastUserAction?: number;
    metadata: Record<string, unknown>;
  };
  resonanceSnapshot: {
    level: number;
    state: 'quiet' | 'normal' | 'active' | 'critical';
    shadowMutationRatio: number;
    jitter: number;
  };
}

// ─── Catégories de menaces ──────────────────────────────────────────

export type ThreatCategory =
  | 'tracker'
  | 'fingerprinter'
  | 'cryptominer'
  | 'malware_loader'
  | 'data_exfiltrator'
  | 'click_hijacker'
  | 'obfuscated_script'
  | 'hidden_iframe'
  | 'dom_manipulator'
  | 'unknown';

// ─── Signatures ─────────────────────────────────────────────────────

/**
 * Vecteur de caractéristiques normalisé (48 dimensions).
 *
 * Décomposition :
 *   [0-7]   Profil DOM
 *   [8-15]  Profil script
 *   [16-23] Profil réseau
 *   [24-31] Profil temporel
 *   [32-39] Profil fingerprinting
 *   [40-47] Profil adversarial
 */
export interface SignaturePattern {
  version: number;
  featureVector: Float32Array;
  dominantCategory: ThreatCategory;
  textualHint: string;
}

export const FEATURE_VECTOR_SIZE = 48;

export type SignatureStatus =
  | 'candidate'
  | 'probation'
  | 'confirmed'
  | 'deprecated'
  | 'quarantined';

export interface StatusTransition {
  from: SignatureStatus;
  to: SignatureStatus;
  timestamp: number;
  reason: string;
  metrics: {
    occurrenceCount: number;
    falsePositiveRate: number;
    confidence: number;
  };
}

export interface ThreatSignature {
  id: string;
  pattern: SignaturePattern;
  status: SignatureStatus;
  createdAt: number;
  updatedAt: number;
  lastSeenAt: number;
  occurrenceCount: number;
  falsePositiveCount: number;
  truePositiveCount: number;
  confidence: number;
  promotionHistory: StatusTransition[];
  sourceContext: {
    urlHash: string;
    generatedByOracleId: string;
  };
}

export interface SignatureMatch {
  signatureId: string;
  similarity: number;
  matchedSignature: ThreatSignature;
  matchDuration: number;
}

// ─── Anomalie ───────────────────────────────────────────────────────

export interface AnomalyFactor {
  name: string;
  rawValue: number;
  normalizedValue: number;
  weight: number;
  contribution: number;
}

export interface AnomalyResult {
  signalId: string;
  anomalyScore: number;
  matchedSignatures: SignatureMatch[];
  adversarialAssessment: AdversarialAssessment;
  confidence: number;
  factors: AnomalyFactor[];
  computeTimeMs: number;
}

// ─── Adversarial ────────────────────────────────────────────────────

export type AdversarialTechnique =
  | 'delayed_execution'
  | 'conditional_execution'
  | 'micro_mutation'
  | 'rag_poisoning'
  | 'progressive_obfuscation'
  | 'noise_flooding'
  | 'anti_debug'
  | 'polymorphic_code'
  | 'timing_evasion';

export interface AdversarialAssessment {
  score: number;
  detectedTechniques: AdversarialTechnique[];
  poisoningRisk: number;
  recommendDefensiveMode: boolean;
}

export interface PoisoningAlert {
  suspectedSignatureIds: string[];
  commonPatternHash: string;
  occurrenceCount: number;
  similarity: number;
  recommendation: 'quarantine' | 'reject' | 'monitor';
}

// ─── Seuil dynamique ───────────────────────────────────────────────

export interface ThresholdInputs {
  systemLoad: number;
  siteRiskScore: number;
  thermalPressure: number;
  adversarialSuspicion: number;
  historicalConfidence: number;
  recentEscalationRate: number;
}

export interface ThresholdContext {
  currentThreshold: number;
  rawThreshold: number;
  inputs: ThresholdInputs;
  dampingApplied: boolean;
}

// ─── Diagnostic ─────────────────────────────────────────────────────

export type Verdict = 'benign' | 'suspicious' | 'malicious' | 'inconclusive';
export type RecommendedAction = 'ignore' | 'monitor' | 'block' | 'escalate';

export interface ResourceCost {
  cpuTimeMs: number;
  peakMemoryDeltaBytes: number;
  workerUsed: boolean;
}

export interface DiagnosticResult {
  level: 'draft' | 'oracle';
  signalId: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  matchedRules?: string[];
  candidateSignature?: CandidateSignature;
  recommendedAction: RecommendedAction;
  processingTimeMs: number;
  resourceCost: ResourceCost;
}

export interface CandidateSignature {
  pattern: SignaturePattern;
  sourceSignalId: string;
  generatedBy: 'oracle';
  initialConfidence: number;
  contextSnapshot: {
    urlHash: string;
    tabId: number;
    timestamp: number;
    relatedSignalCount: number;
  };
}

// ─── Budget ressources ──────────────────────────────────────────────

export type ThermalState = 'nominal' | 'warm' | 'hot' | 'critical';

export interface ResourceBudget {
  available: boolean;
  vramEstimatePercent: number;
  cpuLoadPercent: number;
  memoryPressure: number;
  thermalState: ThermalState;
  backpressureLevel: string;
  maxAllowedDurationMs: number;
  frameRate: number;
  reason?: string;
}

// ─── Politique ──────────────────────────────────────────────────────

export interface PolicyDecision {
  action: RecommendedAction;
  verdict: Verdict;
  confidence: number;
  justification: string;
  stateAfterDecision: CortexState;
  shouldNotifyUser: boolean;
}

export interface PolicyRule {
  id: string;
  name: string;
  condition: (diagnostic: DiagnosticResult, state: CortexState) => boolean;
  action: RecommendedAction;
  priority: number;
}

// ─── Télémétrie ─────────────────────────────────────────────────────

export type CognitiveEventType =
  | 'trivial_decision'
  | 'ambiguity_detected'
  | 'draft_analysis'
  | 'draft_result'
  | 'oracle_requested'
  | 'oracle_result'
  | 'escalation_refused'
  | 'escalation_budget_denied'
  | 'signature_candidate_created'
  | 'signature_promoted'
  | 'signature_deprecated'
  | 'signature_quarantined'
  | 'hibernation_entered'
  | 'recovery_started'
  | 'recovery_completed'
  | 'adversarial_alert'
  | 'defensive_mode_activated'
  | 'defensive_mode_deactivated'
  | 'state_transition'
  | 'worker_crash_recovered'
  | 'cold_start';

export interface CognitiveLogEntry {
  id: string;
  timestamp: number;
  type: CognitiveEventType;
  stateTransition?: { from: CortexState; to: CortexState };
  signalId?: string;
  tabId?: number;
  diagnosticSummary?: string;
  resourceSnapshot?: ResourceBudget;
  decision?: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface CortexMetrics {
  totalSignalsProcessed: number;
  draftAnalysesCount: number;
  oracleAnalysesCount: number;
  averageDraftLatencyMs: number;
  averageOracleLatencyMs: number;
  falsePositiveRate: number;
  escalationRate: number;
  hibernationCount: number;
  averageAnomalyScore: number;
  signatureStats: {
    candidates: number;
    probation: number;
    confirmed: number;
    deprecated: number;
    quarantined: number;
  };
  uptime: number;
}

// ─── Oracle Input ───────────────────────────────────────────────────

export interface SiteHistoryEntry {
  urlHash: string;
  visitCount: number;
  lastVisit: number;
  previousVerdicts: Array<{
    verdict: Verdict;
    confidence: number;
    timestamp: number;
  }>;
  averageAnomalyScore: number;
}

export interface OracleInput {
  signal: CortexSignal;
  draftResult: DiagnosticResult;
  recentSignals: CortexSignal[];
  siteHistory: SiteHistoryEntry[];
  confirmedSignatures: ThreatSignature[];
  budget: ResourceBudget;
}

// ─── Worker Protocol ────────────────────────────────────────────────

export type CortexWorkerMessage =
  | {
      type: 'ORACLE_ANALYZE';
      id: string;
      payload: OracleInput;
    }
  | {
      type: 'SIGNATURE_MATCH';
      id: string;
      payload: { pattern: SignaturePattern; signatures: ThreatSignature[] };
    }
  | { type: 'ABORT'; id: string };

export type CortexWorkerResponse =
  | { type: 'ORACLE_RESULT'; id: string; payload: DiagnosticResult; processingTime: number }
  | { type: 'MATCH_RESULT'; id: string; payload: SignatureMatch[]; processingTime: number }
  | { type: 'ERROR'; id: string; error: string }
  | { type: 'TIMEOUT'; id: string };

// ─── Cortex MessageBus Types ────────────────────────────────────────

export enum CortexMessageType {
  CORTEX_SIGNAL = 'CORTEX_SIGNAL',
  CORTEX_STATE_CHANGE = 'CORTEX_STATE_CHANGE',
  CORTEX_THREAT_DETECTED = 'CORTEX_THREAT_DETECTED',
  CORTEX_METRICS_UPDATE = 'CORTEX_METRICS_UPDATE',
  CORTEX_HIBERNATION = 'CORTEX_HIBERNATION',
  CORTEX_RECOVERY = 'CORTEX_RECOVERY',
}

// ─── Helpers ────────────────────────────────────────────────────────

export function createEmptySignaturePattern(): SignaturePattern {
  return {
    version: 1,
    featureVector: new Float32Array(FEATURE_VECTOR_SIZE),
    dominantCategory: 'unknown',
    textualHint: '',
  };
}

export function createCortexSignalId(): string {
  return generateSecureUUID();
}

export function isTransitionValid(from: CortexState, to: CortexState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}
