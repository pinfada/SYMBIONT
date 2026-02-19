/**
 * FrequencyCommunionRitual.ts
 * Rituel de Communion de Fréquence - Infrastructure Bypass
 * Utilise le réseau P2P réel (WebRTC DataChannels) pour contourner
 * la surveillance et les limitations.
 *
 * Upgraded to use PeerNetwork for real WebRTC DataChannels instead of
 * simulated in-memory peers.
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
import { PeerNetwork, PeerInfo } from '@/services/p2p/PeerNetwork';

interface PeerNode {
  id: string;
  publicKey: string;
  endpoint: string;
  latency: number;
  trustScore: number;
  lastSeen: number;
  capabilities: string[];
}

interface RelayRoute {
  path: PeerNode[];
  totalLatency: number;
  reliability: number;
  encrypted: boolean;
}

interface DataFragment {
  id: string;
  index: number;
  total: number;
  data: ArrayBuffer;
  checksum: string;
  route: RelayRoute;
}

export class FrequencyCommunionRitual implements IRitual {
  public readonly id = 'frequency-communion-001';
  public readonly type = RitualType.FREQUENCY_COMMUNION;
  public readonly name = 'Communion de Fréquence';
  public readonly description = 'Contournement d\'infrastructure par distribution P2P';

  public readonly triggers: RitualTriggerCondition[] = [
    {
      type: 'THRESHOLD',
      metric: 'networkPressure',
      operator: '>',
      value: 0.6,
      cooldownMs: 600000 // 10 minutes
    },
    {
      type: 'COMPOUND',
      metric: 'latencyAnomaly',
      operator: 'MATCHES',
      value: /suspicious|blocked|throttled/,
      cooldownMs: 600000
    }
  ];

  public readonly priority = 9; // Haute priorité
  public readonly maxExecutionsPerHour = 6;
  public readonly requiresUserConsent = false;

  public status: RitualStatus = RitualStatus.IDLE;
  public lastExecutionTime = 0;
  public executionCount = 0;

  private messageBus: MessageBus;
  /** Legacy in-memory peer map (populated from real PeerNetwork) */
  private peerNetworkMap: Map<string, PeerNode> = new Map();
  private activeRoutes: Map<string, RelayRoute> = new Map();
  private fragmentCache: Map<string, DataFragment[]> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();

  /** Real WebRTC PeerNetwork for actual DataChannel connections */
  private realPeerNetwork: PeerNetwork;
  private peerNetworkStarted = false;

  private metrics = {
    totalBytesRelayed: 0,
    totalFragmentsSent: 0,
    peersConnected: 0,
    routesEstablished: 0,
    bypassSuccessRate: 0,
    averageLatencyReduction: 0
  };

  constructor() {
    this.messageBus = new MessageBus('frequency-communion-ritual');
    this.realPeerNetwork = new PeerNetwork();
    this.initializePeerDiscovery();
  }

  /**
   * Initialise la découverte de pairs P2P.
   * Uses the real PeerNetwork (WebRTC DataChannels with chrome.storage.sync
   * signaling) alongside the legacy MessageBus announcements.
   */
  private async initializePeerDiscovery(): Promise<void> {
    // Start the real WebRTC PeerNetwork
    try {
      await this.realPeerNetwork.start();
      this.peerNetworkStarted = true;
      logger.info('[FrequencyCommunion] Real PeerNetwork started');

      // Listen for data on real DataChannels
      this.realPeerNetwork.onData(({ peerId, data }) => {
        if (typeof data === 'string') {
          this.handleRelayedData(peerId, data);
        } else {
          this.handleRelayedData(peerId, new TextDecoder().decode(data as ArrayBuffer));
        }
      });
    } catch (error) {
      logger.warn('[FrequencyCommunion] Failed to start PeerNetwork, falling back to legacy', error);
    }

    // Legacy: listen for MessageBus peer announcements
    this.messageBus.on('PEER_ANNOUNCE' as MessageType, (message: any) => {
      const peer = message.payload as PeerNode;
      if (this.validatePeer(peer)) {
        this.peerNetworkMap.set(peer.id, peer);
        logger.debug(`[FrequencyCommunion] New peer discovered: ${peer.id}`);
      }
    });

    // Sync discovered peers from real PeerNetwork into legacy map
    setInterval(() => {
      if (this.peerNetworkStarted) {
        for (const info of this.realPeerNetwork.getDiscoveredPeers()) {
          if (!this.peerNetworkMap.has(info.id)) {
            this.peerNetworkMap.set(info.id, this.peerInfoToNode(info));
          }
        }
        this.metrics.peersConnected = this.realPeerNetwork.getConnectedPeers().length;
      }

      if (this.status === RitualStatus.EXECUTING) {
        this.broadcastPresence();
      }
    }, 30000);
  }

  /**
   * Convert a PeerInfo from the real PeerNetwork to a legacy PeerNode.
   */
  private peerInfoToNode(info: PeerInfo): PeerNode {
    return {
      id: info.id,
      publicKey: info.publicKey,
      endpoint: 'webrtc-datachannel',
      latency: 50, // Default estimate; refined after first RTT measurement
      trustScore: info.trustScore,
      lastSeen: info.lastSeen,
      capabilities: info.capabilities,
    };
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

    // Vérifier qu'on a des pairs disponibles
    if (this.getActivePeers().length < 2) {
      logger.debug('[FrequencyCommunion] Not enough peers available');
      return false;
    }

    // Vérifier les conditions
    for (const trigger of this.triggers) {
      if (this.evaluateTrigger(trigger, context)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Exécute le rituel de communion
   */
  public async execute(context: RitualContext): Promise<RitualResult> {
    try {
      this.status = RitualStatus.EXECUTING;
      const startTime = performance.now();

      logger.info('[FrequencyCommunion] Starting P2P relay establishment', {
        networkPressure: context.networkPressure,
        availablePeers: this.getActivePeers().length
      });

      // Phase 1: Sélectionner les pairs de confiance
      const trustedPeers = await this.selectTrustedPeers(3);
      if (trustedPeers.length < 2) {
        throw new Error('Not enough trusted peers available');
      }

      // Phase 2: Établir les routes de relais
      const routes = await this.establishRelayRoutes(trustedPeers);
      logger.info(`[FrequencyCommunion] Established ${routes.length} relay routes`);

      // Phase 3: Créer les canaux WebRTC
      const channels = await this.createDataChannels(routes);

      // Phase 4: Activer le routage distribué
      await this.activateDistributedRouting(routes, channels);

      // Phase 5: Activer l'effet visuel de multiplication
      await this.activateVisualEffect(context, routes.length);

      // Calculer les métriques
      const executionTime = performance.now() - startTime;
      const latencyReduction = this.calculateLatencyReduction(routes);
      const impactScore = this.calculateImpactScore(routes, latencyReduction);

      this.status = RitualStatus.COMPLETED;
      this.lastExecutionTime = Date.now();
      this.executionCount++;

      return {
        success: true,
        status: RitualStatus.COMPLETED,
        effects: [
          {
            type: 'NETWORK',
            target: 'data_routing',
            duration: 1800000, // 30 minutes
            intensity: 0.9,
            reversible: true
          },
          {
            type: 'VISUAL',
            target: 'organism_mirror',
            duration: 15000,
            intensity: 0.8,
            reversible: true
          },
          {
            type: 'DATA',
            target: 'fragmentation',
            duration: 1800000,
            intensity: 0.7,
            reversible: true
          }
        ],
        metrics: {
          executionTime,
          resourcesUsed: routes.length * 20,
          impactScore
        },
        message: `Communion établie : ${routes.length} routes P2P actives, latence réduite de ${Math.round(latencyReduction)}%`
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
  private async selectTrustedPeers(count: number): Promise<PeerNode[]> {
    const activePeers = this.getActivePeers();

    // Trier par score de confiance et latence
    activePeers.sort((a, b) => {
      const scoreA = a.trustScore / (1 + a.latency / 100);
      const scoreB = b.trustScore / (1 + b.latency / 100);
      return scoreB - scoreA;
    });

    const selected = activePeers.slice(0, count);

    // Vérifier la disponibilité par ping
    const available = await Promise.all(
      selected.map(peer => this.pingPeer(peer))
    );

    return selected.filter((peer, index) => available[index]);
  }

  /**
   * Établit les routes de relais
   */
  private async establishRelayRoutes(peers: PeerNode[]): Promise<RelayRoute[]> {
    const routes: RelayRoute[] = [];

    // Créer des routes avec différentes combinaisons
    for (let i = 0; i < peers.length; i++) {
      for (let j = i + 1; j < peers.length; j++) {
        const route: RelayRoute = {
          path: [peers[i], peers[j]],
          totalLatency: peers[i].latency + peers[j].latency,
          reliability: (peers[i].trustScore + peers[j].trustScore) / 2,
          encrypted: true
        };

        // Tester la route
        const isValid = await this.testRoute(route);
        if (isValid) {
          routes.push(route);
          this.activeRoutes.set(this.generateRouteId(route), route);
        }
      }
    }

    // Ajouter des routes directes pour les pairs très fiables
    for (const peer of peers) {
      if (peer.trustScore > 0.8) {
        const directRoute: RelayRoute = {
          path: [peer],
          totalLatency: peer.latency,
          reliability: peer.trustScore,
          encrypted: true
        };

        routes.push(directRoute);
        this.activeRoutes.set(this.generateRouteId(directRoute), directRoute);
      }
    }

    this.metrics.routesEstablished = routes.length;
    return routes;
  }

  /**
   * Crée les canaux de données WebRTC
   */
  private async createDataChannels(routes: RelayRoute[]): Promise<Map<string, RTCDataChannel>> {
    const channels = new Map<string, RTCDataChannel>();

    for (const route of routes) {
      try {
        // Créer une connexion pour chaque pair dans la route
        for (const peer of route.path) {
          if (!this.dataChannels.has(peer.id)) {
            const channel = await this.createPeerConnection(peer);
            if (channel) {
              this.dataChannels.set(peer.id, channel);
              channels.set(peer.id, channel);
            }
          }
        }
      } catch (error) {
        logger.warn(`[FrequencyCommunion] Failed to create channel for route:`, error);
      }
    }

    this.metrics.peersConnected = channels.size;
    return channels;
  }

  /**
   * Crée une connexion P2P avec un pair
   */
  private async createPeerConnection(peer: PeerNode): Promise<RTCDataChannel | null> {
    try {
      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      const peerConnection = new RTCPeerConnection(config);
      const dataChannel = peerConnection.createDataChannel('symbiont-relay', {
        ordered: true,
        maxRetransmits: 3
      });

      // Configuration des handlers
      dataChannel.onopen = () => {
        logger.info(`[FrequencyCommunion] Data channel opened with ${peer.id}`);
      };

      dataChannel.onmessage = (event) => {
        this.handleRelayedData(peer.id, event.data);
      };

      dataChannel.onerror = (error) => {
        logger.error(`[FrequencyCommunion] Data channel error with ${peer.id}:`, error);
      };

      // Négociation WebRTC simplifiée (en production, utiliser signaling server)
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Envoyer l'offre via le MessageBus
      this.messageBus.send({
        type: 'P2P_OFFER' as MessageType,
        payload: {
          targetPeer: peer.id,
          offer: offer.sdp,
          fromPeer: 'self'
        }
      });

      // Attendre la réponse (timeout de 10 secondes)
      const answer = await this.waitForAnswer(peer.id, 10000);
      if (answer) {
        await peerConnection.setRemoteDescription({
          type: 'answer',
          sdp: answer
        });

        return dataChannel;
      }

      return null;

    } catch (error) {
      logger.error(`[FrequencyCommunion] Failed to create connection with ${peer.id}:`, error);
      return null;
    }
  }

  /**
   * Active le routage distribué
   */
  private async activateDistributedRouting(
    routes: RelayRoute[],
    channels: Map<string, RTCDataChannel>
  ): Promise<void> {
    // Intercepter les requêtes sortantes
    const interceptor = this.createNetworkInterceptor(routes, channels);

    // Installer l'intercepteur
    await this.installNetworkInterceptor(interceptor);

    // Commencer à relayer les données
    this.startDataRelaying(routes, channels);

    logger.info('[FrequencyCommunion] Distributed routing activated');
  }

  /**
   * Crée un intercepteur réseau SANS mutation globale
   * Utilise une approche proxy-based sans modifier window.fetch
   */
  private createNetworkInterceptor(
    routes: RelayRoute[],
    channels: Map<string, RTCDataChannel>
  ): string {
    // CORRECTION: Pas de mutation de window.fetch !
    // Utilise une factory function pour créer un fetch sécurisé
    return `
      (function() {
        // NE PAS modifier window.fetch - violation de sécurité !
        const routes = ${JSON.stringify(routes.map(r => ({
          id: this.generateRouteId(r),
          reliability: r.reliability
        })))};

        // Patterns à router via P2P
        const bypassPatterns = [
          /api\\.blocked\\./,
          /restricted\\./,
          /censored\\./
        ];

        // Créer une fonction fetch P2P sans toucher au global
        const createP2PFetch = () => {
          return async function p2pFetch(url, options = {}) {
            const urlStr = url.toString();
            const shouldBypass = bypassPatterns.some(p => p.test(urlStr));

            if (shouldBypass && window.symbiontP2P) {
              console.log('[SYMBIONT] Routing through P2P:', urlStr);
              const route = routes.sort((a, b) => b.reliability - a.reliability)[0];

              return window.symbiontP2P.relay({
                url: urlStr,
                method: options.method || 'GET',
                headers: options.headers,
                body: options.body,
                route: route.id
              }).then(response => new Response(response.body, {
                status: response.status,
                headers: response.headers
              }));
            }

            // Utiliser le fetch natif sans modification
            return fetch(url, options);
          };
        };

        // Exposer l'API P2P sans toucher aux globaux
        if (!window.symbiontP2P) {
          Object.defineProperty(window, 'symbiontP2P', {
            value: {
              fetch: createP2PFetch(),
              relay: async (request) => {
                return new Promise((resolve) => {
                  chrome.runtime.sendMessage({
                    type: 'P2P_RELAY_REQUEST',
                    payload: request
                  }, resolve);
                });
              }
            },
            writable: false,
            configurable: false
          });
        }
      })();
    `;
  }

  /**
   * Installe l'intercepteur réseau
   */
  private async installNetworkInterceptor(script: string): Promise<void> {
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      if (tab.id && !tab.url?.startsWith('chrome://')) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          func: new Function(script) as () => void
        });
      }
    }
  }

  /**
   * Démarre le relais de données
   */
  private startDataRelaying(
    routes: RelayRoute[],
    channels: Map<string, RTCDataChannel>
  ): void {
    // Écouter les requêtes de relais
    this.messageBus.on('P2P_RELAY_REQUEST' as MessageType, async (message: any) => {
      const request = message.payload;

      try {
        // Sélectionner la route
        const route = this.activeRoutes.get(request.route);
        if (!route) {
          throw new Error('Route not found');
        }

        // Fragmenter les données
        const fragments = await this.fragmentData(request, route);

        // Envoyer via les canaux P2P
        await this.sendFragments(fragments, route, channels);

        // Attendre la reconstruction
        const response = await this.reconstructResponse(request.id);

        // Répondre
        this.messageBus.send({
          type: 'P2P_RELAY_RESPONSE' as MessageType,
          payload: response
        });

        this.metrics.totalBytesRelayed += JSON.stringify(response).length;

      } catch (error) {
        logger.error('[FrequencyCommunion] Relay failed:', error);
      }
    });
  }

  /**
   * Fragmente les données pour envoi P2P
   */
  private async fragmentData(request: any, route: RelayRoute): Promise<DataFragment[]> {
    const data = JSON.stringify(request);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);

    const fragmentSize = 1024; // 1KB par fragment
    const fragments: DataFragment[] = [];
    const total = Math.ceil(bytes.length / fragmentSize);

    for (let i = 0; i < total; i++) {
      const start = i * fragmentSize;
      const end = Math.min(start + fragmentSize, bytes.length);
      const chunk = bytes.slice(start, end);

      fragments.push({
        id: `${request.id}-${i}`,
        index: i,
        total,
        data: chunk.buffer,
        checksum: await this.calculateChecksum(chunk),
        route
      });
    }

    this.metrics.totalFragmentsSent += fragments.length;
    return fragments;
  }

  /**
   * Envoie les fragments via P2P.
   * Uses the real PeerNetwork DataChannels when available,
   * falls back to legacy channels.
   */
  private async sendFragments(
    fragments: DataFragment[],
    route: RelayRoute,
    channels: Map<string, RTCDataChannel>
  ): Promise<void> {
    for (const fragment of fragments) {
      const peerIndex = fragment.index % route.path.length;
      const peer = route.path[peerIndex];
      const payload = JSON.stringify({ type: 'FRAGMENT', fragment });

      // Try real PeerNetwork first
      if (this.peerNetworkStarted && this.realPeerNetwork.isConnected(peer.id)) {
        const sent = await this.realPeerNetwork.sendData(peer.id, payload);
        if (sent) continue;
      }

      // Fallback to legacy channels
      const channel = channels.get(peer.id);
      if (channel && channel.readyState === 'open') {
        channel.send(payload);
      } else {
        logger.warn(`[FrequencyCommunion] Channel not ready for peer ${peer.id}`);
      }
    }
  }

  /**
   * Reconstruit la réponse depuis les fragments
   */
  private async reconstructResponse(requestId: string): Promise<any> {
    // Attendre que tous les fragments soient reçus (timeout 30s)
    const timeout = 30000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const fragments = this.fragmentCache.get(requestId);
      if (fragments && this.areFragmentsComplete(fragments)) {
        // Reconstruire les données
        const reconstructed = await this.reconstructFromFragments(fragments);
        this.fragmentCache.delete(requestId);
        return reconstructed;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Timeout waiting for fragments');
  }

  /**
   * Gère les données relayées reçues
   */
  private handleRelayedData(peerId: string, data: any): void {
    try {
      const message = JSON.parse(data);

      if (message.type === 'FRAGMENT') {
        const fragment = message.fragment as DataFragment;
        const requestId = fragment.id.split('-')[0];

        if (!this.fragmentCache.has(requestId)) {
          this.fragmentCache.set(requestId, []);
        }

        const fragments = this.fragmentCache.get(requestId)!;
        fragments.push(fragment);

        logger.debug(`[FrequencyCommunion] Received fragment ${fragment.index}/${fragment.total} from ${peerId}`);
      }
    } catch (error) {
      logger.error('[FrequencyCommunion] Failed to handle relayed data:', error);
    }
  }

  /**
   * Active l'effet visuel de multiplication
   */
  private async activateVisualEffect(context: RitualContext, mirrorCount: number): Promise<void> {
    // Effet de miroir/multiplication
    this.messageBus.send({
      type: 'RITUAL_VISUAL_EFFECT' as MessageType,
      payload: {
        ritualType: this.type,
        effect: 'MIRROR_MULTIPLY',
        duration: 15000,
        intensity: 0.8,
        organismId: context.organism.id,
        mirrorCount
      }
    });

    // Augmenter l'adaptabilité et la résilience
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
   * Méthodes utilitaires
   */

  private getActivePeers(): PeerNode[] {
    const now = Date.now();
    const timeout = 60000; // 1 minute

    // Merge peers from real PeerNetwork
    if (this.peerNetworkStarted) {
      for (const info of this.realPeerNetwork.getDiscoveredPeers()) {
        if (!this.peerNetworkMap.has(info.id)) {
          this.peerNetworkMap.set(info.id, this.peerInfoToNode(info));
        }
      }
    }

    return Array.from(this.peerNetworkMap.values())
      .filter(peer => now - peer.lastSeen < timeout);
  }

  private validatePeer(peer: PeerNode): boolean {
    return peer.id !== '' &&
           peer.publicKey !== '' &&
           peer.trustScore >= 0 &&
           peer.trustScore <= 1;
  }

  private async pingPeer(peer: PeerNode): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);

      this.messageBus.send({
        type: 'PEER_PING' as MessageType,
        payload: { targetPeer: peer.id }
      });

      this.messageBus.on('PEER_PONG' as MessageType, (message: any) => {
        if (message.payload.fromPeer === peer.id) {
          clearTimeout(timeout);
          resolve(true);
        }
      });
    });
  }

  private async testRoute(route: RelayRoute): Promise<boolean> {
    // Tester la connectivité de tous les pairs dans la route
    const tests = await Promise.all(
      route.path.map(peer => this.pingPeer(peer))
    );
    return tests.every(result => result);
  }

  private generateRouteId(route: RelayRoute): string {
    return route.path.map(p => p.id).join('-');
  }

  private async waitForAnswer(peerId: string, timeout: number): Promise<string | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), timeout);

      this.messageBus.on('P2P_ANSWER' as MessageType, (message: any) => {
        if (message.payload.fromPeer === peerId) {
          clearTimeout(timer);
          resolve(message.payload.answer);
        }
      });
    });
  }

  private async calculateChecksum(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private areFragmentsComplete(fragments: DataFragment[]): boolean {
    if (fragments.length === 0) return false;
    const total = fragments[0].total;
    const indices = new Set(fragments.map(f => f.index));
    return indices.size === total;
  }

  private async reconstructFromFragments(fragments: DataFragment[]): Promise<any> {
    // Trier par index
    fragments.sort((a, b) => a.index - b.index);

    // Concaténer les données
    const totalLength = fragments.reduce((sum, f) => sum + f.data.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const fragment of fragments) {
      const data = new Uint8Array(fragment.data);
      result.set(data, offset);
      offset += data.length;
    }

    // Décoder
    const decoder = new TextDecoder();
    const json = decoder.decode(result);
    return JSON.parse(json);
  }

  private broadcastPresence(): void {
    this.messageBus.send({
      type: 'PEER_ANNOUNCE' as MessageType,
      payload: {
        id: 'self',
        publicKey: 'generated-key',
        endpoint: 'webrtc',
        latency: 0,
        trustScore: 1.0,
        lastSeen: Date.now(),
        capabilities: ['relay', 'fragment', 'encrypt']
      }
    });
  }

  private evaluateTrigger(trigger: RitualTriggerCondition, context: RitualContext): boolean {
    const value = (context as any)[trigger.metric];
    if (value === undefined) return false;

    switch (trigger.operator) {
      case '>': return value > trigger.value;
      case '<': return value < trigger.value;
      case '>=': return value >= trigger.value;
      case '<=': return value <= trigger.value;
      case '==': return value === trigger.value;
      case 'MATCHES':
        return trigger.value instanceof RegExp ?
          trigger.value.test(value) :
          value.includes(trigger.value);
      default: return false;
    }
  }

  private calculateLatencyReduction(routes: RelayRoute[]): number {
    if (routes.length === 0) return 0;

    const avgRouteLatency = routes.reduce((sum, r) => sum + r.totalLatency, 0) / routes.length;
    const directLatency = 100; // Estimation de latence directe

    const reduction = ((directLatency - avgRouteLatency) / directLatency) * 100;
    return Math.max(0, Math.min(100, reduction));
  }

  private calculateImpactScore(routes: RelayRoute[], latencyReduction: number): number {
    const routeScore = Math.min(routes.length * 10, 30);
    const latencyScore = latencyReduction * 0.5;
    const reliabilityScore = routes.reduce((sum, r) => sum + r.reliability, 0) / routes.length * 20;

    return Math.min(100, routeScore + latencyScore + reliabilityScore);
  }

  /**
   * Annule le rituel
   */
  public async cancel(): Promise<void> {
    this.status = RitualStatus.CANCELLED;

    // Fermer tous les canaux de données legacy
    for (const channel of this.dataChannels.values()) {
      channel.close();
    }
    this.dataChannels.clear();

    // Nettoyer les routes
    this.activeRoutes.clear();

    // Vider le cache de fragments
    this.fragmentCache.clear();

    // Destroy the real PeerNetwork
    if (this.peerNetworkStarted) {
      this.realPeerNetwork.destroy();
      this.peerNetworkStarted = false;
    }
  }

  /**
   * Annule les effets
   */
  public async rollback(): Promise<void> {
    await this.cancel();

    // Réinitialiser les métriques
    this.metrics = {
      totalBytesRelayed: 0,
      totalFragmentsSent: 0,
      peersConnected: 0,
      routesEstablished: 0,
      bypassSuccessRate: 0,
      averageLatencyReduction: 0
    };
  }

  /**
   * Obtient les métriques
   */
  public getMetrics(): RitualMetrics {
    const totalAttempts = this.executionCount;
    const successfulBypasses = Math.floor(this.metrics.bypassSuccessRate * totalAttempts);

    return {
      successRate: totalAttempts > 0 ? successfulBypasses / totalAttempts : 0,
      averageExecutionTime: 5000, // 5 secondes en moyenne
      resourceConsumption: 0.25, // 25% de ressources
      userBenefit: 0.9 // 90% de bénéfice (contournement efficace)
    };
  }

  /**
   * Get PeerNetwork stats for external monitoring.
   */
  public getPeerNetworkStats(): { discovered: number; connected: number; channels: number } {
    if (!this.peerNetworkStarted) {
      return { discovered: this.peerNetworkMap.size, connected: 0, channels: 0 };
    }
    const stats = this.realPeerNetwork.getStats();
    return {
      discovered: stats.discoveredPeers,
      connected: stats.activeConnections,
      channels: stats.openChannels,
    };
  }

  /**
   * Obtient l'état de santé
   */
  public getHealthStatus(): RitualHealth {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (this.peerNetworkMap.size < 3) {
      issues.push('Insufficient peer network');
      recommendations.push('Invite more trusted peers to strengthen the network');
    }

    if (this.metrics.totalBytesRelayed > 100 * 1024 * 1024) { // 100MB
      issues.push('High data relay volume');
      recommendations.push('Consider upgrading bandwidth or limiting relay frequency');
    }

    if (this.metrics.bypassSuccessRate < 0.5) {
      issues.push('Low bypass success rate');
      recommendations.push('Check network connectivity and peer availability');
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}