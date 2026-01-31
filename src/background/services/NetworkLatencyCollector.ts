import { logger } from '@/shared/utils/secureLogger';

/**
 * NetworkLatencyCollector - Collecte les métriques de latence réseau
 *
 * Mesure la latence des connexions P2P/WebRTC et autres communications réseau
 * pour alimenter le système de détection de résonance infrastructurelle
 */
export class NetworkLatencyCollector {
  private latencyBuffer: number[] = [];
  private readonly MAX_BUFFER_SIZE = 100;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private neuralMeshCallback: ((latency: number) => void) | null = null;

  // Statistiques des protocoles modernes
  private protocolStats = {
    quic: { count: 0, totalLatency: 0, zeroRTT: 0 },
    http2: { count: 0, totalLatency: 0 },
    http1: { count: 0, totalLatency: 0 },
    unknown: { count: 0, totalLatency: 0 }, // Pour protocoles non identifiés
    udpTrackers: new Set<string>() // Trackers utilisant UDP/QUIC
  };

  // CORRECTION: Feature detection pour nextHopProtocol
  private readonly supportsNextHopProtocol: boolean;

  constructor() {
    // Vérifier le support de nextHopProtocol au démarrage
    this.supportsNextHopProtocol = this.checkNextHopProtocolSupport();
    logger.info('[NetworkLatencyCollector] Initialized', {
      nextHopProtocolSupport: this.supportsNextHopProtocol
    });
  }

  /**
   * Vérifie si le navigateur supporte nextHopProtocol
   * @returns true si supporté, false sinon
   */
  private checkNextHopProtocolSupport(): boolean {
    try {
      if (!('performance' in window) || !performance.getEntriesByType) {
        return false;
      }

      // Obtenir une entrée de ressource pour tester
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      if (entries.length > 0) {
        // Vérifier si la propriété existe
        const hasNextHopProtocol = 'nextHopProtocol' in entries[0];
        if (hasNextHopProtocol) {
          logger.info('[NetworkLatencyCollector] nextHopProtocol API supported');
          return true;
        }
      }

      logger.warn('[NetworkLatencyCollector] nextHopProtocol NOT supported - using fallback detection');
      return false;
    } catch (error) {
      logger.error('[NetworkLatencyCollector] Error checking nextHopProtocol support:', error);
      return false;
    }
  }

  /**
   * Démarre la collecte de latence réseau
   */
  start(neuralMeshCallback?: (latency: number) => void): void {
    if (this.isMonitoring) {
      logger.warn('[NetworkLatencyCollector] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    this.neuralMeshCallback = neuralMeshCallback || null;

    // Monitoring périodique de la latence
    this.monitoringInterval = setInterval(() => {
      this.measureNetworkLatency();
    }, 5000); // Toutes les 5 secondes

    // Écouter les événements WebRTC si disponibles
    this.setupWebRTCMonitoring();

    logger.info('[NetworkLatencyCollector] Started monitoring');
  }

  /**
   * Arrête la collecte et nettoie les ressources
   */
  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    // CLEANUP: Nettoyer les timers
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // CLEANUP: Libérer les callbacks pour éviter les memory leaks
    this.neuralMeshCallback = null;

    // CLEANUP: Limiter la taille finale du buffer
    if (this.latencyBuffer.length > 50) {
      this.latencyBuffer = this.latencyBuffer.slice(-50);
    }

    logger.info('[NetworkLatencyCollector] Stopped monitoring', {
      finalBufferSize: this.latencyBuffer.length,
      protocolStats: {
        quic: this.protocolStats.quic.count,
        http2: this.protocolStats.http2.count,
        http1: this.protocolStats.http1.count,
        trackersDetected: this.protocolStats.udpTrackers.size
      }
    });
  }

  /**
   * Mesure la latence réseau via différentes méthodes
   */
  private async measureNetworkLatency(): Promise<void> {
    try {
      // Méthode 1: Ping via fetch à une ressource locale (manifest)
      const startTime = performance.now();

      try {
        // Utiliser une ressource de l'extension pour éviter CORS
        const response = await fetch(chrome.runtime.getURL('/manifest.json'), {
          method: 'HEAD',
          cache: 'no-cache'
        });

        if (response.ok) {
          const latency = performance.now() - startTime;
          this.recordLatency(latency);
        }
      } catch (fetchError) {
        // Fallback: mesurer le temps de réponse chrome.runtime
        const messageStart = performance.now();
        await this.measureChromeRuntimeLatency();
        const messageLatency = performance.now() - messageStart;
        this.recordLatency(messageLatency);
      }

      // Méthode 2: Resource Timing API pour les requêtes réseau récentes
      this.measureResourceTimingLatency();

    } catch (error) {
      logger.error('[NetworkLatencyCollector] Failed to measure latency:', error);
    }
  }

  /**
   * Mesure la latence via chrome.runtime messaging
   */
  private async measureChromeRuntimeLatency(): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();

      chrome.runtime.sendMessage({ type: 'PING' }, () => {
        const latency = performance.now() - startTime;
        this.recordLatency(latency);
        resolve();
      });
    });
  }

  /**
   * Analyse les performances des ressources récentes avec détection QUIC/HTTP3
   */
  private measureResourceTimingLatency(): void {
    if (!('performance' in window) || !performance.getEntriesByType) {
      return;
    }

    try {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      // OPTIMISATION: Limiter à 10 ressources pour performance
      const recentResources = resources.slice(-10);

      for (const resource of recentResources) {
        // VALIDATION: Vérifier que toutes les propriétés requises existent
        if (!this.validateResourceTiming(resource)) {
          continue;
        }

        let protocol = 'unknown';
        let isQUIC = false;
        let isHTTP2 = false;

        // CORRECTION: Feature detection avant accès à nextHopProtocol
        if (this.supportsNextHopProtocol) {
          try {
            protocol = (resource as any).nextHopProtocol || 'unknown';
            isQUIC = protocol.toLowerCase().includes('h3') ||
                    protocol.toLowerCase().includes('quic');
            isHTTP2 = protocol.toLowerCase().includes('h2');
          } catch (error) {
            logger.debug('[NetworkLatencyCollector] Protocol access failed', { error });
            protocol = 'unknown';
          }
        } else {
          // FALLBACK: Détection heuristique si nextHopProtocol non disponible
          isQUIC = this.detectQUICByHeuristics(resource);
          isHTTP2 = this.detectHTTP2ByHeuristics(resource);
        }

        // Calcul de latence adapté au protocole avec validation
        const networkLatency = this.calculateProtocolLatency(resource, isQUIC, isHTTP2);

      // Enregistrer avec métadonnées du protocole
      if (networkLatency > 0 && Number.isFinite(networkLatency)) {
        this.recordLatency(networkLatency);

        // Mise à jour des statistiques par protocole
        if (isQUIC) {
          this.protocolStats.quic.count++;
          this.protocolStats.quic.totalLatency += networkLatency;
          if (networkLatency < 50) {
            this.protocolStats.quic.zeroRTT++;
          }
        } else if (isHTTP2) {
          this.protocolStats.http2.count++;
          this.protocolStats.http2.totalLatency += networkLatency;
        } else {
          this.protocolStats.http1.count++;
          this.protocolStats.http1.totalLatency += networkLatency;
        }

        // Log spécial pour les protocoles modernes
        if (isQUIC || isHTTP2) {
          logger.debug('[NetworkLatencyCollector] Modern protocol detected', {
            protocol,
            latency: networkLatency.toFixed(2),
            url: resource.name.substring(0, 50) // Tronquer l'URL pour les logs
          });
        }
      }

      // Détecter les signaux de tracking UDP (QUIC) avec validation URL
      if (isQUIC) {
        this.detectQUICTracking(resource.name, networkLatency, protocol);
      }
    }
    } catch (error) {
      logger.error('[NetworkLatencyCollector] Resource timing analysis failed:', error);
    }
  }

  /**
   * Valide qu'une entrée PerformanceResourceTiming a toutes les propriétés requises
   */
  private validateResourceTiming(resource: PerformanceResourceTiming): boolean {
    return !!(
      resource &&
      typeof resource.fetchStart === 'number' &&
      typeof resource.responseStart === 'number' &&
      resource.fetchStart >= 0 &&
      resource.responseStart >= resource.fetchStart &&
      resource.name &&
      typeof resource.name === 'string'
    );
  }

  /**
   * Détecte QUIC par heuristiques (sans nextHopProtocol)
   */
  private detectQUICByHeuristics(resource: PerformanceResourceTiming): boolean {
    // QUIC a généralement:
    // - Pas de temps TCP (connectEnd - connectStart très court)
    // - Réponse très rapide sur connexions répétées
    const connectionTime = resource.connectEnd - resource.connectStart;
    const totalTime = resource.responseStart - resource.fetchStart;

    return connectionTime < 5 && totalTime < 50;
  }

  /**
   * Détecte HTTP/2 par heuristiques
   */
  private detectHTTP2ByHeuristics(resource: PerformanceResourceTiming): boolean {
    // HTTP/2: connexion réutilisée (secureConnectionStart === 0)
    return resource.secureConnectionStart === 0 &&
           resource.connectEnd === resource.connectStart;
  }

  /**
   * Calcule la latence selon le protocole détecté
   */
  private calculateProtocolLatency(
    resource: PerformanceResourceTiming,
    isQUIC: boolean,
    isHTTP2: boolean
  ): number {
    try {
      if (isQUIC) {
        // QUIC: pas de TCP handshake
        return Math.max(0, resource.responseStart - resource.fetchStart);
      } else if (isHTTP2) {
        // HTTP/2: connexion établie, mesurer transfert
        const requestStart = (resource as any).requestStart || resource.fetchStart;
        return Math.max(0, resource.responseStart - requestStart);
      } else {
        // HTTP/1.x: latence complète
        return Math.max(0, resource.connectEnd - resource.fetchStart);
      }
    } catch (error) {
      // Fallback sécurisé
      return resource.responseStart - resource.fetchStart;
    }
  }

  /**
   * Détecte et enregistre les trackers utilisant QUIC
   */
  private detectQUICTracking(url: string, latency: number, protocol: string): void {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const searchParams = urlObj.search.toLowerCase();

      // Patterns de tracking élargis
      const trackingPatterns = [
        'track', 'analytics', 'telemetry', 'collect',
        'beacon', 'metric', 'pixel', 'event'
      ];

      const isTracking = trackingPatterns.some(pattern =>
        pathname.includes(pattern) || searchParams.includes(pattern)
      );

      if (isTracking) {
        this.protocolStats.udpTrackers.add(urlObj.hostname);
        logger.warn('[NetworkLatencyCollector] QUIC tracking detected', {
          hostname: urlObj.hostname,
          latency: latency.toFixed(2),
          protocol
        });
      }
    } catch (error) {
      // URL invalide, ignorer silencieusement
    }
  }

  /**
   * Configure le monitoring WebRTC pour les connexions P2P
   */
  private setupWebRTCMonitoring(): void {
    // Intercepter les connexions WebRTC si l'extension utilise P2P
    if (!window.RTCPeerConnection) return;

    const OriginalRTCPeerConnection = window.RTCPeerConnection;
    const collector = this;

    // Wrapper pour surveiller les connexions
    window.RTCPeerConnection = function(...args: any[]) {
      const pc = new OriginalRTCPeerConnection(...args);

      // Surveiller les statistiques ICE
      pc.addEventListener('iceconnectionstatechange', async () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          collector.monitorWebRTCStats(pc);
        }
      });

      return pc;
    } as any;

    logger.info('[NetworkLatencyCollector] WebRTC monitoring configured');
  }

  /**
   * Surveille les statistiques d'une connexion WebRTC
   */
  private async monitorWebRTCStats(pc: RTCPeerConnection): Promise<void> {
    if (!pc.getStats) return;

    try {
      const stats = await pc.getStats();

      stats.forEach((report) => {
        // Chercher les métriques de candidats ICE
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          const rtt = report.currentRoundTripTime;
          if (rtt && Number.isFinite(rtt)) {
            // RTT en secondes, convertir en ms
            this.recordLatency(rtt * 1000);
          }
        }

        // Métriques de transport
        if (report.type === 'transport') {
          const rtt = (report as any).currentRoundTripTime;
          if (rtt && Number.isFinite(rtt)) {
            this.recordLatency(rtt * 1000);
          }
        }
      });
    } catch (error) {
      logger.error('[NetworkLatencyCollector] Failed to get WebRTC stats:', error);
    }
  }

  /**
   * Enregistre une mesure de latence avec validation stricte
   */
  private recordLatency(latency: number): void {
    // VALIDATION: Rejeter les valeurs invalides ou suspectes
    if (!Number.isFinite(latency) || latency < 0 || latency > 60000) {
      logger.debug('[NetworkLatencyCollector] Invalid latency rejected', { latency });
      return;
    }

    // OPTIMISATION: Utiliser un buffer circulaire efficace
    this.latencyBuffer.push(latency);

    // Maintenir la taille du buffer (prévention memory leak)
    if (this.latencyBuffer.length > this.MAX_BUFFER_SIZE) {
      this.latencyBuffer.shift();
    }

    // Notifier le NeuralMesh si callback fourni (avec throttling)
    if (this.neuralMeshCallback && this.shouldNotifyNeuralMesh()) {
      this.neuralMeshCallback(latency);
    }

    // OPTIMISATION: Log seulement en debug mode
    if (logger.level === 'debug') {
      logger.debug('[NetworkLatencyCollector] Latency recorded:', {
        latency: latency.toFixed(2),
        bufferSize: this.latencyBuffer.length
      });
    }
  }

  /**
   * Throttle les notifications vers NeuralMesh (max 1 par seconde)
   */
  private lastNeuralMeshNotification = 0;
  private shouldNotifyNeuralMesh(): boolean {
    const now = Date.now();
    if (now - this.lastNeuralMeshNotification > 1000) {
      this.lastNeuralMeshNotification = now;
      return true;
    }
    return false;
  }

  /**
   * Retourne les statistiques de latence
   */
  getStatistics(): {
    average: number;
    min: number;
    max: number;
    variance: number;
    samples: number;
    protocols?: {
      quic: { count: number; avgLatency: number; zeroRTTRate: number };
      http2: { count: number; avgLatency: number };
      http1: { count: number; avgLatency: number };
      udpTrackers: string[];
    };
  } {
    if (this.latencyBuffer.length === 0) {
      return { average: 0, min: 0, max: 0, variance: 0, samples: 0 };
    }

    const sum = this.latencyBuffer.reduce((a, b) => a + b, 0);
    const average = sum / this.latencyBuffer.length;
    const min = Math.min(...this.latencyBuffer);
    const max = Math.max(...this.latencyBuffer);

    const squaredDiffs = this.latencyBuffer.map(value => Math.pow(value - average, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / this.latencyBuffer.length;

    // Calculer les moyennes par protocole
    const protocols = {
      quic: {
        count: this.protocolStats.quic.count,
        avgLatency: this.protocolStats.quic.count > 0 ?
          this.protocolStats.quic.totalLatency / this.protocolStats.quic.count : 0,
        zeroRTTRate: this.protocolStats.quic.count > 0 ?
          this.protocolStats.quic.zeroRTT / this.protocolStats.quic.count : 0
      },
      http2: {
        count: this.protocolStats.http2.count,
        avgLatency: this.protocolStats.http2.count > 0 ?
          this.protocolStats.http2.totalLatency / this.protocolStats.http2.count : 0
      },
      http1: {
        count: this.protocolStats.http1.count,
        avgLatency: this.protocolStats.http1.count > 0 ?
          this.protocolStats.http1.totalLatency / this.protocolStats.http1.count : 0
      },
      udpTrackers: Array.from(this.protocolStats.udpTrackers)
    };

    return {
      average,
      min,
      max,
      variance,
      samples: this.latencyBuffer.length,
      protocols
    };
  }

  /**
   * Retourne le buffer de latence complet
   */
  getLatencyBuffer(): number[] {
    return [...this.latencyBuffer];
  }

  /**
   * Réinitialise les métriques
   */
  reset(): void {
    this.latencyBuffer = [];
    logger.info('[NetworkLatencyCollector] Buffer reset');
  }

  /**
   * Simule une latence réseau pour les tests
   */
  simulateLatency(min: number = 10, max: number = 100, jitter: number = 0.2): void {
    const baseLatency = min + Math.random() * (max - min);
    const jitteredLatency = baseLatency * (1 + (Math.random() - 0.5) * jitter);
    this.recordLatency(jitteredLatency);
  }
}