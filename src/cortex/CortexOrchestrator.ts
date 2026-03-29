/**
 * CortexOrchestrator — Gouvernance centrale du moteur cognitif (F-01)
 *
 * Point d'entrée unique pour tout arbitrage.
 * Implémente la machine d'états complète et le flux du diagramme de séquence.
 */

import {
  CortexState,
  CortexSignal,
  CortexMetrics,
  ResourceBudget,
  isTransitionValid,
} from './CortexTypes';
import { DynamicThresholdEngine } from './threshold/DynamicThresholdEngine';
import { DraftModel } from './models/DraftModel';
import { OracleModel } from './models/OracleModel';
import { ActiveRAGStore } from './rag/ActiveRAGStore';
import { RAGLifecycleController } from './rag/RAGLifecycleController';
import { VRAMThermalGuard } from './guard/VRAMThermalGuard';
import { DeepReasoningGuard } from './guard/DeepReasoningGuard';
import { AdversarialDefense } from './detection/AdversarialDefense';
import { AnomalyScorer } from './detection/AnomalyScorer';
import { CognitiveTelemetry } from './telemetry/CognitiveTelemetry';
import { PolicyEngine } from './policy/PolicyEngine';

const MAX_QUEUE_SIZE = 50;
const RECOVERY_CHECK_INTERVAL_MS = 30_000;
const RECOVERY_PHASE1_MS = 30_000;
const RECOVERY_PHASE2_MS = 60_000;
const CALIBRATION_INTERVAL_MS = 3_600_000; // 1h

export interface CortexOrchestratorDeps {
  thresholdEngine: DynamicThresholdEngine;
  draftModel: DraftModel;
  oracleModel: OracleModel;
  ragStore: ActiveRAGStore;
  ragLifecycle: RAGLifecycleController;
  guard: VRAMThermalGuard;
  reasoningGuard: DeepReasoningGuard;
  adversarial: AdversarialDefense;
  telemetry: CognitiveTelemetry;
  policyEngine: PolicyEngine;
  anomalyScorer: AnomalyScorer;
}

export class CortexOrchestrator {
  private state: CortexState = CortexState.IDLE;
  private deps: CortexOrchestratorDeps;
  private signalQueue: CortexSignal[] = [];
  private processing = false;
  private reinforcedReflexMode = false;
  private recoveryCheckTimer: ReturnType<typeof setInterval> | null = null;
  private calibrationTimer: ReturnType<typeof setInterval> | null = null;
  private recentSignalsByTab: Map<number, CortexSignal[]> = new Map();
  private readonly MAX_RECENT_SIGNALS_PER_TAB = 20;

  constructor(deps: CortexOrchestratorDeps) {
    this.deps = deps;
  }

  async initialize(): Promise<void> {
    this.transitionTo(CortexState.REFLEX_OBSERVATION, 'initialization');

    // Auto-calibration périodique du seuil
    this.calibrationTimer = setInterval(async () => {
      const metrics = await this.deps.telemetry.getAggregatedMetrics();
      this.deps.thresholdEngine.calibrate(metrics);
    }, CALIBRATION_INTERVAL_MS);
  }

  async processSignal(signal: CortexSignal): Promise<void> {
    // Stocker dans l'historique récent par tab
    this.trackRecentSignal(signal);

    // ── GARDE : états non-réceptifs ──────────────────────────────────
    if (this.state === CortexState.COGNITIVE_HIBERNATION) {
      if (signal.resonanceSnapshot.level < 0.8) {
        this.enqueue(signal);
        return;
      }
      // Signal critique même en hibernation → traiter
    }

    if (this.state === CortexState.GRADUAL_RECOVERY) {
      await this.processReflexOnly(signal);
      return;
    }

    // Sérialiser le traitement (un seul signal à la fois)
    if (this.processing) {
      this.enqueue(signal);
      return;
    }

    this.processing = true;
    try {
      await this.processSignalInternal(signal);
    } finally {
      this.processing = false;
      // Traiter le prochain signal en queue
      await this.drainQueue();
    }
  }

  private async processSignalInternal(signal: CortexSignal): Promise<void> {
    // ── ÉTAPE 1 : Scoring d'anomalie ──────────────────────────────
    const anomalyResult = await this.deps.anomalyScorer.score(signal);

    // ── ÉTAPE 2 : Seuil dynamique ─────────────────────────────────
    const siteRiskScore = await this.deps.ragStore.getSiteRiskScore(
      signal.payload.urlHash,
    );
    const thresholdCtx = this.deps.thresholdEngine.getCurrentThreshold({
      systemLoad: this.deps.guard.getSystemLoad(),
      siteRiskScore,
      thermalPressure: this.deps.guard.getThermalPressure(),
      adversarialSuspicion: anomalyResult.adversarialAssessment.score,
      historicalConfidence: this.deps.telemetry.getRecentConfidence(),
      recentEscalationRate: this.deps.telemetry.getEscalationRate(),
    });

    // ── ÉTAPE 3 : Budget ressources ───────────────────────────────
    const budget = this.deps.guard.checkBudget();

    // ── ALT : Contrainte critique matérielle (step 21) ────────────
    if (
      budget.thermalState === 'critical' ||
      budget.backpressureLevel === 'emergency'
    ) {
      this.transitionTo(
        CortexState.COGNITIVE_HIBERNATION,
        'critical_resource_constraint',
      );
      await this.deps.telemetry.log('hibernation_entered', {
        reason: budget.reason || budget.thermalState,
        signalId: signal.id,
      });
      this.scheduleRecoveryCheck();
      return;
    }

    // ── ALT : Mode défensif si adversarial élevé ──────────────────
    if (anomalyResult.adversarialAssessment.recommendDefensiveMode) {
      if (this.state !== CortexState.DEFENSIVE_MODE) {
        this.transitionTo(CortexState.DEFENSIVE_MODE, 'adversarial_threat');
        this.deps.adversarial.activateDefensiveMode();
        await this.deps.telemetry.log('defensive_mode_activated', {
          adversarialScore: anomalyResult.adversarialAssessment.score,
        });
      }
    }

    // ── ALT : Cas trivial ou pattern connu (step 11) ──────────────
    if (
      anomalyResult.anomalyScore < thresholdCtx.currentThreshold &&
      anomalyResult.adversarialAssessment.score < 0.3
    ) {
      await this.deps.telemetry.log('trivial_decision', {
        score: anomalyResult.anomalyScore,
        threshold: thresholdCtx.currentThreshold,
      });

      // Renforcer les signatures matchées
      for (const match of anomalyResult.matchedSignatures) {
        await this.deps.ragLifecycle.recordOccurrence(match.signatureId);
      }
      return;
    }

    // ── CAS AMBIGU : Escalade vers Draft (steps 12-14) ────────────
    await this.deps.telemetry.log('ambiguity_detected', {
      score: anomalyResult.anomalyScore,
      threshold: thresholdCtx.currentThreshold,
    });

    this.transitionTo(CortexState.QUICK_ANALYSIS, 'ambiguous_signal');

    const diagnosticDraft = this.deps.draftModel.analyze(signal, anomalyResult);
    await this.deps.telemetry.log('draft_result', {
      verdict: diagnosticDraft.verdict,
      confidence: diagnosticDraft.confidence,
      processingTimeMs: diagnosticDraft.processingTimeMs,
    });

    // ── ALT : Draft suffisant (steps 15-16) ───────────────────────
    if (diagnosticDraft.confidence >= 0.7 || diagnosticDraft.verdict === 'benign') {
      this.deps.policyEngine.applyDecision(diagnosticDraft, this.state);
      this.transitionTo(CortexState.REFLEX_OBSERVATION, 'draft_sufficient');
      return;
    }

    // ── Draft insuffisant : demande de budget profond (steps 17-18) ──

    // Vérifier le reasoning guard
    const reasoningCheck = this.deps.reasoningGuard.canStartDeepAnalysis();
    if (!reasoningCheck.allowed) {
      this.reinforcedReflexMode = true;
      this.transitionTo(CortexState.REFLEX_OBSERVATION, 'reasoning_guard_denied');
      await this.deps.telemetry.log('escalation_refused', {
        reason: reasoningCheck.reason,
        signalId: signal.id,
        draftConfidence: diagnosticDraft.confidence,
      });
      this.deps.policyEngine.applyDecision(
        { ...diagnosticDraft, recommendedAction: 'monitor' },
        this.state,
      );
      return;
    }

    const deepBudget = this.deps.guard.requestDeepBudget();

    // ── ALT : Refus pour contrainte matérielle (step 20) ──────────
    if (!deepBudget.available) {
      this.reinforcedReflexMode = true;
      this.transitionTo(
        CortexState.REFLEX_OBSERVATION,
        'escalation_refused_resource_constraint',
      );
      await this.deps.telemetry.log('escalation_budget_denied', {
        reason: deepBudget.reason,
        signalId: signal.id,
        draftConfidence: diagnosticDraft.confidence,
      });
      // Appliquer décision Draft en mode "monitor"
      this.deps.policyEngine.applyDecision(
        { ...diagnosticDraft, recommendedAction: 'monitor' },
        this.state,
      );
      return;
    }

    // ── ALT : Autorisation accordée — Oracle (steps 19-22) ────────
    this.transitionTo(CortexState.DEEP_ANALYSIS, 'oracle_authorized');
    this.deps.reasoningGuard.startAnalysis();

    await this.deps.telemetry.log('oracle_requested', {
      signalId: signal.id,
    });

    // Timeout de sécurité
    const timeoutHandle = this.deps.reasoningGuard.createTimeout(
      deepBudget.maxAllowedDurationMs,
      () => {
        this.deps.telemetry.log('oracle_result', {
          verdict: 'inconclusive',
          reason: 'timeout',
        });
      },
    );

    try {
      const recentSignals = this.getRecentSignals(signal.tabId);
      const confirmedSignatures = await this.deps.ragStore.getConfirmedSignatures();

      const diagnosticOracle = await this.deps.oracleModel.analyze(
        signal,
        diagnosticDraft,
        deepBudget,
        recentSignals,
        [], // siteHistory — à enrichir plus tard
        confirmedSignatures,
      );

      clearTimeout(timeoutHandle);
      this.deps.reasoningGuard.endAnalysis();

      await this.deps.telemetry.log('oracle_result', {
        verdict: diagnosticOracle.verdict,
        confidence: diagnosticOracle.confidence,
        hasCandidate: !!diagnosticOracle.candidateSignature,
        processingTimeMs: diagnosticOracle.processingTimeMs,
      });

      // ── ALT : Nouvelle menace plausible (steps 22-24) ──────────
      if (diagnosticOracle.candidateSignature) {
        this.transitionTo(CortexState.CONTROLLED_LEARNING, 'new_threat_candidate');
        await this.deps.ragLifecycle.registerCandidate(
          diagnosticOracle.candidateSignature,
        );
      }

      // Appliquer la décision finale
      this.deps.policyEngine.applyDecision(diagnosticOracle, this.state);
    } catch (e) {
      clearTimeout(timeoutHandle);
      this.deps.reasoningGuard.endAnalysis();

      await this.deps.telemetry.log('worker_crash_recovered', {
        error: e instanceof Error ? e.message : 'unknown',
        signalId: signal.id,
      });

      // Fallback : appliquer la décision Draft
      this.deps.policyEngine.applyDecision(
        { ...diagnosticDraft, recommendedAction: 'monitor' },
        this.state,
      );
    }

    this.transitionTo(CortexState.REFLEX_OBSERVATION, 'analysis_complete');
  }

  // ─── Réflexe uniquement (mode recovery) ──────────────────────────

  private async processReflexOnly(signal: CortexSignal): Promise<void> {
    const anomalyResult = await this.deps.anomalyScorer.score(signal);

    if (anomalyResult.anomalyScore > 0.8) {
      // Même en recovery, signaler les menaces très évidentes
      await this.deps.telemetry.log('ambiguity_detected', {
        score: anomalyResult.anomalyScore,
        mode: 'recovery_reflex_only',
      });
    }

    // Renforcer les signatures matchées
    for (const match of anomalyResult.matchedSignatures) {
      await this.deps.ragLifecycle.recordOccurrence(match.signatureId);
    }
  }

  // ─── Gestion de la queue ──────────────────────────────────────────

  private enqueue(signal: CortexSignal): void {
    if (this.signalQueue.length >= MAX_QUEUE_SIZE) {
      // Priority drop : retirer le signal avec le score de résonance le plus bas
      let minIdx = 0;
      let minLevel = Infinity;
      for (let i = 0; i < this.signalQueue.length; i++) {
        if (this.signalQueue[i].resonanceSnapshot.level < minLevel) {
          minLevel = this.signalQueue[i].resonanceSnapshot.level;
          minIdx = i;
        }
      }
      // Si le nouveau signal a une résonance plus haute que le minimum, le remplacer
      if (signal.resonanceSnapshot.level > minLevel) {
        this.signalQueue.splice(minIdx, 1);
        this.signalQueue.push(signal);
      }
      // Sinon, drop le nouveau signal
      return;
    }
    this.signalQueue.push(signal);
  }

  private async drainQueue(): Promise<void> {
    while (this.signalQueue.length > 0 && !this.processing) {
      const next = this.signalQueue.shift();
      if (next) {
        this.processing = true;
        try {
          await this.processSignalInternal(next);
        } finally {
          this.processing = false;
        }
      }
    }
  }

  // ─── Transitions d'état ───────────────────────────────────────────

  private transitionTo(newState: CortexState, reason: string): void {
    if (this.state === newState) return;

    if (!isTransitionValid(this.state, newState)) {
      // En production, on ne crash pas — on log et on force la transition
      // vers un état sûr
      this.deps.telemetry.log('state_transition', {
        from: this.state,
        to: newState,
        reason: `invalid_transition_forced: ${reason}`,
      });
    }

    const from = this.state;
    this.state = newState;

    this.deps.telemetry.log('state_transition', {
      stateTransition: { from, to: newState },
      reason,
    });

    // Réinitialiser le mode réflexe renforcé si on quitte REFLEX
    if (newState !== CortexState.REFLEX_OBSERVATION) {
      this.reinforcedReflexMode = false;
    }

    // Désactiver le mode défensif si on sort de DEFENSIVE_MODE
    if (from === CortexState.DEFENSIVE_MODE && newState !== CortexState.DEFENSIVE_MODE) {
      this.deps.adversarial.deactivateDefensiveMode();
      this.deps.telemetry.log('defensive_mode_deactivated');
    }
  }

  // ─── Recovery ─────────────────────────────────────────────────────

  private scheduleRecoveryCheck(): void {
    if (this.recoveryCheckTimer) {
      clearInterval(this.recoveryCheckTimer);
    }

    this.recoveryCheckTimer = setInterval(async () => {
      const budget = this.deps.guard.checkBudget();

      if (
        budget.thermalState !== 'critical' &&
        budget.backpressureLevel !== 'emergency'
      ) {
        this.transitionTo(CortexState.GRADUAL_RECOVERY, 'resources_recovering');
        await this.deps.telemetry.log('recovery_started');

        // Phase 1 : Réflexe uniquement
        await this.waitStable(RECOVERY_PHASE1_MS);

        // Vérifier que les ressources sont toujours OK
        const checkBudget = this.deps.guard.checkBudget();
        if (checkBudget.thermalState === 'critical') {
          this.transitionTo(CortexState.COGNITIVE_HIBERNATION, 'recovery_failed');
          return;
        }

        // Phase 2 : Retour normal
        await this.waitStable(RECOVERY_PHASE2_MS);

        this.transitionTo(CortexState.REFLEX_OBSERVATION, 'recovery_complete');
        await this.deps.telemetry.log('recovery_completed');

        if (this.recoveryCheckTimer) {
          clearInterval(this.recoveryCheckTimer);
          this.recoveryCheckTimer = null;
        }

        // Drainer la queue accumulée
        await this.drainQueue();
      }
    }, RECOVERY_CHECK_INTERVAL_MS);
  }

  private waitStable(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── Historique par tab ───────────────────────────────────────────

  private trackRecentSignal(signal: CortexSignal): void {
    const tabSignals = this.recentSignalsByTab.get(signal.tabId) || [];
    tabSignals.push(signal);
    if (tabSignals.length > this.MAX_RECENT_SIGNALS_PER_TAB) {
      tabSignals.shift();
    }
    this.recentSignalsByTab.set(signal.tabId, tabSignals);
  }

  private getRecentSignals(tabId: number): CortexSignal[] {
    return this.recentSignalsByTab.get(tabId) || [];
  }

  // ─── API publique ─────────────────────────────────────────────────

  getState(): CortexState {
    return this.state;
  }

  async getMetrics(): Promise<CortexMetrics> {
    const metrics = await this.deps.telemetry.getAggregatedMetrics();
    const signatureStats = await this.deps.ragStore.getSignatureCount();
    return { ...metrics, signatureStats };
  }

  isReinforcedReflex(): boolean {
    return this.reinforcedReflexMode;
  }

  async shutdown(): Promise<void> {
    if (this.recoveryCheckTimer) {
      clearInterval(this.recoveryCheckTimer);
      this.recoveryCheckTimer = null;
    }
    if (this.calibrationTimer) {
      clearInterval(this.calibrationTimer);
      this.calibrationTimer = null;
    }

    this.deps.ragLifecycle.stopPeriodicReview();
    await this.deps.oracleModel.shutdown();
    await this.deps.telemetry.forceFlush();

    // Sauvegarder les poids adaptatifs du DraftModel
    const weights = this.deps.draftModel.serializeWeights();
    await this.deps.telemetry.log('state_transition', {
      stateTransition: { from: this.state, to: CortexState.IDLE },
      reason: 'shutdown',
      draftWeights: weights,
    });

    this.state = CortexState.IDLE;
  }
}
