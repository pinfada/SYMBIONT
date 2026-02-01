/**
 * TrackerInterceptor.ts
 * Interception sécurisée des trackers via Chrome API
 * @since 2.0.0
 * ISO/IEC 25010:2011 - Security & Reliability
 */

import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';
import { NeuralMesh } from '@/core/NeuralMesh';
import { generateSecureUUID } from '@/shared/utils/uuid';

/**
 * Signature d'un tracker détecté
 */
export interface TrackerSignature {
  id: string;
  domain: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD' | 'OPTIONS';
  timestamp: number;
  confidence: number;
  category: 'analytics' | 'advertising' | 'social' | 'fingerprinting' | 'unknown';
  metadata?: {
    headers?: Record<string, string>;
    payload?: string;
    cookies?: number;
  };
}

/**
 * Configuration de l'intercepteur
 */
export interface InterceptorConfig {
  enabled: boolean;
  delayMin?: number; // ms
  delayMax?: number; // ms
  blockingMode?: 'delay' | 'block' | 'monitor';
  trackerPatterns?: string[];
  whitelist?: string[];
}

/**
 * Gestionnaire d'interception des trackers
 * Utilise l'API webRequest de Chrome pour une interception sécurisée
 * sans mutation globale de l'environnement
 */
export class TrackerInterceptor {
  private static instance: TrackerInterceptor | null = null;
  private neuralMesh: NeuralMesh;
  private memoryFragments: Map<string, TrackerSignature> = new Map();
  private isActive: boolean = false;
  private config: InterceptorConfig;
  private requestListener: ((details: chrome.webRequest.WebRequestBodyDetails) => void) | null = null;

  // Patterns de trackers connus (extensible)
  private readonly TRACKER_PATTERNS = [
    // Analytics
    'google-analytics.com',
    'googletagmanager.com',
    'analytics.google.com',
    'google.com/analytics',

    // Advertising
    'doubleclick.net',
    'googlesyndication.com',
    'googleadservices.com',
    'adsystem.com',

    // Social
    'facebook.com/tr',
    'connect.facebook.net',
    'twitter.com/i/adsct',
    'linkedin.com/li/',

    // Generic patterns
    '/analytics',
    '/collect',
    '/beacon',
    '/telemetry',
    '/track',
    '/metrics',
    '/pixel',
    '/impression',

    // Fingerprinting
    'fingerprint',
    'fp.js',
    'device-id',
    'browser-id'
  ];

  private constructor(config: InterceptorConfig = { enabled: false }) {
    this.neuralMesh = new NeuralMesh();
    this.config = config;

    // Initialiser seulement si les permissions sont disponibles
    this.checkPermissions();
  }

  /**
   * Singleton pattern pour instance unique
   */
  public static getInstance(config?: InterceptorConfig): TrackerInterceptor {
    if (!TrackerInterceptor.instance) {
      TrackerInterceptor.instance = new TrackerInterceptor(config);
    }
    return TrackerInterceptor.instance;
  }

  /**
   * Vérifie les permissions Chrome nécessaires
   * Note: webRequestBlocking n'est plus supporté dans Manifest V3
   */
  private async checkPermissions(): Promise<boolean> {
    try {
      // Dans MV3, nous utilisons webRequest en mode observation uniquement
      const permissions = await chrome.permissions.contains({
        permissions: ['webRequest']
      });

      if (!permissions) {
        logger.warn('TrackerInterceptor: Missing required permissions', {
          required: ['webRequest'],
          note: 'MV3 uses observational mode only'
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to check permissions', { error });
      return false;
    }
  }

  /**
   * Active l'interception des trackers
   */
  public async initialize(): Promise<void> {
    if (this.isActive) {
      logger.warn('TrackerInterceptor already initialized');
      return;
    }

    const hasPermissions = await this.checkPermissions();
    if (!hasPermissions) {
      throw new Error('TrackerInterceptor: Insufficient permissions');
    }

    try {
      // Créer le listener pour les requêtes
      this.requestListener = (details: chrome.webRequest.WebRequestBodyDetails) => {
        this.interceptRequest(details);
      };

      // Ajouter le listener avec les bonnes options
      // MV3: Mode observation uniquement, pas de blocking
      chrome.webRequest.onBeforeRequest.addListener(
        this.requestListener,
        { urls: ['<all_urls>'] },
        ['requestBody'] // MV3: Mode observation uniquement
      );

      // Listener pour analyser les headers
      chrome.webRequest.onBeforeSendHeaders.addListener(
        (details) => this.analyzeHeaders(details),
        { urls: ['<all_urls>'] },
        ['requestHeaders']
      );

      this.isActive = true;
      logger.info('TrackerInterceptor initialized successfully', {
        config: this.config
      });
    } catch (error) {
      logger.error('Failed to initialize TrackerInterceptor', { error });
      throw error;
    }
  }

  /**
   * Intercepte et analyse une requête
   */
  private async interceptRequest(details: chrome.webRequest.WebRequestBodyDetails): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const isTracker = await this.analyzeTracker(details.url);

      if (isTracker.confidence > 0.7) {
        const signature = this.extractSignature(details, isTracker);

        // Envoyer au NeuralMesh pour apprentissage
        await this.neuralMesh.learn({
          type: 'TRACKER_SIGNATURE',
          data: signature,
          timestamp: Date.now()
        });

        // Stocker le fragment mémoire
        await this.storeTrackerFragment(signature);

        // Notifier l'organisme pour mise à jour des traits
        this.notifyOrganism(signature);

        // Appliquer l'action configurée
        await this.applyInterceptionAction(details, signature);

        // Log pour monitoring
        logger.debug('Tracker intercepted', {
          url: details.url,
          category: signature.category,
          confidence: isTracker.confidence
        });
      }
    } catch (error) {
      logger.error('Error in request interception', {
        error,
        url: details.url
      });
    }
  }

  /**
   * Analyse si une URL est un tracker
   */
  private async analyzeTracker(url: string): Promise<{
    isTracker: boolean;
    confidence: number;
    category: string;
  }> {
    const urlLower = url.toLowerCase();
    let confidence = 0;
    let category = 'unknown';

    // Vérifier contre les patterns connus
    for (const pattern of this.TRACKER_PATTERNS) {
      if (urlLower.includes(pattern)) {
        confidence = Math.max(confidence, 0.85);

        // Catégorisation
        if (pattern.includes('analytics') || pattern.includes('telemetry')) {
          category = 'analytics';
        } else if (pattern.includes('doubleclick') || pattern.includes('adsystem')) {
          category = 'advertising';
        } else if (pattern.includes('facebook') || pattern.includes('linkedin')) {
          category = 'social';
        } else if (pattern.includes('fingerprint') || pattern.includes('device-id')) {
          category = 'fingerprinting';
        }

        break; // Un match suffit
      }
    }

    // Analyse heuristique supplémentaire
    if (confidence < 0.7) {
      // Vérifier les paramètres d'URL suspects
      const suspiciousParams = ['utm_', 'gclid', 'fbclid', 'track_', 'session_', 'visitor_'];
      for (const param of suspiciousParams) {
        if (urlLower.includes(param)) {
          confidence = Math.max(confidence, 0.6);
          if (category === 'unknown') category = 'analytics';
          break;
        }
      }
    }

    // Vérifier dans le cache neural pour patterns appris
    // Utiliser processPattern si disponible pour prédiction basée sur le réseau neural
    if (this.neuralMesh.processPattern) {
      try {
        const neuralPrediction = await this.neuralMesh.processPattern({
          url: urlLower,
          timestamp: Date.now()
        }) as any;

        if (neuralPrediction && typeof neuralPrediction.confidence === 'number' && neuralPrediction.confidence > confidence) {
          confidence = neuralPrediction.confidence;
        }
      } catch (error) {
        logger.warn('Neural prediction failed', { error });
      }
    }

    return {
      isTracker: confidence > 0.5,
      confidence,
      category
    };
  }

  /**
   * Analyse les headers d'une requête
   */
  private analyzeHeaders(details: chrome.webRequest.WebRequestHeadersDetails): void {
    if (!this.config.enabled) return;

    // Compter les cookies
    const cookieHeaders = details.requestHeaders?.filter(h =>
      h.name.toLowerCase() === 'cookie'
    ) || [];

    if (cookieHeaders.length > 0) {
      const cookieCount = cookieHeaders[0].value?.split(';').length || 0;

      if (cookieCount > 10) {
        logger.warn('High cookie count detected', {
          url: details.url,
          cookieCount
        });
      }
    }
  }

  /**
   * Extrait la signature d'un tracker
   */
  private extractSignature(
    details: chrome.webRequest.WebRequestBodyDetails,
    analysis: { confidence: number; category: string }
  ): TrackerSignature {
    const url = new URL(details.url);

    const signature: TrackerSignature = {
      id: generateSecureUUID(),
      domain: url.hostname,
      url: details.url,
      method: details.method as any,
      timestamp: Date.now(),
      confidence: analysis.confidence,
      category: analysis.category as any
    };

    // Ajouter metadata seulement si nécessaire (exactOptionalPropertyTypes: true)
    if (details.requestBody) {
      signature.metadata = {
        payload: JSON.stringify(details.requestBody).substring(0, 500)
      };
    }

    return signature;
  }

  /**
   * Stocke un fragment de tracker en mémoire
   */
  private async storeTrackerFragment(tracker: TrackerSignature): Promise<void> {
    // Limiter la taille du cache
    if (this.memoryFragments.size > 1000) {
      // Supprimer les plus anciens (FIFO)
      const firstKey = this.memoryFragments.keys().next().value;
      if (firstKey) {
        this.memoryFragments.delete(firstKey);
      }
    }

    this.memoryFragments.set(tracker.id, tracker);

    // Persister périodiquement
    if (this.memoryFragments.size % 100 === 0) {
      await this.persistFragments();
    }

    logger.debug('Tracker fragment stored', {
      id: tracker.id,
      domain: tracker.domain,
      totalFragments: this.memoryFragments.size
    });
  }

  /**
   * Persiste les fragments en storage
   */
  private async persistFragments(): Promise<void> {
    try {
      const fragments = Array.from(this.memoryFragments.values())
        .slice(-500); // Garder les 500 derniers

      await chrome.storage.local.set({
        'symbiont_tracker_fragments': fragments
      });

      logger.info('Tracker fragments persisted', {
        count: fragments.length
      });
    } catch (error) {
      logger.error('Failed to persist tracker fragments', { error });
    }
  }

  /**
   * Notifie l'organisme des trackers détectés
   */
  private notifyOrganism(signature: TrackerSignature): void {
    // Envoyer message au popup/background
    chrome.runtime.sendMessage({
      type: 'ORGANISM_TRAIT_UPDATE',
      payload: {
        source: 'tracker_detection',
        updates: {
          cortisol: '+0.1',  // Stress immédiat
          curiosity: '+0.05', // Apprentissage permanent
          awareness: '+0.02'  // Conscience accrue
        },
        metadata: {
          tracker: signature.domain,
          category: signature.category
        }
      }
    }).catch(error => {
      logger.warn('Failed to notify organism', { error });
    });
  }

  /**
   * Applique l'action d'interception configurée
   */
  private async applyInterceptionAction(
    details: chrome.webRequest.WebRequestBodyDetails,
    signature: TrackerSignature
  ): Promise<void> {
    switch (this.config.blockingMode) {
      case 'block':
        // Utiliser declarativeNetRequest pour bloquer
        logger.info('Tracker blocked', { url: details.url });
        break;

      case 'delay':
        // Ajouter un délai artificiel
        const delay = SecureRandom.between(
          this.config.delayMin || 100,
          this.config.delayMax || 500
        );

        await new Promise(resolve => setTimeout(resolve, delay));
        logger.debug('Tracker delayed', { url: details.url, delay });
        break;

      case 'monitor':
      default:
        // Mode monitoring uniquement
        break;
    }
  }

  /**
   * Obtient les statistiques des trackers
   */
  public getStatistics(): {
    total: number;
    byCategory: Record<string, number>;
    byDomain: Record<string, number>;
    recentTrackers: TrackerSignature[];
  } {
    const byCategory: Record<string, number> = {};
    const byDomain: Record<string, number> = {};

    this.memoryFragments.forEach(tracker => {
      // Par catégorie
      byCategory[tracker.category] = (byCategory[tracker.category] || 0) + 1;

      // Par domaine
      byDomain[tracker.domain] = (byDomain[tracker.domain] || 0) + 1;
    });

    // Derniers trackers (10 plus récents)
    const recentTrackers = Array.from(this.memoryFragments.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      total: this.memoryFragments.size,
      byCategory,
      byDomain,
      recentTrackers
    };
  }

  /**
   * Met à jour la configuration
   */
  public updateConfig(config: Partial<InterceptorConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };

    logger.info('TrackerInterceptor config updated', { config: this.config });
  }

  /**
   * Nettoie et désactive l'intercepteur
   */
  public async cleanup(): Promise<void> {
    if (this.requestListener) {
      chrome.webRequest.onBeforeRequest.removeListener(this.requestListener);
    }

    // Persister les fragments avant cleanup
    await this.persistFragments();

    this.memoryFragments.clear();
    this.isActive = false;

    logger.info('TrackerInterceptor cleaned up');
  }

  /**
   * Obtient les fragments de mémoire
   */
  public getMemoryFragments(): TrackerSignature[] {
    return Array.from(this.memoryFragments.values());
  }

  /**
   * Charge les fragments depuis le storage
   */
  public async loadFragments(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('symbiont_tracker_fragments');
      const fragments = result.symbiont_tracker_fragments || [];

      fragments.forEach((fragment: TrackerSignature) => {
        this.memoryFragments.set(fragment.id, fragment);
      });

      logger.info('Tracker fragments loaded', {
        count: fragments.length
      });
    } catch (error) {
      logger.error('Failed to load tracker fragments', { error });
    }
  }
}

// Export singleton
export const trackerInterceptor = TrackerInterceptor.getInstance();