/**
 * CortexBootstrap — Initialisation et câblage du Cortex Engine
 *
 * Crée et connecte tous les sous-systèmes du Cortex Engine,
 * puis les branche sur le MessageBus existant.
 */

import { MessageType } from '@shared/messaging/MessageBus';
import { CortexOrchestrator, CortexOrchestratorDeps } from './CortexOrchestrator';
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
import { CortexSignal } from './CortexTypes';

// Type structural minimal : accepte aussi bien le MessageBus de core que
// celui de shared (le Cortex n'utilise que .on pour l'abonnement CORTEX_SIGNAL).
interface CortexMessageBusLike {
  on(type: MessageType, handler: (msg: unknown) => void | Promise<void>): void;
}

interface CortexBootstrapDeps {
  messageBus: CortexMessageBusLike;
  securityManager: { encryptSensitiveData(data: unknown): Promise<string> };
  storage: { store(key: string, data: unknown): Promise<void>; retrieve(key: string): Promise<unknown> };
  metricsProvider: { getCPUUsage(): Promise<number>; getMemoryUsage(): Promise<number> };
  backpressure: { getLevel(): string };
}

export class CortexBootstrap {
  private orchestrator: CortexOrchestrator | null = null;
  private ragStore: ActiveRAGStore | null = null;
  private draftModel: DraftModel | null = null;
  private ragLifecycle: RAGLifecycleController | null = null;

  async initialize(deps: CortexBootstrapDeps): Promise<CortexOrchestrator> {
    // 1. Couche données
    const ragStore = new ActiveRAGStore();
    await ragStore.initialize();
    this.ragStore = ragStore;

    const telemetry = new CognitiveTelemetry(deps.securityManager, deps.storage);

    // 2. Couche détection
    const adversarial = new AdversarialDefense();
    const anomalyScorer = new AnomalyScorer(ragStore, adversarial);

    // 3. Seuil et guards
    const thresholdEngine = new DynamicThresholdEngine();
    const guard = new VRAMThermalGuard(deps.metricsProvider, deps.backpressure);
    const reasoningGuard = new DeepReasoningGuard();

    // 4. Modèles
    const draftModel = new DraftModel();
    this.draftModel = draftModel;

    // Charger les poids adaptatifs sauvegardés
    try {
      const savedWeights = await deps.storage.retrieve('cortex_draft_weights');
      if (savedWeights && typeof savedWeights === 'object') {
        draftModel.loadWeights(savedWeights as Record<string, number>);
      }
    } catch {
      // Premier démarrage ou données corrompues — poids par défaut
    }

    const oracleModel = new OracleModel();

    // 5. Gouvernance
    const policyEngine = new PolicyEngine();
    const ragLifecycle = new RAGLifecycleController(ragStore, telemetry, adversarial);
    this.ragLifecycle = ragLifecycle;

    // 6. Orchestrateur
    const orchestratorDeps: CortexOrchestratorDeps = {
      thresholdEngine,
      draftModel,
      oracleModel,
      ragStore,
      ragLifecycle,
      guard,
      reasoningGuard,
      adversarial,
      telemetry,
      policyEngine,
      anomalyScorer,
    };

    this.orchestrator = new CortexOrchestrator(orchestratorDeps);
    await this.orchestrator.initialize();

    // 7. Brancher sur le MessageBus
    deps.messageBus.on(MessageType.CORTEX_SIGNAL, async (msg: unknown) => {
      const payload = (msg as { payload?: { signal?: CortexSignal } })?.payload;
      if (payload?.signal) {
        await this.orchestrator!.processSignal(payload.signal);
      }
    });

    // 8. Démarrer la revue périodique RAG
    ragLifecycle.startPeriodicReview();

    // 9. Log cold start
    const signatureCount = await ragStore.getSignatureCount();
    await telemetry.log('cold_start', {
      signatureCount,
      fallbackMode: ragStore.isFallbackMode(),
    });

    return this.orchestrator;
  }

  async shutdown(): Promise<void> {
    if (this.orchestrator) {
      // Sauvegarder les poids du DraftModel avant l'arrêt
      await this.orchestrator.shutdown();
    }
    if (this.ragStore) {
      this.ragStore.destroy();
    }
  }

  getOrchestrator(): CortexOrchestrator | null {
    return this.orchestrator;
  }
}
