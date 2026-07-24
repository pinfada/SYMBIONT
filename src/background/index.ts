// src/background/index.ts
// Point d'entrée Service Worker (Neural Core)
import { MessageBus } from '../core/messaging/MessageBus';
import { MessageType } from '../shared/messaging/MessageBus';
import { IndexedDBCoordinator } from '../core/storage/IndexedDBCoordinator';
import { StorageDebouncer } from '../core/storage/StorageDebouncer';
// import { NavigationObserver } from '../content/observers/NavigationObserver'; // Déplacé vers content script
import { OrganismMutation } from '../shared/types/organism';
import { InvitationService } from './services/InvitationService';
import { PatternDetector, SequenceEvent } from '../core/PatternDetector';
import { SecurityManager } from './SecurityManager';
import { OrganismFactory } from '../core/factories/OrganismFactory';
import { generateUUID } from '../shared/utils/uuid';
import { NetworkLatencyCollector } from './services/NetworkLatencyCollector';
import { MemoryFragmentCollector } from '@/core/dreams/MemoryFragmentCollector';

// --- Ajout des modules résilients ---
import { ResilientMessageBus } from '../communication/resilient-message-bus';
import { HybridStorageManager } from '../storage/hybrid-storage-manager';
import { BasicHealthMonitor } from '../monitoring/basic-health-monitor';
import { healthCheckManager } from '../shared/monitoring/HealthCheckManager';
import { bulkheadManager } from '../shared/patterns/BulkheadManager';

// --- Import du système de rituels ---
import { initializeRituals, RitualBootstrap } from '../core/rituals/RitualBootstrap';

// --- Import du Cortex (détection cognitive de menaces) ---
import { CortexBootstrap } from '../cortex/CortexBootstrap';
import type { CortexOrchestrator } from '../cortex/CortexOrchestrator';
import { createCortexSignalId } from '../cortex/CortexTypes';
import type { CortexSignal } from '../cortex/CortexTypes';
import RealMetricsService from '../core/services/RealMetricsService';
import { backpressureController } from '../core/metabolic/BackpressureController';

// --- Cœur d'apprentissage neuronal (Hebbien) ---
// On branche le cœur d'apprentissage (HebbieanLearningSystem + GeneticMutator)
// directement sur l'organisme canonique, plutôt que NeuralCoreEngine complet
// qui maintiendrait un organisme parallèle (échelle 0-1, memory bank propre) —
// ce qui rouvrirait la divergence d'état corrigée précédemment.
import { HebbieanLearningSystem } from '../neural/HebbieanLearningSystem';
import { GeneticMutator } from '../neural/GeneticMutator';
import type { BehaviorPattern } from '../shared/types/organism';

// --- Sommeil analytique (rêve cross-domain) ---
import { circadianCycle } from '../core/metabolic/CircadianCycle';
import type { DreamReport } from '../core/dreams/DreamProcessor';

// --- Instanciation des modules sociaux (Phase 3) ---
import { DistributedOrganismNetwork } from '../social/distributed-organism-network';
import { CollectiveIntelligence } from '../social/collective-intelligence';
import { SocialResilience } from '../social/social-resilience';
import { MysticalEvents } from '../social/mystical-events';

// --- Instanciation des modules résilients ---
import { SecureRandom } from '../shared/utils/secureRandom';
import { logger } from '@/shared/utils/secureLogger';
import type { OrganismState } from '@/shared/types/organism';
export const hybridStorage = new HybridStorageManager();
export const resilientBus = new ResilientMessageBus();
export const healthMonitor = new BasicHealthMonitor(async (msg) => {
  // Log des anomalies dans le stockage hybride
  await hybridStorage.store('symbiont_health_alert_' + Date.now(), { msg, timestamp: Date.now() });
});

// Utilitaires pour chrome.storage.local (asynchrone)
async function getStorage(key: string): Promise<unknown> {
  // Utilise le stockage hybride pour la récupération
  return await hybridStorage.retrieve(key);
}

async function setStorage(key: string, value: unknown): Promise<void> {
  // Utilise le stockage hybride pour la persistance
  await hybridStorage.store(key, value);

    }

// --- Singleton pour accès global à BackgroundService ---
let _backgroundServiceInstance: BackgroundService | null = null;

class BackgroundService {
  private messageBus: MessageBus;
  private storage: IndexedDBCoordinator | null = null;
  private debouncer: StorageDebouncer | null = null;
  // NavigationObserver déplacé vers content script
  // private _navigationObserver: NavigationObserver;
  public organism: OrganismState | null = null;
  private invitationService: InvitationService | null = null;
  private activated: boolean = false;
  private events: SequenceEvent[] = [];
  private collectiveThresholds = [10, 50, 100, 250, 500];
  private reachedThresholds: number[] = [];
  private security: SecurityManager = new SecurityManager();
  private _organismFactory: OrganismFactory;
  private initialized: boolean = false;
  private networkLatencyCollector: NetworkLatencyCollector;
  private ritualBootstrap: RitualBootstrap | null = null;
  private cortex: CortexBootstrap | null = null;
  private cortexOrchestrator: CortexOrchestrator | null = null;
  private hebbian: HebbieanLearningSystem = new HebbieanLearningSystem();
  private geneticMutator: GeneticMutator = new GeneticMutator();
  private circadianStarted: boolean = false;
  // Système nerveux : le NeuralMesh traduit la perception en état ressenti
  private neuralLastApplied: number = 0;
  private readonly NEURAL_APPLY_INTERVAL = 8000; // min 8 s entre deux réponses neuronales
  private environmentalHostility: number = 0;    // 0..1, monté par les menaces, décroît
  private attentionLastApplied: number = 0;      // throttle de l'effet attentionnel
  private readonly ATTENTION_APPLY_INTERVAL = 10000; // min 10 s entre deux effets
  // Clusters d'infrastructure invisible perçus (id → domaines + impact + dernier chuchotement)
  private shadowClusters: Map<string, { domains: string[]; impact: number; confidence: number; lastWhisper: number }> = new Map();
  private notifiedClusters: Set<string> = new Set();
  private readonly SHADOW_HIGH_IMPACT = 0.66;   // seuil de notification système
  private readonly WHISPER_COOLDOWN = 6 * 60 * 60 * 1000; // 6h par cluster
  private threatWhisperCooldown: Map<string, number> = new Map();
  private readonly THREAT_WHISPER_COOLDOWN = 30 * 60 * 1000; // 30 min par domaine+type

  constructor() {
    this.messageBus = new MessageBus('background');
    this._organismFactory = new OrganismFactory();
    this.networkLatencyCollector = new NetworkLatencyCollector();
    // N'initialise PAS immédiatement - attendre le premier message
    logger.info('[BackgroundService] Instance créée - en attente d\'initialisation');
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    logger.info('[BackgroundService] Démarrage de l\'initialisation lazy');

    // Récupère les seuils déjà atteints (persistance locale)
    const saved = await getStorage('symbiont_collective_thresholds');
    this.reachedThresholds = saved ? JSON.parse(saved as string) : [];

    await this.initialize();
    this.initialized = true;
  }

  private async initialize(): Promise<void> {
    let storageInitialized = false;
    try {
      // Initialize storage with IndexedDBCoordinator (singleton, thread-safe)
      logger.info('[BackgroundService] Initializing IndexedDBCoordinator...');
      try {
        this.storage = await IndexedDBCoordinator.getInstance();
        this.debouncer = StorageDebouncer.getInstance();
        await this.debouncer.setCoordinator(this.storage);

        // Créer le service d'invitation APRÈS que le storage soit initialisé
        this.invitationService = new InvitationService(this.storage as any);

        storageInitialized = true;
        logger.info('[BackgroundService] Storage and debouncer initialized successfully');
      } catch (storageError) {
        // Log detailed error information for debugging
        const errorDetails = {
          errorType: storageError instanceof Error ? storageError.constructor.name : typeof storageError,
          errorMessage: storageError instanceof Error ? storageError.message : String(storageError),
          errorStack: storageError instanceof Error ? storageError.stack : undefined,
          timestamp: Date.now()
        };

        logger.error('CRITICAL: Storage initialization failed, entering degraded mode', errorDetails);

        // Try to store the error in hybrid storage for later review
        try {
          await hybridStorage.store('symbiont_init_error_' + Date.now(), errorDetails);
        } catch (hybridError) {
          logger.error('Failed to log error to hybrid storage:', hybridError);
        }

        // Alert user via notification if possible
        if (typeof chrome !== 'undefined' && chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'SYMBIONT Storage Error',
            message: 'Failed to initialize storage. Running in limited mode.',
            priority: 2
          });
        }

        // Continue without storage - degraded mode
        this.organism = null;
        storageInitialized = false;
        // IMPORTANT: Don't setup message handlers until we're sure about storage state
        // They will be set up after this block
      }

      // Vérifier l'état d'activation (stocké en localStorage ou IndexedDB si besoin)
      this.activated = (await getStorage('symbiont_activated')) === 'true';

      // Load or create organism UNIQUEMENT si activé ET si storage initialized
      if (this.activated && storageInitialized) {
        try {
          logger.info('Loading organism from storage...');
          this.organism = await this.storage!.getOrganism();

          if (!this.organism) {
            logger.info('No organism found, creating new one...');
            this.organism = this.createNewOrganism();
            await this.debouncer!.saveOrganism(this.organism);
            logger.info('New organism created and saved');
          } else {
            logger.info('Organism loaded successfully', { id: this.organism.id });
          }
        } catch (organismError) {
          logger.error('Failed to load/create organism:', organismError);
          // Try to create a new organism in memory without saving
          this.organism = this.createNewOrganism();
          logger.warn('Created organism in memory only (storage unavailable)');
        }
      } else if (this.activated && !storageInitialized) {
        // Activated but storage failed - create in-memory organism
        this.organism = this.createNewOrganism();
        logger.warn('Storage unavailable - organism created in memory only');
      } else {
        this.organism = null;
        logger.info('Symbiont not activated, skipping organism creation');
      }

      // Setup message handlers - ALWAYS do this, but they will have defensive checks
      this.setupMessageHandlers(storageInitialized);

      // Start periodic tasks
      this.startPeriodicTasks(storageInitialized);

      // Démarrer la collecte de latence réseau avec callback vers NeuralMesh
      this.networkLatencyCollector.start(async (latency) => {
        try {
          const neuralMesh = await this._organismFactory.getNeuralMesh();
          if (neuralMesh && typeof neuralMesh.feedNetworkLatency === 'function') {
            neuralMesh.feedNetworkLatency(latency);
          }
        } catch (error) {
          logger.error('[Background] Failed to feed network latency to NeuralMesh:', error);
        }
      });

      // Démarrer les health checks automatiques
      healthCheckManager.start();

      // Démarrer le Cortex (détection de menaces) — non bloquant
      void this.startCortex();

      // Démarrer le sommeil analytique (rêve cross-domain) — non bloquant
      void this.startCircadianDreams();

      // Initialiser le système de rituels SI l'organisme est actif
      if (this.activated && this.organism) {
        try {
          logger.info('[BackgroundService] Initializing ritual system...');
          this.ritualBootstrap = await initializeRituals();
          logger.info('[BackgroundService] Ritual system initialized successfully');
        } catch (ritualError) {
          logger.error('[BackgroundService] Failed to initialize rituals:', ritualError);
          // Non critique - continuer sans rituels
        }
      }

      logger.info('Background service initialized', {
        healthCheckActive: true,
        bulkheadManagerActive: true,
        organismLoaded: !!this.organism,
        activated: this.activated,
        ritualsActive: !!this.ritualBootstrap
      });
    } catch (error) {
      logger.error('Failed to initialize background service:', error);
      // Ensure message handlers are set up even if initialization fails
      try {
        this.setupMessageHandlers();
      } catch (handlerError) {
        logger.error('Failed to setup message handlers:', handlerError);
      }
    }
  }

  /**
   * Démarre le cycle circadien et le sommeil analytique. C'est ce qui manquait
   * pour que la synthèse onirique (vectorisation 32D → corrélation cross-domain
   * → entités d'ombre) tourne réellement : les fragments sont collectés depuis
   * le handler DOM_RESONANCE, mais rien n'appelait circadianCycle.start().
   */
  private async startCircadianDreams(): Promise<void> {
    if (this.circadianStarted) return;
    try {
      await circadianCycle.start();
      this.circadianStarted = true;

      // Charger la mémoire des clusters déjà notifiés (pas de re-notification)
      try {
        const saved = await getStorage('symbiont_notified_clusters');
        if (Array.isArray(saved)) this.notifiedClusters = new Set(saved as string[]);
      } catch { /* premier démarrage */ }

      // Réveil Lucide : à chaque synthèse, diffuser le rapport ET décider,
      // de façon autonome, s'il faut alerter l'utilisateur (sans qu'il agisse).
      circadianCycle.onDreamReport((report: DreamReport) => {
        void resilientBus.send({ type: MessageType.DREAM_REPORT, payload: report });
        void this.handleShadowPerception(report);
      });

      logger.info('[BackgroundService] Circadian dream cycle started');
    } catch (error) {
      logger.error('[BackgroundService] Circadian dream cycle failed to start (non-critical):', error);
    }
  }

  /**
   * Démarre le Cortex (détection cognitive de menaces). Non bloquant et
   * défensif : c'est un sous-système auxiliaire, son échec ne doit pas
   * empêcher le fonctionnement de l'organisme. L'Oracle tourne en fallback
   * main-thread (un service worker MV3 ne peut pas créer de Worker imbriqué).
   */
  private async startCortex(): Promise<void> {
    if (this.cortex) return;
    try {
      const cortex = new CortexBootstrap();
      this.cortexOrchestrator = await cortex.initialize({
        messageBus: this.messageBus,
        securityManager: this.security,
        storage: { store: setStorage, retrieve: getStorage },
        metricsProvider: RealMetricsService.getInstance(),
        backpressure: backpressureController
      });
      this.cortex = cortex;
      logger.info('[BackgroundService] Cortex engine started');
    } catch (error) {
      logger.error('[BackgroundService] Cortex failed to start (non-critical):', error);
    }
  }

  /**
   * Traite un rapport de synthèse onirique : met à jour la carte des clusters
   * d'infrastructure invisible perçus, et — de façon autonome — notifie
   * l'utilisateur UNIQUEMENT pour une découverte nouvelle à fort impact.
   * L'utilisateur n'a rien à faire : le symbiont décide seul quand parler.
   */
  private async handleShadowPerception(report: DreamReport): Promise<void> {
    if (!report?.shadowEntities?.length) return;

    for (const entity of report.shadowEntities) {
      const existing = this.shadowClusters.get(entity.id);
      this.shadowClusters.set(entity.id, {
        domains: entity.domains || [],
        impact: entity.impact,
        confidence: entity.confidence,
        lastWhisper: existing?.lastWhisper ?? 0
      });

      // Notification système : rare, réservée aux découvertes NOUVELLES à fort
      // impact, et dédupliquée à vie par cluster (jamais deux fois le même).
      const isNew = !this.notifiedClusters.has(entity.id);
      const strong = entity.impact >= this.SHADOW_HIGH_IMPACT && entity.confidence >= 0.7;
      if (isNew && strong && (entity.domains?.length || 0) >= 2) {
        this.notifiedClusters.add(entity.id);
        try {
          await setStorage('symbiont_notified_clusters', Array.from(this.notifiedClusters));
        } catch { /* best-effort */ }

        if (typeof chrome !== 'undefined' && chrome.notifications?.create) {
          chrome.notifications.create(`symbiont_shadow_${entity.id}`, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
            title: 'SYMBIONT · structure invisible perçue',
            message: `${entity.domains.length} sites que tu as croisés partagent la même infrastructure de surveillance cachée.`,
            priority: 1
          });
        }
        logger.info('[BackgroundService] Shadow infrastructure surfaced to user', {
          domains: entity.domains.length,
          impact: entity.impact
        });
      }
    }
  }

  /**
   * Si le domaine courant appartient à un cluster d'ombre perçu, le symbiont
   * chuchote dans la page — au moment où c'est pertinent — sans bouton ni
   * ouverture du popup. Cooldown par cluster pour ne jamais polluer.
   */
  private maybeWhisperShadow(domain: string): void {
    if (!domain) return;
    const now = Date.now();

    for (const cluster of this.shadowClusters.values()) {
      if (!cluster.domains.includes(domain)) continue;
      if (now - cluster.lastWhisper < this.WHISPER_COOLDOWN) return;

      cluster.lastWhisper = now;
      const others = Math.max(0, cluster.domains.length - 1);
      const text = others > 0
        ? `Ce site partage une infrastructure invisible avec ${others} autre${others > 1 ? 's' : ''} que tu as croisé${others > 1 ? 's' : ''}.`
        : `Ce site porte une signature de surveillance que j'ai déjà perçue ailleurs.`;

      // Envoi vers le content script du (des) onglet(s) concerné(s) ; le content
      // n'affiche que si le domaine correspond réellement à la page.
      void this.messageBus.send({
        type: MessageType.WHISPER,
        payload: { text, domain, severity: cluster.impact >= this.SHADOW_HIGH_IMPACT ? 'high' : 'normal' }
      });
      return;
    }
  }

  /**
   * Traite un signal de menace observé par le content (script injecté,
   * obfuscation, iframe caché, fingerprinting, réseau tiers). Il est soumis
   * au Cortex (source réelle enfin fournie) et, s'il est fort et immédiat,
   * chuchoté à l'utilisateur sur la page concernée.
   */
  private async handleThreatSignal(payload: any): Promise<void> {
    const source = payload.source as string;
    const metadata = (payload.metadata || {}) as Record<string, unknown>;
    let domain = '';
    let urlHash = '';
    try {
      domain = new URL(payload.url).hostname;
      urlHash = await this.security.hash(domain);
    } catch { /* url absente */ }

    // 1) Alimenter le Cortex avec un vrai CortexSignal (source + métadonnées)
    if (this.cortexOrchestrator) {
      const signal: CortexSignal = {
        id: createCortexSignalId(),
        timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
        source: (['dom_mutation', 'script_injection', 'network_request', 'behavior_anomaly', 'css_fingerprint', 'webrtc_probe'].includes(source)
          ? source
          : 'behavior_anomaly') as CortexSignal['source'],
        tabId: typeof payload.tabId === 'number' ? payload.tabId : -1,
        payload: { type: 'threat_observation', urlHash, metadata },
        resonanceSnapshot: { level: 0, state: 'normal', shadowMutationRatio: 0, jitter: 0 }
      };
      try {
        await this.cortexOrchestrator.processSignal(signal);
      } catch (error) {
        logger.error('[BackgroundService] Cortex processSignal (threat) failed:', error);
      }
    }

    // 2) Décider si c'est une menace FORTE à signaler tout de suite à l'utilisateur.
    // Seuils conservateurs pour éviter les faux positifs (beaucoup de sites ont
    // des scripts tiers ; on ne parle que pour l'obfuscation, l'eval, les
    // iframes cachés tiers et le fingerprinting avéré).
    const whisper = this.threatWhisperMessage(metadata);
    if (whisper && domain) {
      // La menace forte élève l'hostilité environnementale ressentie : la
      // prochaine propagation neuronale entrera avec un memory_input élevé et
      // l'organisme se durcira réellement (résilience/focus). Décroît ensuite.
      const bump = whisper.severity === 'high' ? 0.5 : 0.3;
      this.environmentalHostility = Math.min(1, this.environmentalHostility + bump);
      const key = `${domain}|${whisper.category}`;
      const now = Date.now();
      if (now - (this.threatWhisperCooldown.get(key) || 0) >= this.THREAT_WHISPER_COOLDOWN) {
        this.threatWhisperCooldown.set(key, now);
        void this.messageBus.send({
          type: MessageType.WHISPER,
          payload: { text: whisper.text, domain, severity: whisper.severity }
        });
      }
    }
  }

  /**
   * Exploite un signal d'attention (métriques scalaires uniquement, jamais de
   * contenu). Le climat attentionnel devient une force d'évolution réelle :
   *  - engagement profond / flux de lecture → environnement riche et apaisé :
   *    l'organisme s'ouvre (focus + curiosité), l'hostilité ressentie décroît ;
   *  - distraction / multitâche → agitation : légère érosion du focus, hausse
   *    de l'hostilité ressentie qui nourrira la prochaine propagation du
   *    NeuralMesh (l'organisme « sent » l'agitation).
   * Effet borné dans le temps (anti-bruit) ; l'inactivité (idle) est laissée au
   * cycle circadien / rêve, pas traitée ici.
   */
  private handleAttentionEvent(payload: {
    type: string;
    metrics?: { focusLevel?: number; multitaskingScore?: number; engagementPattern?: string };
  }): void {
    if (!this.organism) return;

    const kind = payload.type;
    const pattern = payload.metrics?.engagementPattern;
    const focusLevel = typeof payload.metrics?.focusLevel === 'number' ? payload.metrics.focusLevel : undefined;
    const multitasking = typeof payload.metrics?.multitaskingScore === 'number' ? payload.metrics.multitaskingScore : 0;

    // Enregistrement d'un marqueur d'événement SANS contenu (type + horodatage)
    this.events.push({ type: `attention:${kind}`, timestamp: Date.now() });

    const isEngaged = kind === 'deep_focus' || kind === 'reading_flow' ||
      pattern === 'deep' || pattern === 'focused' ||
      (focusLevel !== undefined && focusLevel > 0.7);
    const isDistracted = kind === 'distraction' ||
      pattern === 'distracted' || pattern === 'scanning' ||
      multitasking > 0.6 ||
      (focusLevel !== undefined && focusLevel < 0.3);

    // Modulation de l'hostilité ressentie → entrée mémoire du NeuralMesh
    if (isEngaged) {
      this.environmentalHostility = Math.max(0, this.environmentalHostility * 0.8);
    } else if (isDistracted) {
      this.environmentalHostility = Math.min(1, this.environmentalHostility + 0.12);
    }

    // Effet sur les traits borné dans le temps (anti-bruit)
    const now = Date.now();
    if (now - this.attentionLastApplied < this.ATTENTION_APPLY_INTERVAL) return;
    if (!isEngaged && !isDistracted) return;
    this.attentionLastApplied = now;

    const traits = this.organism.traits as Record<string, number>;
    const nudge = (trait: string, delta: number) => {
      if (typeof traits[trait] === 'number') {
        traits[trait] = Math.max(0, Math.min(100, traits[trait] + delta));
      }
    };
    if (isEngaged) {
      nudge('focus', 0.5);
      nudge('curiosity', 0.3);
      const prev = this.organism.consciousness ?? 0.5;
      this.organism.consciousness = Math.max(0, Math.min(1, prev + (1 - prev) * 0.03));
    } else {
      nudge('focus', -0.4);
      nudge('adaptability', 0.3); // s'adapter à un environnement fragmenté
    }

    this.organism.lastMutation = now;
    if (this.isStorageReady()) {
      void this.debouncer!.saveOrganism(this.organism);
    }
    void resilientBus.send({
      type: MessageType.ORGANISM_UPDATE,
      payload: { state: this.organism, mutations: [] }
    });
  }

  /**
   * Traduit des métadonnées de menace en message utilisateur — uniquement pour
   * les signaux forts et concrets. Retourne null si rien ne mérite d'alerter.
   */
  private threatWhisperMessage(m: Record<string, unknown>): { text: string; category: string; severity: string } | null {
    // Canvas : on ne chuchote que pour un petit canvas (signature typique du
    // fingerprinting) ; les gros canvas sont probablement des usages légitimes.
    if (m.canvasRead && m.canvasSmall) {
      return { text: "Ce site lit une empreinte de ton navigateur (canvas) pour t'identifier de façon persistante.", category: 'fingerprint', severity: 'high' };
    }
    if (m.audioFingerprint) {
      return { text: "Ce site sonde ton moteur audio pour t'identifier (fingerprinting).", category: 'fingerprint', severity: 'high' };
    }
    if (m.webglProbe) {
      return { text: "Ce site interroge ta carte graphique pour t'identifier (fingerprinting WebGL).", category: 'fingerprint', severity: 'normal' };
    }
    if (typeof m.obfuscationDepth === 'number' && m.obfuscationDepth >= 2) {
      return { text: "Un script fortement obfusqué s'exécute sur cette page — prudence.", category: 'obfuscation', severity: 'high' };
    }
    if (m.hasEval) {
      return { text: "Un script de cette page exécute du code généré dynamiquement (eval).", category: 'eval', severity: 'normal' };
    }
    if (m.hiddenIframe && m.isThirdParty) {
      return { text: "Un cadre invisible d'un tiers est chargé en arrière-plan sur ce site.", category: 'hidden_iframe', severity: 'normal' };
    }
    return null;
  }

  /**
   * Système nerveux de l'organisme : fait passer la perception réelle par le
   * NeuralMesh (stimulation des entrées sensorielles/mémoire → propagation →
   * sorties motrice/émotionnelle), puis TRADUIT la sortie en état ressenti et
   * en pression d'évolution. C'est ce qui donne au réseau un rôle causal réel
   * plutôt qu'un simple calcul lu pour l'affichage.
   *
   * @param sensory  Hostilité/intensité perçue de l'environnement (0..1)
   * @returns métriques neuronales pour l'affichage, ou null si throttlé/indispo
   */
  private async applyNeuralResponse(sensory: number): Promise<{ emotion: number; motor: number; activity: number } | null> {
    if (!this.organism) return null;

    let mesh: any;
    try {
      mesh = await this._organismFactory.getNeuralMesh();
    } catch {
      return null;
    }
    if (!mesh || typeof mesh.processPattern !== 'function') return null;

    const now = Date.now();
    const throttled = now - this.neuralLastApplied < this.NEURAL_APPLY_INTERVAL;

    // Entrée mémoire : pression accumulée (hostilité environnementale récente)
    const memory = Math.max(0, Math.min(1, this.environmentalHostility));
    const clampedSensory = Math.max(0, Math.min(1, sensory));

    // Propagation neuronale sur des valeurs RÉELLES
    let emotion = 0;
    let motor = 0;
    try {
      const out = await mesh.processPattern({ sensory_input: clampedSensory, memory_input: memory }) as Record<string, number>;
      emotion = typeof out?.emotion_output === 'number' ? out.emotion_output : 0;
      motor = typeof out?.motor_output === 'number' ? out.motor_output : 0;
      // Renforcement : le réseau « apprend » de l'intensité perçue
      if (typeof mesh.learn === 'function') {
        await mesh.learn({ feedback: clampedSensory });
      }
    } catch {
      return null;
    }
    const activity = typeof mesh.getNeuralActivity === 'function' ? mesh.getNeuralActivity() : 0;

    // Décroissance de l'hostilité (l'organisme se calme avec le temps)
    this.environmentalHostility = memory * 0.9;

    // On n'applique l'effet sur l'organisme qu'à intervalle borné (anti-bruit)
    if (throttled) {
      return { emotion, motor, activity };
    }
    this.neuralLastApplied = now;

    // 1) La sortie émotionnelle tire la conscience vers elle (lentement)
    const prevConsciousness = this.organism.consciousness ?? 0.5;
    const consciousness = Math.max(0, Math.min(1, prevConsciousness + (emotion - prevConsciousness) * 0.08));
    this.organism.consciousness = consciousness;

    // 2) Pression d'évolution des traits selon l'état ressenti (échelle 0..100)
    const traits = this.organism.traits as Record<string, number>;
    const nudge = (trait: string, delta: number) => {
      if (typeof traits[trait] === 'number') {
        traits[trait] = Math.max(0, Math.min(100, traits[trait] + delta));
      }
    };
    if (clampedSensory > 0.6 || memory > 0.6) {
      // Environnement hostile → l'organisme se durcit
      nudge('resilience', 0.6);
      nudge('focus', 0.4);
    } else if (clampedSensory < 0.3 && memory < 0.3) {
      // Environnement calme → il s'ouvre
      nudge('curiosity', 0.4);
      nudge('creativity', 0.3);
    }

    // 3) Persister + diffuser l'état ressenti
    this.organism.lastMutation = now;
    if (this.isStorageReady()) {
      try { await this.debouncer!.saveOrganism(this.organism); } catch { /* best-effort */ }
    }
    await resilientBus.send({
      type: MessageType.ORGANISM_UPDATE,
      payload: { state: this.organism, mutations: [] }
    });

    return { emotion, motor, activity };
  }

  /**
   * Construit un CortexSignal à partir d'un événement de résonance DOM réel
   * et le soumet à l'orchestrateur pour analyse (draft → oracle).
   */
  private async feedCortexResonance(payload: any): Promise<void> {
    if (!this.cortexOrchestrator) return;
    try {
      const totalMutations = payload?.metrics?.totalMutations ?? 0;
      const shadowMutations = payload?.metrics?.shadowMutations ?? 0;
      const stateLevel = payload?.state?.level;
      const validStates = ['quiet', 'normal', 'active', 'critical'];

      let urlHash = '';
      try {
        if (payload?.url) urlHash = await this.security.hash(new URL(payload.url).hostname);
      } catch { /* url absente/invalide : urlHash reste vide */ }

      const signal: CortexSignal = {
        id: createCortexSignalId(),
        timestamp: payload?.timestamps?.detected ?? Date.now(),
        source: 'dom_mutation',
        tabId: typeof payload?.tabId === 'number' ? payload.tabId : -1,
        payload: {
          type: 'dom_resonance',
          mutationCount: totalMutations,
          urlHash,
          metadata: {
            shadowActivity: payload?.shadowActivity ?? 0,
            jitter: payload?.jitter ?? 0
          }
        },
        resonanceSnapshot: {
          level: payload?.resonance ?? 0,
          state: validStates.includes(stateLevel) ? stateLevel : 'normal',
          shadowMutationRatio: totalMutations > 0 ? shadowMutations / totalMutations : 0,
          jitter: payload?.metrics?.averageJitter ?? payload?.jitter ?? 0
        }
      };

      await this.cortexOrchestrator.processSignal(signal);
    } catch (error) {
      logger.error('[BackgroundService] feedCortexResonance failed:', error);
    }
  }

  /**
   * Garantit la présence d'un organisme en mémoire : le charge depuis le
   * stockage s'il existe, sinon en crée un nouveau et le persiste.
   * Idempotent — ne fait rien si l'organisme est déjà chargé.
   */
  private async ensureOrganism(): Promise<void> {
    if (this.organism) return;

    if (this.isStorageReady()) {
      try {
        this.organism = await this.storage!.getOrganism();
      } catch (error) {
        logger.error('[BackgroundService] ensureOrganism: load failed', error);
      }
    }

    if (!this.organism) {
      this.organism = this.createNewOrganism();
      if (this.isStorageReady()) {
        try {
          await this.debouncer!.saveOrganism(this.organism);
        } catch (error) {
          logger.error('[BackgroundService] ensureOrganism: save failed', error);
        }
      }
    }
  }

  private createNewOrganism(): OrganismState {
    const visualDNA = this.generateVisualDNA();
    return {
      id: generateUUID(),
      generation: 1,
      health: 100,
      energy: 100,
      traits: {
        curiosity: SecureRandom.random() * 100,
        focus: SecureRandom.random() * 100,
        rhythm: SecureRandom.random() * 100,
        empathy: SecureRandom.random() * 100,
        creativity: SecureRandom.random() * 100,
        resilience: SecureRandom.random() * 100,
        adaptability: SecureRandom.random() * 100,
        memory: SecureRandom.random() * 100,
        intuition: SecureRandom.random() * 100,
      },
      visualDNA,
      lastMutation: Date.now(),
      mutations: [],
      createdAt: Date.now(),
      dna: visualDNA,
      birthTime: Date.now(),
      socialConnections: [],
      memoryFragments: []
    };
  }

  private generateVisualDNA(): string {
    // Generate a unique visual DNA string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(SecureRandom.random() * chars.length));
    
    }
    return result;
  }

  private isStorageReady(): boolean {
    // Check if storage coordinator has been initialized
    return this.storage !== null && this.debouncer !== null;
  }

  private setupMessageHandlers(_storageInitialized: boolean = false): void {
    // Handle GET_ORGANISM request from popup
    this.messageBus.on(MessageType.GET_ORGANISM, async (_message: MessageEvent | unknown) => {
      logger.info('[BackgroundService] GET_ORGANISM request received');

      // Si l'organisme existe, l'envoyer immédiatement
      if (this.organism) {
        await resilientBus.send({
          type: MessageType.ORGANISM_UPDATE,
          payload: {
            state: this.organism,
            mutations: this.isStorageReady() ? await this.storage!.getRecentMutations(5) : []
          }
        });
        logger.info('[BackgroundService] Organism sent to popup');
      } else {
        // Si pas d'organisme, essayer de le charger ou le créer
        logger.info('[BackgroundService] No organism available, attempting to create one');

        if (this.isStorageReady()) {
          try {
            // Essayer de charger depuis le storage
            this.organism = await this.storage!.getOrganism();

            if (!this.organism) {
              // Créer un nouvel organisme
              this.organism = this.createNewOrganism();
              await this.debouncer!.saveOrganism(this.organism);
              logger.info('[BackgroundService] New organism created on GET_ORGANISM request');
            }

            // Envoyer l'organisme
            await resilientBus.send({
              type: MessageType.ORGANISM_UPDATE,
              payload: {
                state: this.organism,
                mutations: []
              }
            });
          } catch (error) {
            logger.error('[BackgroundService] Failed to handle GET_ORGANISM:', error);

            // Créer un organisme en mémoire comme fallback
            this.organism = this.createNewOrganism();
            await resilientBus.send({
              type: MessageType.ORGANISM_UPDATE,
              payload: {
                state: this.organism,
                mutations: []
              }
            });
          }
        } else {
          // Storage pas prêt, créer un organisme temporaire
          this.organism = this.createNewOrganism();
          await resilientBus.send({
            type: MessageType.ORGANISM_UPDATE,
            payload: {
              state: this.organism,
              mutations: []
            }
          });
          logger.warn('[BackgroundService] Sent temporary organism (storage not ready)');
        }
      }
    });

    // Handle organism mutations (rituels, échanges P2P, effets mystiques)
    this.messageBus.on(MessageType.ORGANISM_MUTATE, async (message: MessageEvent | unknown) => {
      const payload = (message as any)?.payload;
      const mutation = payload?.mutation;
      if (!mutation) return;

      // S'assurer qu'un organisme existe
      if (!this.organism && this.isStorageReady()) {
        this.organism = await this.storage!.getOrganism();
      }
      if (!this.organism) return;

      // Appliquer les valeurs de traits calculées par l'émetteur
      if (mutation.traits && typeof mutation.traits === 'object') {
        for (const [trait, value] of Object.entries(mutation.traits)) {
          if (
            typeof value === 'number' &&
            Number.isFinite(value) &&
            (this.organism.traits as Record<string, number>)[trait] !== undefined
          ) {
            (this.organism.traits as Record<string, number>)[trait] = value;
          }
        }
      }

      const record = {
        type: (['visual', 'behavioral', 'cognitive'].includes(mutation.type)
          ? mutation.type
          : 'behavioral') as 'visual' | 'behavioral' | 'cognitive',
        trigger: String(mutation.trigger || 'unknown'),
        magnitude: typeof mutation.magnitude === 'number' ? mutation.magnitude : 0.5,
        timestamp: typeof mutation.timestamp === 'number' ? mutation.timestamp : Date.now()
      };

      this.organism.mutations = [...(this.organism.mutations || []), record];
      this.organism.lastMutation = record.timestamp;

      // Persister puis diffuser le nouvel état
      if (this.isStorageReady()) {
        try {
          await this.storage!.addMutation(record);
          await this.debouncer!.saveOrganism(this.organism);
        } catch (error) {
          logger.error('[BackgroundService] Failed to persist mutation:', error);
        }
      }

      await resilientBus.send({
        type: MessageType.ORGANISM_UPDATE,
        payload: { state: this.organism, mutations: [] }
      });
      logger.info(`[BackgroundService] Mutation applied: ${record.trigger}`);
    });

    // Handle page visits
    this.messageBus.on(MessageType.PAGE_VISIT, async (message: MessageEvent | unknown) => {
      const { url, title } = (message as any).payload;

      // Update behavior data only if storage is ready
      if (this.isStorageReady()) {
        try {
          const behavior = await this.storage!.getBehavior(url) || {
            url,
            visitCount: 0,
            totalTime: 0,
            scrollDepth: 0,
            lastVisit: Date.now(),
            interactions: [],
          };

          behavior.visitCount++;
          behavior.lastVisit = Date.now();

          await this.storage!.saveBehavior(behavior);
        } catch (error) {
          logger.error('Failed to save behavior data:', error);
        }
      }

      // Enregistre l'événement dans l'historique
      this.events.push({ type: 'visit', timestamp: Date.now(), url });

      // S'assurer qu'un organisme existe pour recevoir l'évolution :
      // sinon la navigation resterait sans effet tant que le popup n'a pas
      // été ouvert. On charge depuis le stockage ou on en crée un.
      await this.ensureOrganism();

      // Perception au moment pertinent : si ce domaine appartient à une
      // infrastructure invisible déjà perçue, le symbiont chuchote dans la page.
      try {
        this.maybeWhisperShadow(new URL(url).hostname);
      } catch { /* url invalide */ }

      // Update organism based on behavior
      await this.updateOrganismTraits(url, title);
      this.analyzeContextualPatterns();
    });

    // Handle scroll events
    this.messageBus.on(MessageType.SCROLL_EVENT, async (message: MessageEvent | unknown) => {
      const { url, scrollDepth } = (message as any).payload;

      // Update scroll depth only if storage is ready
      if (this.isStorageReady()) {
        try {
          const behavior = await this.storage!.getBehavior(url);
          if (behavior) {
            behavior.scrollDepth = Math.max(behavior.scrollDepth, scrollDepth);
            await this.storage!.saveBehavior(behavior);
          }
        } catch (error) {
          logger.error('Failed to update scroll depth:', error);
        }
      }

      // Enregistre l'événement dans l'historique
      this.events.push({ type: 'scroll', timestamp: Date.now(), url });
      this.analyzeContextualPatterns();
    });

    // Handler pour interactions utilisateur (à brancher si non existant)
    this.messageBus.on(MessageType.INTERACTION_DETECTED, (message: MessageEvent | unknown) => {
      const { type, timestamp, target, data } = (message as any).payload;
      this.events.push({ type, timestamp, target, ...data });
      this.analyzeContextualPatterns();
    });

    // Signal d'attention (engagement / lecture / distraction) : le climat
    // attentionnel façonne réellement l'organisme (traits + hostilité ressentie
    // alimentant le NeuralMesh). Métriques scalaires uniquement, aucun contenu.
    this.messageBus.on(MessageType.ATTENTION_EVENT, (message: MessageEvent | unknown) => {
      const payload = (message as any)?.payload;
      if (payload?.type) this.handleAttentionEvent(payload);
    });

    // Signal de menace observé sur une page → alimente le Cortex ET, si la
    // menace est forte et immédiate, chuchote dans la page.
    this.messageBus.on(MessageType.THREAT_SIGNAL, async (message: MessageEvent | unknown) => {
      const payload = (message as any)?.payload;
      if (!payload?.source) return;
      await this.handleThreatSignal(payload);
    });

    // Réveil Lucide : le popup demande le dernier rapport de vigilance
    this.messageBus.on(MessageType.GET_DREAM_REPORT, async () => {
      const report = circadianCycle.getLastDreamReport();
      await resilientBus.send({
        type: MessageType.DREAM_REPORT,
        payload: report
      });
    });

    // Le popup demande de lancer une synthèse onirique immédiate (données réelles)
    this.messageBus.on(MessageType.RUN_DREAM_NOW, async () => {
      const report = await circadianCycle.runDreamSynthesisNow();
      // Si aucune synthèse n'a produit de rapport (pas assez de fragments),
      // renvoyer le dernier rapport connu pour informer le popup.
      await resilientBus.send({
        type: MessageType.DREAM_REPORT,
        payload: report ?? circadianCycle.getLastDreamReport()
      });
    });

    // Handler pour les signaux de résonance DOM détectés
    this.messageBus.on(MessageType.DOM_RESONANCE_DETECTED, async (message: MessageEvent | unknown) => {
      try {
        const {
          resonance,
          jitter,
          shadowActivity,
          metrics,
          timestamps,
          url
        } = (message as any).payload;

        // CORRECTION: Calcul correct de la latence avec timestamps absolus
        const receivedAt = Date.now();
        const transmissionLatency = timestamps?.emitted ?
          receivedAt - timestamps.emitted : // Latence en ms (temps absolus)
          null;

        // Latence totale depuis la détection
        const totalLatency = timestamps?.detected ?
          receivedAt - timestamps.detected :
          null;

        logger.info('[Background] DOM Resonance detected', {
          resonance,
          shadowActivity,
          metricsSnapshot: metrics,
          transmissionLatency: transmissionLatency ? `${transmissionLatency}ms` : 'unknown',
          totalLatency: totalLatency ? `${totalLatency}ms` : 'unknown',
          receivedAt: new Date(receivedAt).toISOString()
        });

        // NOUVEAU: Collecter le fragment mémoire pour l'analyse cross-domain
        const fragmentCollector = MemoryFragmentCollector.getInstance();
        const currentUrl = url || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.url || 'unknown';

        // Extraire le domaine de l'URL
        let domain = 'unknown';
        try {
          domain = new URL(currentUrl).hostname;
        } catch (e) {
          domain = currentUrl;
        }

        // Collecter les données de résonance DOM avec données réelles
        const mutations = [];
        // Extraire les mutations du payload si disponible
        if ((message as any).payload.mutations) {
          mutations.push(...(message as any).payload.mutations);
        }

        fragmentCollector.collectDOMResonance({
          domain,
          friction: jitter || resonance * 100, // Utiliser resonance si jitter absent
          mutations: mutations.length > 0 ? mutations : [
            { type: 'resonance', target: `level_${resonance}` }
          ],
          hiddenElements: metrics?.hiddenElements || [
            { type: 'shadow', count: shadowActivity }
          ],
          timestamps: timestamps || { detected: Date.now(), emitted: Date.now() }
        });

        // Système nerveux : la perception DOM réelle passe par le NeuralMesh,
        // dont la sortie agit CAUSALEMENT sur l'organisme (conscience, traits)
        // avant d'être relue pour l'affichage. Le réseau n'est plus un
        // cul-de-sac calculatoire lu seulement pour un champ d'UI.
        let neuralActivity = 0;
        let neuralResonanceSignal: string | null = null;
        if (this.organism) {
          const neuralMesh = await this._organismFactory.getNeuralMesh().catch(() => null);
          if (neuralMesh && jitter && typeof neuralMesh.feedDOMJitter === 'function') {
            // Nourrit l'analyseur de résonance interne (état/signal)
            neuralMesh.feedDOMJitter(jitter);
            const neuralState = neuralMesh.getResonanceState?.();
            neuralResonanceSignal = neuralState?.signal ?? null;
          }
          // Propagation causale sur l'intensité perçue (résonance normalisée)
          const neural = await this.applyNeuralResponse(
            typeof resonance === 'number' ? resonance : 0
          );
          neuralActivity = neural?.activity ?? neuralActivity;
        }

        // Soumettre l'événement au Cortex pour analyse de menace (draft → oracle)
        void this.feedCortexResonance((message as any).payload);

        // Notifier le popup de l'état de résonance
        await resilientBus.send({
          type: MessageType.RESONANCE_UPDATE,
          payload: {
            resonanceLevel: resonance,
            jitterAverage: metrics?.averageJitter || 0,
            shadowActivityCount: shadowActivity,
            neuralActivity,
            neuralResonanceSignal,
            timestamp: Date.now()
          }
        });

        // Si résonance critique, déclencher une mutation adaptative
        // CORRECTION: Utiliser le timestamp de détection original pour synchronisation
        const mutationTimestamp = timestamps?.detected || Date.now();

        if (resonance > 0.8 && this.organism) {
          logger.warn('[Background] Critical resonance detected, triggering adaptive mutation', {
            transmissionLatency: transmissionLatency ? `${transmissionLatency}ms` : 'unknown',
            totalLatency: totalLatency ? `${totalLatency}ms` : 'unknown',
            mutationTimestamp: new Date(mutationTimestamp).toISOString()
          });

          const mutation: OrganismMutation = {
            type: 'cognitive',
            trigger: 'resonance_adaptation',
            magnitude: resonance * 0.5,
            timestamp: mutationTimestamp // Utiliser le timestamp de détection original
          };
          this.applyMutation(mutation);

          if (this.isStorageReady()) {
            await this.storage!.addMutation(mutation);
          }

          // Déclenchement autonome des rituels de protection : on fournit le
          // contexte de perception RÉEL (métriques live + organisme canonique)
          // et chaque rituel décide seul via sa propre condition `canTrigger`
          // (cooldown/rate-limit inclus). Plus de gate grossier if/else, et le
          // contexte n'est plus reconstruit depuis un stockage périmé — le
          // déclenchement ne peut pas transiter par le bus partagé (no-op ici).
          if (this.ritualBootstrap && metrics && this.organism) {
            await this.ritualBootstrap.evaluateAutonomousTriggers({
              organism: this.organism,
              resonanceLevel: resonance,
              networkPressure: metrics.networkPressure ?? 0,
              domOppression: metrics.domOppression ?? shadowActivity / 100,
              frictionIndex: metrics.frictionIndex ?? jitter / 100,
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        logger.error('[Background] Failed to handle DOM resonance:', error);
      }
    });

    // Handler pour récupérer les métriques de santé système
    this.messageBus.on(MessageType.GET_HEALTH_METRICS, async (message: MessageEvent | unknown) => {
      try {
        const systemHealth = healthCheckManager.getSystemHealth();
        const bulkheadMetrics = bulkheadManager.getMetrics();
        
        const response = {
          systemHealth,
          bulkheadMetrics,
          timestamp: Date.now()
        };
        
        // Répondre au sender si possible
        if ((message as any).sender) {
          this.messageBus.emit(MessageType.HEALTH_METRICS_RESPONSE, {
            payload: response,
            requestId: (message as any).requestId
          });
        }
      } catch (error) {
        logger.error('Erreur récupération métriques santé:', error);
      }
    });

    // Invitation: génération
    this.messageBus.on(MessageType.GENERATE_INVITATION, async (message: MessageEvent | unknown) => {
      // Vérifier que le storage est initialisé avant d'utiliser le service d'invitation
      if (!this.isStorageReady()) {
        logger.warn('Storage not initialized, cannot generate invitation');
        await resilientBus.send({
          type: MessageType.INVITATION_GENERATED,
          payload: { error: 'Database not initialized' }
        });
        return;
      }

      try {
        const { donorId } = (message as any).payload;
        const rawInvitation = await this.invitationService!.generateInvitation(donorId);
        // Adaptation à l'interface partagée
        const invitation: import('../shared/types/invitation').Invitation = {
          code: rawInvitation.code,
          createdAt: rawInvitation.createdAt,
          consumed: rawInvitation.used ?? false,
          inviter: rawInvitation.donorId,
          ...(rawInvitation.usedAt && { consumedAt: rawInvitation.usedAt }),
          ...(rawInvitation.receiverId && { invitee: rawInvitation.receiverId })
        };
        let encryptedPayload: import('../shared/types/invitation').Invitation | string = invitation;
        try {
          encryptedPayload = await this.security.encryptSensitiveData(invitation);
        } catch (_e) {
          // fallback : en clair si erreur
          encryptedPayload = invitation;
        }
        await resilientBus.send({
          type: MessageType.INVITATION_GENERATED,
          payload: encryptedPayload
        });
      } catch (error) {
        logger.error('Failed to generate invitation:', error);
        await resilientBus.send({
          type: MessageType.INVITATION_GENERATED,
          payload: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    });

    // Invitation: validation/consommation
    this.messageBus.on(MessageType.CONSUME_INVITATION, async (message: MessageEvent | unknown) => {
      if (!this.isStorageReady()) {
        logger.warn('Storage not initialized, cannot consume invitation');
        await resilientBus.send({
          type: MessageType.INVITATION_CONSUMED,
          payload: { error: 'Database not initialized' }
        });
        return;
      }

      try {
        const { code, receiverId, role } = (message as any).payload;
        // Contrôle d'accès : seul un utilisateur authentifié peut consommer une invitation
        if (!this.security.validateDataAccess({ userId: receiverId, resource: code, role }, 'user')) {
          resilientBus.send({
            type: MessageType.INVITATION_CONSUMED,
            payload: { error: 'Accès refusé.' }
          });
          return;
        }

        // SÉCURITÉ: Vérification préventive contre l'auto-invitation
        // Récupération des détails de l'invitation pour validation
        const invitationDetails = await this.invitationService!.getInvitation(code);

        if (invitationDetails && invitationDetails.donorId === receiverId) {
          logger.warn('[Background] SECURITY: Self-invitation attempt detected and blocked', {
            code,
            donorId: invitationDetails.donorId,
            receiverId,
            timestamp: Date.now()
          });
          await resilientBus.send({
            type: MessageType.INVITATION_CONSUMED,
            payload: {
              error: 'Auto-invitation détectée: Vous ne pouvez pas accepter votre propre invitation.',
              code,
              blocked: true
            }
          });
          return;
        }

        const invitation = await this.invitationService!.consumeInvitation(code, receiverId);
        if (invitation) {
          this.activated = true;
          await setStorage('symbiont_activated', 'true');
          // Créer l'organisme à l'activation
          if (!this.organism) {
            this.organism = this.createNewOrganism();
            if (this.isStorageReady()) {
              await this.debouncer!.saveOrganism(this.organism);
            }
          }
        }
        resilientBus.send({
          type: MessageType.INVITATION_CONSUMED,
          payload: invitation
        });
      } catch (error) {
        logger.error('Failed to consume invitation:', error);
        await resilientBus.send({
          type: MessageType.INVITATION_CONSUMED,
          payload: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    });

    // Invitation: vérification
    this.messageBus.on(MessageType.CHECK_INVITATION, async (message: MessageEvent | unknown) => {
      if (!this.isStorageReady()) {
        logger.warn('Storage not initialized, cannot check invitation');
        await resilientBus.send({
          type: MessageType.INVITATION_CHECKED,
          payload: { code: (message as any).payload?.code, valid: false, error: 'Database not initialized' }
        });
        return;
      }

      try {
        const { code } = (message as any).payload;
        const valid = await this.invitationService!.isValid(code);
        resilientBus.send({
          type: MessageType.INVITATION_CHECKED,
          payload: { code, valid }
        });
      } catch (error) {
        logger.error('Failed to check invitation:', error);
        await resilientBus.send({
          type: MessageType.INVITATION_CHECKED,
          payload: { code: (message as any).payload?.code, valid: false, error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    });

    // --- Handlers pour la lignée et l'historique d'invitation ---
    this.messageBus.on(MessageType.GET_INVITER, async (message: MessageEvent | unknown) => {
      if (!this.isStorageReady()) {
        logger.warn('Storage not initialized, cannot get inviter');
        await resilientBus.send({
          type: MessageType.INVITER_RESULT,
          payload: null
        });
        return;
      }

      try {
        const { userId } = (message as any).payload;
        // Recherche de l'invitation où receiverId === userId
        const all = await this.invitationService!.getAllInvitations();
        const inviter = all.find(inv => inv.receiverId === userId);
        resilientBus.send({
          type: MessageType.INVITER_RESULT,
          payload: inviter || null
        });
      } catch (error) {
        logger.error('Failed to get inviter:', error);
        await resilientBus.send({
          type: MessageType.INVITER_RESULT,
          payload: null
        });
      }
    });

    this.messageBus.on(MessageType.GET_INVITEES, async (message: MessageEvent | unknown) => {
      if (!this.isStorageReady()) {
        logger.warn('Storage not initialized, cannot get invitees');
        await resilientBus.send({
          type: MessageType.INVITEES_RESULT,
          payload: []
        });
        return;
      }

      try {
        const { userId } = (message as any).payload;
        // Recherche des invitations où donorId === userId
        const all = await this.invitationService!.getAllInvitations();
        const invitees = all.filter(inv => inv.donorId === userId);
        resilientBus.send({
          type: MessageType.INVITEES_RESULT,
          payload: invitees
        });
      } catch (error) {
        logger.error('Failed to get invitees:', error);
        await resilientBus.send({
          type: MessageType.INVITEES_RESULT,
          payload: []
        });
      }
    });

    this.messageBus.on(MessageType.GET_INVITATION_HISTORY, async (message: MessageEvent | unknown) => {
      if (!this.isStorageReady()) {
        logger.warn('Storage not initialized, cannot get invitation history');
        await resilientBus.send({
          type: MessageType.INVITATION_HISTORY_RESULT,
          payload: []
        });
        return;
      }

      try {
        const { userId } = (message as any).payload;
        // Historique = invitations reçues ou envoyées
        const all = await this.invitationService!.getAllInvitations();
        const history = [
          ...all.filter(inv => inv.receiverId === userId).map(inv => ({ ...inv, type: 'reçue' })),
          ...all.filter(inv => inv.donorId === userId).map(inv => ({ ...inv, type: 'envoyée' }))
        ];
        resilientBus.send({
          type: MessageType.INVITATION_HISTORY_RESULT,
          payload: history
        });
      } catch (error) {
        logger.error('Failed to get invitation history:', error);
        await resilientBus.send({
          type: MessageType.INVITATION_HISTORY_RESULT,
          payload: []
        });
      }
    });

    // --- Rituel de mutation partagée ---
    const sharedMutationSessions: Map<string, { initiatorId: string; traits: Record<string, number>; expiresAt: number }> = new Map();

    this.messageBus.on(MessageType.REQUEST_SHARED_MUTATION, (message: MessageEvent | unknown) => {
      const { initiatorId, traits } = (message as any).payload;
      const code = SecureRandom.random().toString(36).substr(2, 6).toUpperCase();
      const expiresAt = Date.now() + 1000 * 60 * 5; // 5 min
      sharedMutationSessions.set(code, { initiatorId, traits, expiresAt });
      resilientBus.send({
        type: MessageType.SHARED_MUTATION_CODE,
        payload: { code, initiatorId, expiresAt }
      });
    });

    this.messageBus.on(MessageType.ACCEPT_SHARED_MUTATION, async (message: MessageEvent | unknown) => {
      const { code, receiverId, traits, role } = (message as any).payload;
      // Contrôle d'accès : seul un utilisateur authentifié peut accepter une mutation partagée
      if (!this.security.validateDataAccess({ userId: receiverId, resource: code, role }, 'user')) {
        resilientBus.send({
          type: MessageType.SHARED_MUTATION_RESULT,
          payload: { error: 'Accès refusé.' }
        });
        return;
      }
      const session = sharedMutationSessions.get(code);
      if (!session || session.expiresAt < Date.now()) {
        resilientBus.send({
          type: MessageType.SHARED_MUTATION_RESULT,
          payload: { error: 'Code expiré ou invalide.' }
        });
        return;
      }
      // Fusionner les traits (moyenne)
      const mergedTraits: Record<string, number> = { ...session.traits };
      for (const key of Object.keys(traits)) {
        // CORRECTION: Parenthèses correctes pour la moyenne
        mergedTraits[key] = ((mergedTraits[key] ?? 0) + (traits[key] ?? 0)) / 2;
      }

      // IMPORTANT: Appliquer réellement les traits fusionnés à l'organisme
      if (this.organism && this.organism.traits) {
        logger.info('[Background] Applying merged traits to organism', {
          before: { ...this.organism.traits },
          merged: mergedTraits
        });

        // Appliquer les nouveaux traits
        for (const [key, value] of Object.entries(mergedTraits)) {
          if (key in this.organism.traits) {
            const traitKey = key as keyof typeof this.organism.traits;
            this.organism.traits[traitKey] = Math.max(0, Math.min(100, value)); // Borner entre 0-100
          }
        }

        // Sauvegarder l'organisme modifié
        if (this.isStorageReady()) {
          await this.debouncer!.saveOrganism(this.organism);
          logger.info('[Background] Organism saved with merged traits');
        }

        // Notifier le popup des changements
        await resilientBus.send({
          type: MessageType.ORGANISM_UPDATE,
          payload: {
            state: this.organism,
            mutations: []
          }
        });
      }

      sharedMutationSessions.delete(code);
      let resultPayload: import('../shared/types/rituals').SharedMutationResult | string = {
        initiatorId: session.initiatorId,
        receiverId,
        mergedTraits,
        timestamp: Date.now()
      };
      try {
        resultPayload = await this.security.encryptSensitiveData(resultPayload);
      } catch (_e) {
        // fallback : en clair si erreur
      }
      resilientBus.send({
        type: MessageType.SHARED_MUTATION_RESULT,
        payload: resultPayload
      });
    });

    // --- Rituel de réveil collectif (simple, local) ---
    const collectiveWakeParticipants: Set<string> = new Set();
    let collectiveWakeTimeout: NodeJS.Timeout | null = null;

    this.messageBus.on(MessageType.COLLECTIVE_WAKE_REQUEST, (message: MessageEvent | unknown) => {
      const { userId } = (message as any).payload;
      collectiveWakeParticipants.add(userId);
      if (!collectiveWakeTimeout) {
        collectiveWakeTimeout = setTimeout(() => {
          resilientBus.send({
            type: MessageType.COLLECTIVE_WAKE_RESULT,
            payload: {
              participants: Array.from(collectiveWakeParticipants),
              triggeredAt: Date.now()
            }
          });
          collectiveWakeParticipants.clear();
          collectiveWakeTimeout = null;
        }, 10000); // 10 secondes pour simuler un réveil collectif
      }
    });

    // --- Transmission contextuelle ---
    const triggerContextualInvitation = async (context: string) => {
      const userId = (await getStorage('symbiont_user_id')) || 'unknown';
      // TODO: Fix invitation service access  
      const invitation = { code: 'TEMP_CODE', donorId: userId, symbolicLink: '', used: false, createdAt: Date.now() };
      await resilientBus.send({
        type: MessageType.CONTEXTUAL_INVITATION,
        payload: { invitation, context }
      });
    };

    // Détection mutation rare (ex : cognitive)
    const originalGenerateMutation = this.generateMutation.bind(this);
    this.generateMutation = () => {
      const mutation = originalGenerateMutation();
      if (mutation.type === 'cognitive') {
        triggerContextualInvitation('mutation_cognitive');
      }
      return mutation;
    };

    // Détection seuil de traits (ex : curiosité > 90)
    const originalUpdateOrganismTraits = this.updateOrganismTraits.bind(this);
    this.updateOrganismTraits = async (url: string, title: string) => {
      await originalUpdateOrganismTraits(url, title);
      if (this.organism && this.organism.traits.curiosity > 90) {
        await triggerContextualInvitation('curiosity_threshold');
      }
    };

    // Détection longue inactivité (ex : 30 min sans interaction)
    let lastActivity = Date.now();
    chrome.idle.onStateChanged.addListener((state) => {
      if (state === 'idle') {
        lastActivity = Date.now();
      } else if (state === 'active' && Date.now() - lastActivity > 1000 * 60 * 30) {
        triggerContextualInvitation('long_inactivity');
      }
    });

    // --- Rituels secrets ---
    const SECRET_CODES = ['SYMBIOSE', 'AWAKEN', 'ECHO'];
    this.messageBus.on(MessageType.SECRET_CODE_ENTERED, (message: MessageEvent | unknown) => {
      const { code } = (message as any).payload;
      if (SECRET_CODES.includes(code.toUpperCase())) {
        // Déclencher un effet spécial (ex : mutation unique)
        resilientBus.send({
          type: MessageType.SECRET_RITUAL_TRIGGERED,
          payload: { code, effect: 'mutation_unique', timestamp: Date.now() }
        });
      }
    });
  }

  private async updateOrganismTraits(url: string, title: string): Promise<void> {
    if (!this.organism) return;

    // Simple trait evolution based on content type
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    // Creativity boost from technical/creative sites
    if (urlLower.includes('github') || urlLower.includes('stackoverflow') ||
        urlLower.includes('codepen') || urlLower.includes('dribbble')) {
      this.organism.traits.creativity += 0.5;

    }

    // Focus boost from documentation/learning sites
    if (urlLower.includes('docs') || urlLower.includes('wiki') ||
        urlLower.includes('tutorial') || titleLower.includes('guide')) {
      this.organism.traits.focus += 0.3;
    }

    // Empathy boost from social/communication sites
    if (urlLower.includes('twitter') || urlLower.includes('linkedin') ||
        urlLower.includes('facebook') || urlLower.includes('reddit')) {
      this.organism.traits.empathy += 0.4;
    }

    // Curiosity boost from exploration
    const domain = new URL(url).hostname;
    const isNewDomain = !(await this.hasVisitedDomain(domain));
    if (isNewDomain) {
      this.organism.traits.curiosity += 1.0;
    }

    // Normalize traits (keep between 0-100)
    if (!this.organism) return;
    const traits = this.organism.traits;
    if (!traits) return;
    Object.keys(traits).forEach(trait => {
      traits[trait as keyof typeof traits] =
        Math.max(0, Math.min(100, traits[trait as keyof typeof traits]));
    });

    // Check for mutations
    await this.checkForMutations();

    // Save updated organism only if storage is ready (using debouncer)
    if (this.isStorageReady()) {
      try {
        await this.debouncer!.saveOrganism(this.organism);
      } catch (error) {
        logger.error('Failed to save organism:', error);
      }
    }
    
    // Détection de pattern simple
    let pattern: string = 'default';
    // Exemples de détection naïve (à affiner)
    if (await this.isLoop(url)) pattern = 'loop';
    else if (await this.isIdle()) pattern = 'idle';
    else if (await this.isExploration(url)) pattern = 'exploration';
    else if (await this.isRoutine(url)) pattern = 'routine';
    // Broadcast update
    if (!this.organism) return;
    const org = this.organism;
    await resilientBus.send({
      type: MessageType.ORGANISM_UPDATE,
      payload: {
        state: org,
        mutations: await this.storage!.getRecentMutations(5),
      },
    });
    // NOTE: le murmure poétique aléatoire à chaque visite a été retiré.
    // Le symbiont ne parle plus « pour meubler » : sa communication est
    // réservée à la perception de la structure invisible du web (chuchotement
    // contextuel + notification rare), décidée de façon autonome. `pattern`
    // reste utilisé pour l'évolution/les rituels, pas pour du bruit.
    void pattern;
  }

  private async hasVisitedDomain(domain: string): Promise<boolean> {
    // Check if we've visited this domain before
    const tabs = await chrome.tabs.query({});
    return tabs.some(tab => tab.url && new URL(tab.url).hostname === domain);
  }

  private async checkForMutations(): Promise<void> {
    if (!this.organism) return;
    const org = this.organism;
    const now = Date.now();
    const timeSinceLastMutation = now - (org.lastMutation ?? 0);
    // Mutation probability increases with time
    const mutationProbability = Math.min(0.5, timeSinceLastMutation / (1000 * 60 * 60)); // Max 50% after 1 hour
    if (SecureRandom.random() < mutationProbability) {
      const mutation = this.generateMutation();

      // Only save to storage if ready
      if (this.isStorageReady()) {
        try {
          await this.storage!.addMutation(mutation);
        } catch (error) {
          logger.error('Failed to save mutation:', error);
        }
      }

      org.lastMutation = now;
      // Apply mutation effects
      this.applyMutation(mutation);

    }
  }

  private generateMutation(): OrganismMutation {
    const types: Array<'visual' | 'behavioral' | 'cognitive'> = ['visual', 'behavioral', 'cognitive'];
    const type = types[Math.floor(SecureRandom.random() * types.length)];
    return {
      type,
      trigger: this.getMutationTrigger(type),
      magnitude: SecureRandom.random() * 0.5 + 0.1, // 0.1 to 0.6
      timestamp: Date.now(),
    } as OrganismMutation;
  }

  private getMutationTrigger(type: 'visual' | 'behavioral' | 'cognitive'): string {
    const triggers = {
      visual: ['color_shift', 'pattern_change', 'size_fluctuation', 'opacity_variation'],
      behavioral: ['navigation_speed', 'content_preference', 'interaction_pattern'],
      cognitive: ['memory_retention', 'pattern_recognition', 'association_strength'],
    
    };
    
    const typeTriggers = triggers[type];
    return typeTriggers[Math.floor(SecureRandom.random() * typeTriggers.length)];
  }

  private applyMutation(mutation: OrganismMutation): void {
    if (!this.organism) return;
    switch (mutation.type) {
      case 'visual':
        // Modify visual DNA
        this.organism.visualDNA = this.mutateVisualDNA(this.organism.visualDNA ?? '', mutation.magnitude);
        break;
      case 'behavioral': {
        // Adjust traits based on mutation
        const traitKeys = Object.keys(this.organism.traits) as Array<keyof typeof this.organism.traits>;
        const randomTrait = traitKeys[Math.floor(SecureRandom.random() * traitKeys.length)];
        this.organism.traits[randomTrait] += (SecureRandom.random() - 0.5) * mutation.magnitude * 20;
        break;
      
    }
      case 'cognitive': {
        // Affect multiple traits slightly
        if (!this.organism) return;
        const traits = this.organism.traits;
        if (!traits) return;
        Object.keys(traits).forEach(trait => {
          traits[trait as keyof typeof traits] += (SecureRandom.random() - 0.5) * mutation.magnitude * 5;
        });
        break;
      }
    }
  }

  private mutateVisualDNA(dna: string, magnitude: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const numChanges = Math.floor(dna.length * magnitude);
    const newDNA = dna.split('');
    
    for (let i = 0; i < numChanges; i++) {
      const position = Math.floor(SecureRandom.random() * dna.length);
      newDNA[position] = chars.charAt(Math.floor(SecureRandom.random() * chars.length));
    
    }
    
    return newDNA.join('');
  }

  private startPeriodicTasks(_storageInitialized: boolean = false): void {
    // Health decay - organism needs attention (TOUTES LES 5 MINUTES au lieu de 1 minute)
    setInterval(() => {
      if (this.organism && (this.organism.health ?? 0) > 0) {
        // Ajusté pour -0.5/5min = -0.1/min (même taux mais moins fréquent)
        this.organism.health = Math.max(0, (this.organism.health ?? 0) - 0.5);
        this.organism.energy = Math.max(0, (this.organism.energy ?? 0) - 0.25);
      }
    }, 1000 * 60 * 5); // Every 5 minutes (au lieu de 1 minute)

    // Periodic sync - only if storage is available (TOUTES LES 5 MINUTES au lieu de 30s)
    setInterval(async () => {
      if (this.organism && this.isStorageReady()) {
        try {
          // Utilise le debouncer qui va réduire encore plus les écritures
          await this.debouncer!.saveOrganism(this.organism);
          const mutations = await this.storage!.getRecentMutations(5);
          await resilientBus.send({
            type: MessageType.ORGANISM_UPDATE,
            payload: {
              state: this.organism,
              mutations,
            },
          });
          logger.debug('[BackgroundService] Periodic sync completed');
        } catch (error) {
          logger.error('Failed to perform periodic sync:', error);
        }
      }
    }, 1000 * 60 * 5); // Every 5 minutes (RÉDUCTION: de 30s → 5min = 10x moins d'écritures)

    // Passe d'apprentissage hebbien périodique : nourrit le réseau de Hebb
    // avec les comportements réels accumulés et applique les mutations
    // résultantes à l'organisme canonique.
    if (_storageInitialized) {
      setInterval(() => {
        void this.runHebbianLearningPass();
      }, 1000 * 60 * 10); // Toutes les 10 minutes
    }

    // Évaluation de léthargie : quand l'organisme n'a pas muté depuis un moment
    // (aucune perception marquante), on offre un contexte calme aux rituels.
    // Seul STRUCTURE_INSTINCT (condition de léthargie, indépendante d'échelle)
    // s'y active — analyse structurelle profonde pendant les temps morts. Les
    // rituels de contre-mesure (friction/pression réseau nulles ici) ne s'y
    // déclenchent pas. Auto-limité par le cooldown 15 min + 4/h du rituel.
    setInterval(() => {
      if (!this.ritualBootstrap || !this.organism) return;
      void this.ritualBootstrap.evaluateAutonomousTriggers({
        organism: this.organism,
        resonanceLevel: 0,
        networkPressure: 0,
        domOppression: 0,
        frictionIndex: 0,
        timestamp: Date.now()
      });
    }, 1000 * 60 * 3); // Toutes les 3 minutes
  }

  /**
   * Apprentissage hebbien sur les comportements réels observés :
   * "neurons that fire together, wire together". Les patterns renforcés/nouveaux
   * produisent des mutations de traits appliquées à l'organisme canonique
   * (mémoire/adaptabilité quand de nouveaux patterns émergent, focus quand des
   * connexions se renforcent), puis persistées et diffusées.
   */
  private async runHebbianLearningPass(): Promise<void> {
    if (!this.isStorageReady()) return;
    await this.ensureOrganism();
    if (!this.organism) return;

    try {
      const behaviors = await this.storage!.getBehaviorPatterns();
      if (!behaviors || behaviors.length === 0) return;

      // Mapper BehaviorData (stockage) → BehaviorPattern (apprentissage)
      const patterns: BehaviorPattern[] = behaviors.map(b => ({
        url: b.url,
        interactions: Array.isArray(b.interactions) ? b.interactions.length : 0,
        timeSpent: b.totalTime || 0,
        scrollDepth: b.scrollDepth || 0,
        timestamp: b.lastVisit || Date.now()
      }));

      const result = await this.hebbian.updateWeights(patterns);

      // Traduire l'apprentissage en mutations de traits réelles
      const traitDeltas: Record<string, number> = {};
      if (result.newPatterns.length > 0) {
        // Nouveaux patterns → mémoire + adaptabilité
        this.accumulateTraitDelta(traitDeltas, 'memory', 'pattern_learning');
        this.accumulateTraitDelta(traitDeltas, 'adaptability', 'pattern_learning');
      }
      if (result.strengthenedConnections > result.weakenedConnections) {
        // Connexions renforcées → focus
        this.accumulateTraitDelta(traitDeltas, 'focus', 'hebbian_reinforcement');
      }

      const changedTraits = Object.keys(traitDeltas);
      if (changedTraits.length === 0) return;

      // Appliquer sur l'organisme canonique (échelle 0-100)
      const traits = this.organism.traits as Record<string, number>;
      for (const trait of changedTraits) {
        if (typeof traits[trait] === 'number') {
          // delta GeneticMutator est en échelle 0-1 → *100 pour l'organisme
          const scaled = traitDeltas[trait] * 100;
          traits[trait] = Math.max(0, Math.min(100, traits[trait] + scaled));
        }
      }

      const mutation: OrganismMutation = {
        type: 'cognitive',
        trigger: 'hebbian_learning',
        magnitude: Math.min(1, result.confidence),
        timestamp: Date.now()
      };
      this.organism.mutations = [...(this.organism.mutations || []), mutation];
      this.organism.lastMutation = Date.now();

      await this.storage!.addMutation(mutation);
      await this.debouncer!.saveOrganism(this.organism);
      await resilientBus.send({
        type: MessageType.ORGANISM_UPDATE,
        payload: { state: this.organism, mutations: [] }
      });

      logger.info('[BackgroundService] Hebbian learning pass applied', {
        newPatterns: result.newPatterns.length,
        strengthened: result.strengthenedConnections,
        traits: changedTraits
      });
    } catch (error) {
      logger.error('[BackgroundService] Hebbian learning pass failed:', error);
    }
  }

  /** Génère une mutation de trait via le GeneticMutator et l'accumule. */
  private accumulateTraitDelta(
    acc: Record<string, number>,
    trait: string,
    trigger: string
  ): void {
    if (!this.organism) return;
    const mutation = this.geneticMutator.generateMutation(trait, trigger);
    if (mutation && typeof mutation.delta === 'number') {
      // On ne garde que les deltas positifs (renforcement) pour l'évolution
      acc[trait] = (acc[trait] || 0) + Math.abs(mutation.delta);
    }
  }

  // Détection naïve de patterns (à améliorer)
  private async isLoop(url: string): Promise<boolean> {
    if (!this.isStorageReady()) return false;
    try {
      // Si l'utilisateur visite la même URL plus de 3 fois en 10 minutes
      const behavior = await this.storage!.getBehavior(url);
      return !!behavior && behavior.visitCount >= 3;
    } catch (error) {
      logger.error('Failed to check loop pattern:', error);
      return false;
    }
  }
  private async isIdle(): Promise<boolean> {
    // Si aucune interaction depuis plus de 10 minutes (exemple)
    // À implémenter selon la collecte d'activité réelle
    return false;
  }
  private async isExploration(url: string): Promise<boolean> {
    if (!this.isStorageReady()) return false;
    try {
      // Si le domaine est nouveau ou rarement visité
      const behavior = await this.storage!.getBehavior(url);
      return !!behavior && behavior.visitCount <= 1;
    } catch (error) {
      logger.error('Failed to check exploration pattern:', error);
      return false;
    }
  }
  private async isRoutine(url: string): Promise<boolean> {
    if (!this.isStorageReady()) return false;
    try {
      // Si le site est visité tous les jours (exemple naïf)
      const behavior = await this.storage!.getBehavior(url);
      if (!behavior) return false;
      const now = Date.now();
      return (now - behavior.lastVisit) < 1000 * 60 * 60 * 24 * 2; // Visité il y a moins de 2 jours
    } catch (error) {
      logger.error('Failed to check routine pattern:', error);
      return false;
    }
  }

  /**
   * Analyse les patterns contextuels dans l'historique d'événements et déclenche une invitation si nécessaire
   */
  private async analyzeContextualPatterns(): Promise<void> {
    const now = Date.now();
    // On ne garde que les événements des 30 dernières minutes
    this.events = this.events.filter(e => now - e.timestamp < 1000 * 60 * 30);
    // Détection de burst d'activité (ex: 5 actions en <10s)
    const bursts = PatternDetector.detectBurst(this.events, 10000, 5);
    if (bursts.length > 0) {
      this.triggerContextualInvitation('burst_activity');
      return;
    
    }
    // Détection de cycles temporels (ex: actions régulières)
    const cycles = PatternDetector.detectTemporalPattern(this.events, 60000, 0.15);
    if (cycles.length > 0) {
      this.triggerContextualInvitation('temporal_cycle');
      return;
    }
    // Détection d'alternance navigation/scroll
    const alternances = PatternDetector.detectAlternance(this.events, 'visit', 'scroll', 6);
    if (alternances.length > 0) {
      this.triggerContextualInvitation('alternance_nav_scroll');
      return;
    }
    // Détection de répétition d'un même type d'action
    const repetitions = PatternDetector.detectRepetition(this.events, 7);
    if (repetitions.length > 0) {
      this.triggerContextualInvitation('repetition_action');
      return;
    }
    // Déclenchement collectif : seuil global d'invitations
    this.checkCollectiveThreshold();
  }

  /**
   * Vérifie si un seuil collectif de propagation est atteint et déclenche une invitation spéciale si besoin
   */
  private async checkCollectiveThreshold() {
    // Skip if storage is not ready
    if (!this.isStorageReady()) {
      logger.debug('Storage not ready, skipping collective threshold check');
      return;
    }

    try {
      const allInvitations = await this.invitationService!.getAllInvitations();
      const total = allInvitations.length;
      for (const threshold of this.collectiveThresholds) {
        if (total >= threshold && !this.reachedThresholds.includes(threshold)) {
          this.reachedThresholds.push(threshold);
          await setStorage('symbiont_collective_thresholds', JSON.stringify(this.reachedThresholds));
          // triggerContextualInvitation vérifie déjà si le storage est prêt
          await this.triggerContextualInvitation('collective_threshold_' + threshold);
          break;
        }
      }
    } catch (error) {
      logger.error('Failed to check collective threshold:', error);
    }
  }

  /**
   * Déclenche une invitation contextuelle avancée
   */
  private async triggerContextualInvitation(context: string) {
    // Vérifier que le storage est initialisé avant d'utiliser le service d'invitation
    if (!this.isStorageReady()) {
      logger.warn('Storage not initialized, skipping contextual invitation generation', { context });
      return;
    }

    try {
      const userId = (await getStorage('symbiont_user_id') as string) || 'unknown';
      const invitation = await this.invitationService!.generateInvitation(userId);
      await resilientBus.send({
        type: MessageType.CONTEXTUAL_INVITATION,
        payload: { invitation, context }
      });
    } catch (error) {
      logger.error('Failed to generate contextual invitation:', error);
    }
  }

  /**
   * Nettoyage des ressources lors de l'arrêt du service
   */
  public dispose(): void {
    try {
      // Arrêter les health checks
      healthCheckManager.stop();
      
      // Nettoyer les événements stockés en mémoire
      this.events = [];
      
      logger.info('BackgroundService disposed successfully');
    } catch (error) {
      logger.error('Erreur lors du dispose du BackgroundService:', error);
    }
  }
}

// LAZY INITIALIZATION: Ne pas créer l'instance immédiatement
// L'instance sera créée au premier message reçu
async function getBackgroundService(): Promise<BackgroundService> {
  if (!_backgroundServiceInstance) {
    logger.info('[Background] Lazy initialization triggered - creating BackgroundService');
    _backgroundServiceInstance = new BackgroundService();
    await _backgroundServiceInstance.ensureInitialized();
    // Garde la référence pour éviter le garbage collection
    (globalThis as any)._backgroundService = _backgroundServiceInstance;
  }
  return _backgroundServiceInstance;
}

// Setup listener pour déclencher l'initialisation au premier message
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((_message, _sender, _sendResponse) => {
    // Initialiser le service au premier message
    getBackgroundService().then(_service => {
      logger.debug('[Background] Service initialized via lazy loading');
      // Le message sera traité par les handlers du MessageBus du service
    }).catch(error => {
      logger.error('[Background] Failed to initialize service on message:', error);
    });
    return false; // Synchronous response
  });

  // INITIALISATION PROACTIVE : Initialiser immédiatement le service au démarrage
  // Ceci évite le délai lors du premier accès au dashboard
  setTimeout(() => {
    logger.info('[Background] Proactive initialization starting...');
    getBackgroundService().then(service => {
      logger.info('[Background] Service initialized proactively', {
        hasOrganism: !!service.organism,
        organismId: service.organism?.id
      });
    }).catch(error => {
      logger.error('[Background] Failed to initialize service proactively:', error);
    });
  }, 500); // Petit délai pour laisser l'extension se charger

  logger.info('[Background] Lazy initialization listener registered + proactive init scheduled');
} else {
  logger.warn('[Background] Chrome runtime not available - service will not auto-initialize');
}

// Export for testing and external access
export { BackgroundService, getBackgroundService };

// --- LAZY LOADING pour modules sociaux (Phase 3) ---
// Ne les instancier QUE si nécessaire (quand le service est activé)
let _distributedNetwork: DistributedOrganismNetwork | null = null;
let _collectiveIntelligence: CollectiveIntelligence | null = null;
let _socialResilience: SocialResilience | null = null;
let _mysticalEvents: MysticalEvents | null = null;

export function getDistributedNetwork(): DistributedOrganismNetwork {
  if (!_distributedNetwork) {
    logger.info('[Background] Lazy loading DistributedOrganismNetwork');
    _distributedNetwork = new DistributedOrganismNetwork();
  }
  return _distributedNetwork;
}

export function getCollectiveIntelligence(): CollectiveIntelligence {
  if (!_collectiveIntelligence) {
    logger.info('[Background] Lazy loading CollectiveIntelligence');
    _collectiveIntelligence = new CollectiveIntelligence();
  }
  return _collectiveIntelligence;
}

export function getSocialResilience(): SocialResilience {
  if (!_socialResilience) {
    logger.info('[Background] Lazy loading SocialResilience');
    _socialResilience = new SocialResilience();
  }
  return _socialResilience;
}

export function getMysticalEvents(): MysticalEvents {
  if (!_mysticalEvents) {
    logger.info('[Background] Lazy loading MysticalEvents');
    _mysticalEvents = new MysticalEvents();
  }
  return _mysticalEvents;
}

// --- Hooks d'intégration (après instanciation des modules) ---
// Note: Fonctions réservées pour usage futur, hooks d'intégration sociale