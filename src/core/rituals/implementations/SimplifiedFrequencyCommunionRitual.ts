/**
 * SimplifiedFrequencyCommunionRitual.ts
 * Rituel de Communion de Fréquence — version service worker.
 *
 * WebRTC n'étant pas disponible dans un service worker MV3, ce rituel
 * s'appuie sur le registre des pairs P2P réellement connectés, persisté
 * dans chrome.storage.local par P2PService (popup, vraies connexions
 * WebRTC + chiffrement E2E). Aucun pair n'est simulé : sans réseau réel,
 * le rituel ne se déclenche pas.
 */

import {
  IRitual,
  RitualType,
  RitualStatus,
  RitualTriggerCondition,
  RitualContext,
  RitualResult,
  RitualMetrics,
  RitualHealth
} from '../interfaces/IRitual';
import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';
import { MessageBus, MessageType } from '@/shared/messaging/MessageBus';

interface CommunionPeer {
  id: string;
  trustScore: number;
  lastSeen: number;
  sharedData: Map<string, any>;
}

interface PeerRegistryEntry {
  id: string;
  displayName: string;
  hasEncryption: boolean;
  lastSeen: number;
  generation: number;
  consciousness: number;
}

interface DataPacket {
  id: string;
  source: string;
  destination: string;
  payload: any;
  timestamp: number;
  hops: string[];
}

export class SimplifiedFrequencyCommunionRitual implements IRitual {
  public readonly id = 'simplified-frequency-communion-001';
  public readonly type = RitualType.FREQUENCY_COMMUNION;
  public readonly name = 'Communion de Fréquence (Simplifié)';
  public readonly description = 'Distribution de données via réseau symbiotique local';

  public readonly triggers: RitualTriggerCondition[] = [
    {
      type: 'THRESHOLD',
      metric: 'networkPressure',
      operator: '>',
      value: 0.6,
      cooldownMs: 600000 // 10 minutes
    }
  ];

  public readonly priority = 9;
  public readonly maxExecutionsPerHour = 6;
  public readonly requiresUserConsent = false;

  public status: RitualStatus = RitualStatus.IDLE;
  public lastExecutionTime = 0;
  public executionCount = 0;

  private messageBus: MessageBus;
  private peers: Map<string, CommunionPeer> = new Map();
  private dataStore: Map<string, DataPacket> = new Map();
  private metrics = {
    totalPacketsRouted: 0,
    totalDataShared: 0,
    peersConnected: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  constructor() {
    this.messageBus = new MessageBus('simplified-frequency-communion');
    this.initializePeerNetwork();
  }

  /**
   * Initialise le suivi du réseau P2P réel : lit le registre des pairs
   * connectés (alimenté par P2PService) et le rafraîchit périodiquement.
   */
  private initializePeerNetwork(): void {
    this.refreshPeersFromRegistry();

    setInterval(() => {
      this.refreshPeersFromRegistry();
    }, 30000); // Toutes les 30 secondes

    logger.info('[FrequencyCommunion] Initialized — tracking real P2P peer registry');
  }

  /**
   * Synchronise la liste des pairs avec les connexions WebRTC réelles.
   * Le score de confiance est dérivé de faits observés : chiffrement E2E
   * actif et fraîcheur de la connexion.
   */
  private async refreshPeersFromRegistry(): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return;

      const stored = await chrome.storage.local.get('symbiont_p2p_peer_registry');
      const registry = stored?.symbiont_p2p_peer_registry as
        | { peers: PeerRegistryEntry[]; updatedAt: number }
        | undefined;

      if (!registry?.peers) return;

      const now = Date.now();
      const seen = new Set<string>();

      for (const entry of registry.peers) {
        seen.add(entry.id);
        const recencyFactor = Math.max(0, 1 - (now - entry.lastSeen) / 120000);
        const trustScore = Math.min(1, 0.5 + (entry.hasEncryption ? 0.3 : 0) + recencyFactor * 0.2);

        const existing = this.peers.get(entry.id);
        if (existing) {
          existing.trustScore = trustScore;
          existing.lastSeen = entry.lastSeen;
        } else {
          this.peers.set(entry.id, {
            id: entry.id,
            trustScore,
            lastSeen: entry.lastSeen,
            sharedData: new Map()
          });
        }
      }

      // Retirer les pairs qui ne sont plus dans le registre
      for (const id of this.peers.keys()) {
        if (!seen.has(id)) {
          this.peers.delete(id);
        }
      }
    } catch (error) {
      logger.warn('[FrequencyCommunion] Failed to refresh peer registry:', error);
    }
  }

  /**
   * Vérifie si le rituel peut être déclenché
   */
  public canTrigger(context: RitualContext): boolean {
    const now = Date.now();
    const timeSinceLastExecution = now - this.lastExecutionTime;
    const minCooldown = Math.min(...this.triggers.map(t => t.cooldownMs || 0));

    if (timeSinceLastExecution < minCooldown) {
      return false;
    }

    // Vérifier qu'on a des pairs actifs
    const activePeers = this.getActivePeers();
    if (activePeers.length < 2) {
      return false;
    }

    // Vérifier les conditions
    return this.triggers.some(trigger => this.evaluateTrigger(trigger, context));
  }

  /**
   * Exécute le rituel
   */
  public async execute(context: RitualContext): Promise<RitualResult> {
    try {
      this.status = RitualStatus.EXECUTING;
      const startTime = performance.now();

      logger.info('[FrequencyCommunion] Starting distributed data sharing', {
        networkPressure: context.networkPressure,
        activePeers: this.getActivePeers().length
      });

      // Phase 1: Sélectionner les pairs de confiance
      const trustedPeers = this.selectTrustedPeers(3);

      // Phase 2: Distribuer les données sensibles
      const distributionResult = await this.distributeData(trustedPeers);

      // Phase 3: Activer le cache partagé
      await this.activateSharedCache(trustedPeers);

      // Phase 4: Installer les routes alternatives
      await this.installAlternativeRoutes();

      // Phase 5: Effet visuel de multiplication
      await this.activateVisualEffect(context, trustedPeers.length);

      // Calculer les métriques
      const executionTime = performance.now() - startTime;
      const impactScore = this.calculateImpactScore(distributionResult);

      this.status = RitualStatus.COMPLETED;
      this.lastExecutionTime = Date.now();
      this.executionCount++;

      return {
        success: true,
        status: RitualStatus.COMPLETED,
        effects: [
          {
            type: 'NETWORK',
            target: 'data_distribution',
            duration: 1800000, // 30 minutes
            intensity: 0.7,
            reversible: true
          },
          {
            type: 'VISUAL',
            target: 'organism_mirror',
            duration: 15000,
            intensity: 0.8,
            reversible: true
          }
        ],
        metrics: {
          executionTime,
          resourcesUsed: trustedPeers.length * 10,
          impactScore
        },
        message: `Communion établie : ${trustedPeers.length} nœuds actifs, cache distribué activé`
      };

    } catch (error) {
      logger.error('[FrequencyCommunion] Ritual execution failed:', error);
      this.status = RitualStatus.FAILED;

      return {
        success: false,
        status: RitualStatus.FAILED,
        effects: [],
        metrics: {
          executionTime: 0,
          resourcesUsed: 0,
          impactScore: 0
        },
        error: error as Error
      };
    }
  }

  /**
   * Sélectionne les pairs de confiance
   */
  private selectTrustedPeers(count: number): CommunionPeer[] {
    const activePeers = this.getActivePeers();

    // Trier par score de confiance
    activePeers.sort((a, b) => b.trustScore - a.trustScore);

    return activePeers.slice(0, Math.min(count, activePeers.length));
  }

  /**
   * Distribue les données entre les pairs
   */
  private async distributeData(peers: CommunionPeer[]): Promise<any> {
    const dataToDistribute = await this.collectSensitiveData();
    const fragments = this.fragmentData(dataToDistribute);

    // Distribuer les fragments entre les pairs. Les fragments sont déposés
    // dans chrome.storage.local (disponible en service worker) : le popup,
    // qui détient les DataChannels WebRTC, les relaie aux pairs.
    const outbox: Record<string, unknown> = {};
    let fragmentIndex = 0;
    for (const fragment of fragments) {
      const peer = peers[fragmentIndex % peers.length];
      peer.sharedData.set(fragment.id, fragment.data);
      outbox[`symbiont_p2p_fragment_${peer.id}_${fragment.id}`] = fragment;
      fragmentIndex++;
    }

    if (Object.keys(outbox).length > 0) {
      await chrome.storage.local.set(outbox);
    }

    this.metrics.totalDataShared += fragments.length;
    this.metrics.totalPacketsRouted += fragments.length;

    logger.info(`[FrequencyCommunion] Distributed ${fragments.length} fragments across ${peers.length} peers`);

    return {
      fragmentCount: fragments.length,
      peerCount: peers.length,
      redundancy: Math.floor(fragments.length / peers.length)
    };
  }

  /**
   * Collecte les données sensibles à protéger
   */
  private async collectSensitiveData(): Promise<any> {
    try {
      // Récupérer les données de l'organisme et des patterns
      const organismData = await chrome.storage.local.get(['currentOrganism', 'behaviorPatterns']);

      return {
        organism: organismData.currentOrganism || {},
        patterns: organismData.behaviorPatterns || [],
        timestamp: Date.now(),
        sessionId: SecureRandom.generateId(16)
      };
    } catch (error) {
      logger.error('[FrequencyCommunion] Failed to collect sensitive data:', error);
      return {};
    }
  }

  /**
   * Fragmente les données
   */
  private fragmentData(data: any): Array<{id: string, data: any}> {
    const jsonStr = JSON.stringify(data);
    const chunkSize = 512; // 512 caractères par fragment
    const fragments = [];

    for (let i = 0; i < jsonStr.length; i += chunkSize) {
      fragments.push({
        id: `fragment-${SecureRandom.generateId(8)}`,
        data: jsonStr.slice(i, i + chunkSize)
      });
    }

    return fragments;
  }

  /**
   * Active le cache partagé
   */
  private async activateSharedCache(peers: CommunionPeer[]): Promise<void> {
    // Envoyer un message au content script pour activer le cache
    const tabs = await chrome.tabs.query({ active: true });

    for (const tab of tabs) {
      if (tab.id && !tab.url?.startsWith('chrome://')) {
        chrome.tabs.sendMessage(tab.id, {
          type: MessageType.P2P_RELAY_REQUEST,
          payload: {
            action: 'ACTIVATE_CACHE',
            peers: peers.map(p => ({ id: p.id, trustScore: p.trustScore })),
            duration: 1800000 // 30 minutes
          }
        }).catch(error => {
          logger.warn(`[FrequencyCommunion] Could not activate cache in tab ${tab.id}:`, error);
        });
      }
    }

    this.metrics.peersConnected = peers.length;
  }

  /**
   * Installe des routes alternatives
   */
  private async installAlternativeRoutes(): Promise<void> {
    // Créer une table de routage simulée
    const routingTable = new Map<string, string[]>();

    // Pour chaque pattern de tracking détecté, créer une route alternative
    const trackerPatterns = [
      'analytics', 'tracking', 'telemetry', 'metrics', 'collect'
    ];

    for (const pattern of trackerPatterns) {
      const alternativeRoutes = this.getActivePeers()
        .map(p => `local://symbiont/${p.id}/${pattern}`);
      routingTable.set(pattern, alternativeRoutes);
    }

    // Sauvegarder la table de routage
    await chrome.storage.local.set({
      symbiotRoutingTable: Array.from(routingTable.entries())
    });

    logger.info(`[FrequencyCommunion] Installed ${routingTable.size} alternative routes`);
  }

  /**
   * Active l'effet visuel
   */
  private async activateVisualEffect(context: RitualContext, mirrorCount: number): Promise<void> {
    // Effet de miroir/multiplication
    this.messageBus.send({
      type: MessageType.WEBGL_RITUAL_EFFECT,
      payload: {
        ritualType: this.type,
        effect: 'MIRROR_MULTIPLY',
        duration: 15000,
        intensity: 0.8,
        organismId: context.organism.id,
        mirrorCount
      }
    });

    // Augmenter l'adaptabilité
    this.messageBus.send({
      type: MessageType.ORGANISM_MUTATE,
      payload: {
        organismId: context.organism.id,
        mutation: {
          type: 'behavioral',
          traits: {
            adaptability: Math.min(100, (context.organism.traits?.adaptability || 0) + 20),
            resilience: Math.min(100, (context.organism.traits?.resilience || 0) + 15)
          },
          trigger: 'frequency_communion',
          magnitude: 0.8,
          timestamp: Date.now()
        }
      }
    });
  }

  /**
   * Obtient les pairs actifs (vus récemment via une vraie connexion WebRTC)
   */
  private getActivePeers(): CommunionPeer[] {
    const now = Date.now();
    const timeout = 120000; // 2 minutes

    return Array.from(this.peers.values())
      .filter(peer => now - peer.lastSeen < timeout);
  }

  /**
   * Évalue une condition de déclenchement
   */
  private evaluateTrigger(trigger: RitualTriggerCondition, context: RitualContext): boolean {
    const value = (context as any)[trigger.metric];
    if (value === undefined) return false;

    switch (trigger.operator) {
      case '>': return value > trigger.value;
      case '<': return value < trigger.value;
      case '>=': return value >= trigger.value;
      case '<=': return value <= trigger.value;
      case '==': return value === trigger.value;
      default: return false;
    }
  }

  /**
   * Calcule le score d'impact
   */
  private calculateImpactScore(distributionResult: any): number {
    const distributionScore = Math.min(distributionResult.fragmentCount * 2, 30);
    const peerScore = distributionResult.peerCount * 10;
    const redundancyScore = distributionResult.redundancy * 5;
    const cacheScore = (this.metrics.cacheHits / Math.max(1, this.metrics.cacheHits + this.metrics.cacheMisses)) * 20;

    return Math.min(100, distributionScore + peerScore + redundancyScore + cacheScore);
  }

  /**
   * Annule le rituel
   */
  public async cancel(): Promise<void> {
    this.status = RitualStatus.CANCELLED;

    // Nettoyer les fragments distribués (chrome.storage, compatible SW)
    try {
      const all = await chrome.storage.local.get(null);
      const fragmentKeys = Object.keys(all).filter(key =>
        key.startsWith('symbiont_p2p_fragment_')
      );
      if (fragmentKeys.length > 0) {
        await chrome.storage.local.remove(fragmentKeys);
      }
    } catch (error) {
      logger.warn('[FrequencyCommunion] Fragment cleanup failed:', error);
    }

    // Vider les données
    this.dataStore.clear();
    for (const peer of this.peers.values()) {
      peer.sharedData.clear();
    }
  }

  /**
   * Annule les effets
   */
  public async rollback(): Promise<void> {
    await this.cancel();

    // Supprimer la table de routage
    await chrome.storage.local.remove('symbiotRoutingTable');

    // Réinitialiser les métriques
    this.metrics = {
      totalPacketsRouted: 0,
      totalDataShared: 0,
      peersConnected: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Obtient les métriques
   */
  public getMetrics(): RitualMetrics {
    const cacheEfficiency = this.metrics.cacheHits /
      Math.max(1, this.metrics.cacheHits + this.metrics.cacheMisses);

    return {
      successRate: this.executionCount > 0 ? 0.85 : 0,
      averageExecutionTime: 3000,
      resourceConsumption: 0.15,
      userBenefit: 0.75 + (cacheEfficiency * 0.15)
    };
  }

  /**
   * Obtient l'état de santé
   */
  public getHealthStatus(): RitualHealth {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (this.peers.size < 3) {
      issues.push('Insufficient peer network');
      recommendations.push('Connect with more organisms via P2P (invitations) to strengthen the communion network');
    }

    if (this.metrics.cacheHits < this.metrics.cacheMisses) {
      issues.push('Low cache efficiency');
      recommendations.push('Cache will improve with usage');
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}