/**
 * CountermeasureHandler.ts
 * Gestionnaire des contre-mesures de rituels dans le content script
 * Reçoit les messages du background et applique les modifications DOM/réseau de manière sécurisée
 *
 * Now includes FingerprintProtection integration for deterministic,
 * session-consistent anti-fingerprinting that is much harder to detect
 * than the legacy FINGERPRINT_POISON approach.
 */

import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';
import { FingerprintProtection } from '../countermeasures/FingerprintProtection';

export interface CountermeasureConfig {
  countermeasure: 'NETWORK_LATENCY' | 'DOM_NOISE' | 'FINGERPRINT_POISON' | 'FINGERPRINT_PROTECTION';
  config: any;
  trackerPatterns?: string[];
}

export class CountermeasureHandler {
  private activeCountermeasures: Map<string, any> = new Map();
  private originalFunctions: Map<string, any> = new Map();
  /** Deterministic fingerprint protection (session-scoped noise) */
  private fingerprintProtection: FingerprintProtection = new FingerprintProtection();

  constructor() {
    this.initialize();
  }

  /**
   * Initialise le gestionnaire
   */
  private initialize(): void {
    // Écouter les messages du background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'INJECT_COUNTERMEASURE') {
        this.handleCountermeasure(message.payload);
        sendResponse({ success: true });
      } else if (message.type === 'ANALYZE_TRACKERS') {
        const trackers = this.analyzePageTrackers();
        sendResponse({ trackers });
      } else if (message.type === 'EXTRACT_HIDDEN_ELEMENTS') {
        const config = message.payload || {};
        const elements = this.extractHiddenElements(config);
        sendResponse({ elements });
      }
      return true;
    });
  }

  /**
   * Gère l'application d'une contre-mesure
   */
  private handleCountermeasure(payload: CountermeasureConfig): void {
    const { countermeasure, config } = payload;

    switch (countermeasure) {
      case 'NETWORK_LATENCY':
        this.applyNetworkLatency(payload);
        break;
      case 'DOM_NOISE':
        this.applyDOMNoise(config);
        break;
      case 'FINGERPRINT_POISON':
        this.applyFingerprintPoison(config);
        break;
      case 'FINGERPRINT_PROTECTION':
        this.applyFingerprintProtection(config);
        break;
      default:
        logger.warn('[CountermeasureHandler] Unknown countermeasure:', countermeasure);
    }
  }

  /**
   * Applies the new deterministic FingerprintProtection.
   *
   * Unlike FINGERPRINT_POISON (which uses random noise per call and is
   * detectable via repeated comparison), this uses session-scoped
   * deterministic noise: same results within a session, different
   * between sessions.
   */
  private applyFingerprintProtection(config: any): void {
    const { duration } = config;

    if (this.fingerprintProtection.isActive()) {
      logger.debug('[CountermeasureHandler] FingerprintProtection already active');
      return;
    }

    this.fingerprintProtection.activate();

    this.activeCountermeasures.set('fingerprint_protection', {
      startTime: Date.now(),
      duration,
      protections: this.fingerprintProtection.getActiveProtections(),
    });

    logger.info('[CountermeasureHandler] FingerprintProtection activated', {
      protections: this.fingerprintProtection.getActiveProtections(),
      duration,
    });

    // Schedule deactivation if duration specified
    if (duration && duration > 0) {
      setTimeout(() => {
        this.fingerprintProtection.deactivate();
        this.activeCountermeasures.delete('fingerprint_protection');
        logger.debug('[CountermeasureHandler] FingerprintProtection expired');
      }, duration);
    }
  }

  /**
   * Applique des latences réseau aux trackers
   */
  private applyNetworkLatency(payload: CountermeasureConfig): void {
    const { trackerPatterns = [], config } = payload;
    const { minDelay, maxDelay, duration } = config;

    // Sauvegarder les fonctions originales
    if (!this.originalFunctions.has('fetch')) {
      this.originalFunctions.set('fetch', window.fetch);
    }
    if (!this.originalFunctions.has('XMLHttpRequest.open')) {
      this.originalFunctions.set('XMLHttpRequest.open', XMLHttpRequest.prototype.open);
    }

    const originalFetch = this.originalFunctions.get('fetch');
    const originalXHROpen = this.originalFunctions.get('XMLHttpRequest.open');

    // Override fetch avec délai pour les trackers
    (window as any).fetch = function(...args: any[]) {
      const url = args[0]?.toString() || '';
      const shouldDelay = trackerPatterns.some(pattern => url.includes(pattern));

      if (shouldDelay) {
        const delay = SecureRandom.between(minDelay, maxDelay);
        logger.debug('[CountermeasureHandler] Delaying tracker fetch:', url, delay + 'ms');

        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(originalFetch.apply(window, args));
          }, delay);
        });
      }

      return originalFetch.apply(window, args);
    };

    // Override XMLHttpRequest avec délai pour les trackers
    XMLHttpRequest.prototype.open = function(method: string, url: string, ...rest: any[]) {
      const shouldDelay = trackerPatterns.some(pattern => url.includes(pattern));

      if (shouldDelay) {
        const delay = SecureRandom.between(minDelay, maxDelay);
        logger.debug('[CountermeasureHandler] Delaying tracker XHR:', url, delay + 'ms');

        const originalSend = this.send;
        const xhr = this;
        this.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
          setTimeout(() => {
            originalSend.call(xhr, body);
          }, delay);
        };
      }

      return originalXHROpen.apply(this, [method, url, ...rest]);
    };

    // Planifier la restauration
    setTimeout(() => {
      this.restoreNetworkFunctions();
    }, duration);

    this.activeCountermeasures.set('network_latency', {
      startTime: Date.now(),
      duration
    });
  }

  /**
   * Applique du bruit DOM
   */
  private applyDOMNoise(config: any): void {
    const { minInterval, maxInterval, duration, noiseIntensity } = config;

    let intervalId: number | null = null;

    const injectNoise = () => {
      // Créer un élément invisible temporaire
      const noise = document.createElement('div');
      noise.style.display = 'none';
      noise.className = 'symbiont-noise-' + SecureRandom.generateId(9);
      noise.setAttribute('data-noise', Date.now().toString());

      // L'ajouter et le retirer rapidement
      document.body.appendChild(noise);
      setTimeout(() => noise.remove(), 10);

      // Modifier des attributs sur des éléments aléatoires (avec parcimonie)
      if (SecureRandom.random() < noiseIntensity) {
        const elements = document.querySelectorAll('div, span, p');
        if (elements.length > 0) {
          const randomIndex = SecureRandom.between(0, elements.length - 1);
          const randomElement = elements[randomIndex];
          const originalValue = randomElement.getAttribute('data-symbiont');

          randomElement.setAttribute('data-symbiont', SecureRandom.generateId(8));

          setTimeout(() => {
            if (originalValue) {
              randomElement.setAttribute('data-symbiont', originalValue);
            } else {
              randomElement.removeAttribute('data-symbiont');
            }
          }, 100);
        }
      }

      // Planifier le prochain bruit
      const nextInterval = SecureRandom.between(minInterval, maxInterval);
      intervalId = window.setTimeout(() => {
        if (this.activeCountermeasures.has('dom_noise')) {
          injectNoise();
        }
      }, nextInterval);
    };

    // Démarrer l'injection de bruit
    injectNoise();

    // Planifier l'arrêt
    setTimeout(() => {
      if (intervalId) {
        clearTimeout(intervalId);
      }
      this.activeCountermeasures.delete('dom_noise');
      logger.debug('[CountermeasureHandler] DOM noise stopped');
    }, duration);

    this.activeCountermeasures.set('dom_noise', {
      startTime: Date.now(),
      duration
    });
  }

  /**
   * Applique l'empoisonnement du fingerprinting
   */
  private applyFingerprintPoison(config: any): void {
    const { timezoneNoise, canvasNoise, screenNoise, audioNoise, duration } = config;

    const poisonedFunctions: string[] = [];

    // Sauvegarder les originaux
    if (timezoneNoise && !this.originalFunctions.has('getTimezoneOffset')) {
      this.originalFunctions.set('getTimezoneOffset', Date.prototype.getTimezoneOffset);

      // Ajouter du bruit au timezone
      const handler = this;
      (Date.prototype as any).getTimezoneOffset = function() {
        const original = handler.originalFunctions.get('getTimezoneOffset');
        const offset = original.call(this);
        return offset + (SecureRandom.random() > 0.5 ? 60 : -60);
      };

      poisonedFunctions.push('timezone');
    }

    if (canvasNoise && !this.originalFunctions.has('toDataURL')) {
      this.originalFunctions.set('toDataURL', HTMLCanvasElement.prototype.toDataURL);

      // Ajouter du bruit au canvas
      const handler = this;
      (HTMLCanvasElement.prototype as any).toDataURL = function(...args: any[]) {
        const ctx = this.getContext('2d');
        if (ctx) {
          // Ajouter un pixel presque invisible
          const imageData = ctx.getImageData(0, 0, 1, 1);
          imageData.data[3] = SecureRandom.between(1, 5);
          ctx.putImageData(imageData, 0, 0);
        }
        const original = handler.originalFunctions.get('toDataURL');
        return original.apply(this, args);
      };

      poisonedFunctions.push('canvas');
    }

    if (screenNoise) {
      // Ajouter du bruit aux dimensions d'écran
      Object.defineProperty(screen, 'width', {
        get: () => window.screen.width + (SecureRandom.random() > 0.5 ? 1 : -1),
        configurable: true
      });

      Object.defineProperty(screen, 'height', {
        get: () => window.screen.height + (SecureRandom.random() > 0.5 ? 1 : -1),
        configurable: true
      });

      poisonedFunctions.push('screen');
    }

    logger.debug('[CountermeasureHandler] Fingerprint poison activated:', poisonedFunctions);

    // Planifier la restauration
    setTimeout(() => {
      this.restoreFingerprintFunctions();
    }, duration);

    this.activeCountermeasures.set('fingerprint_poison', {
      startTime: Date.now(),
      duration,
      functions: poisonedFunctions
    });
  }

  /**
   * Analyse la page pour détecter les trackers
   */
  private analyzePageTrackers(): any[] {
    const trackers: any[] = [];

    // Analyser les scripts
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = script.getAttribute('src') || '';
      const trackerPatterns = [
        'google-analytics', 'googletagmanager', 'doubleclick',
        'facebook.com/tr', 'analytics', 'telemetry', 'tracking',
        'metrics', 'pixel', 'beacon', 'collect'
      ];

      for (const pattern of trackerPatterns) {
        if (src.includes(pattern)) {
          trackers.push({
            domain: new URL(src, window.location.origin).hostname,
            selector: `script[src*="${pattern}"]`,
            method: 'script',
            confidence: 0.85
          });
        }
      }
    });

    // Analyser les images de tracking
    const images = document.querySelectorAll('img[src*="pixel"], img[src*="beacon"]');
    images.forEach(img => {
      const src = img.getAttribute('src') || '';
      trackers.push({
        domain: new URL(src, window.location.origin).hostname,
        selector: 'img[src*="pixel"]',
        method: 'img',
        confidence: 0.8
      });
    });

    return trackers;
  }

  /**
   * Extrait les éléments cachés pour l'analyse structurelle
   * @param config Configuration pour l'extraction
   * @returns Tableau des éléments cachés détectés
   * @since 1.2.0 - Ajout de la détection z-index négatif (Phase 1.2)
   */
  private extractHiddenElements(config?: {
    maxElements?: number;
    depth?: number;
    includeZIndex?: boolean;
  }): any[] {
    const maxElements = config?.maxElements || 100;
    const maxDepth = config?.depth || 3;
    const includeZIndex = config?.includeZIndex ?? false; // Phase 1.2: détection z-index
    const hiddenElements: any[] = [];

    // 1. Extraire les commentaires HTML (limité)
    const walkComments = (node: Node, depth: number = 0) => {
      if (depth > maxDepth || hiddenElements.length >= maxElements) return;

      if (node.nodeType === Node.COMMENT_NODE) {
        const content = node.nodeValue?.trim() || '';
        if (content && !content.startsWith('[if') && content.length > 10) {
          hiddenElements.push({
            type: 'comment',
            content: content.substring(0, 200),
            location: (node.parentElement?.tagName || 'document').toLowerCase(),
            significance: content.includes('http') || content.includes('api') ? 0.8 : 0.3
          });
        }
      }

      // Limiter la récursion
      if (node.childNodes.length < 100) {
        for (const child of node.childNodes) {
          if (hiddenElements.length >= maxElements) break;
          walkComments(child, depth + 1);
        }
      }
    };
    walkComments(document.documentElement);

    // 2. Meta tags non standards (limité à 20)
    const metaTags = Array.from(document.querySelectorAll('meta')).slice(0, 20);
    metaTags.forEach(meta => {
      if (hiddenElements.length >= maxElements) return;

      const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
      const content = meta.getAttribute('content') || '';

      if (name && content && !['viewport', 'description', 'keywords'].includes(name)) {
        hiddenElements.push({
          type: 'meta',
          content: `${name}: ${content.substring(0, 200)}`,
          location: 'head',
          significance: name.includes('og:') || name.includes('twitter:') ? 0.6 : 0.4
        });
      }
    });

    // 3. Liens cachés (limité à 20)
    const links = Array.from(document.querySelectorAll('link')).slice(0, 20);
    links.forEach(link => {
      if (hiddenElements.length >= maxElements) return;

      const rel = link.getAttribute('rel') || '';
      const href = link.getAttribute('href') || '';

      if (href && !['stylesheet', 'icon', 'manifest'].includes(rel)) {
        hiddenElements.push({
          type: 'link',
          content: `${rel}: ${href.substring(0, 200)}`,
          location: 'head',
          significance: ['alternate', 'prefetch', 'preconnect'].includes(rel) ? 0.7 : 0.5
        });
      }
    });

    // 4. Éléments visuellement cachés (limité par querySelectorAll)
    const hiddenDivs = document.querySelectorAll('div[style*="display: none"], div[style*="visibility: hidden"]');
    const limitedHiddenDivs = Array.from(hiddenDivs).slice(0, 10);

    limitedHiddenDivs.forEach(element => {
      if (hiddenElements.length >= maxElements) return;

      const text = element.textContent?.trim().substring(0, 100);
      if (text) {
        hiddenElements.push({
          type: 'hidden',
          content: text,
          location: element.tagName.toLowerCase(),
          significance: 0.5,
          pattern: 'visually_hidden'
        });
      }
    });

    // 5. Data attributes intéressants (limité)
    const dataElements = document.querySelectorAll('[data-api], [data-endpoint], [data-url], [data-config]');
    const limitedDataElements = Array.from(dataElements).slice(0, 10);

    limitedDataElements.forEach(element => {
      if (hiddenElements.length >= maxElements) return;

      Array.from(element.attributes).forEach(attr => {
        if (attr.name.startsWith('data-') && attr.value.length > 10) {
          hiddenElements.push({
            type: 'data',
            content: `${attr.name}: ${attr.value.substring(0, 100)}`,
            location: element.tagName.toLowerCase(),
            significance: 0.6
          });
        }
      });
    });

    // 6. Phase 1.2: Détection optimisée des éléments avec z-index négatif
    if (includeZIndex) {
      // Utilisation de requestIdleCallback pour éviter le freeze du navigateur
      const detectNegativeZIndex = (deadline: IdleDeadline) => {
        try {
          // Sélecteur optimisé: cibler uniquement les éléments potentiellement cachés
          const suspectSelectors = [
            '[style*="z-index"]',
            'iframe',
            'object',
            'embed',
            '.hidden',
            '[hidden]',
            '[data-tracking]',
            '[data-analytics]'
          ].join(',');

          const elements = document.querySelectorAll(suspectSelectors);
          const maxToCheck = Math.min(elements.length, 100); // Limiter à 100 éléments
          let checkedCount = 0;

          // Batch processing avec vérification du temps restant
          for (let i = 0; i < maxToCheck; i++) {
            if (hiddenElements.length >= maxElements) break;

            // Vérifier si on a encore du temps dans cette frame
            if (deadline.timeRemaining() <= 0 && checkedCount > 10) {
              // Reporter le reste au prochain idle callback
              logger.debug('Z-index detection deferred to next idle period', {
                checked: checkedCount,
                remaining: maxToCheck - checkedCount
              });
              break;
            }

            const element = elements[i] as HTMLElement;

            // Vérification rapide du style inline d'abord (plus rapide que getComputedStyle)
            const inlineZIndex = element.style.zIndex;
            let zIndexValue: string | null = null;

            if (inlineZIndex && inlineZIndex !== 'auto') {
              zIndexValue = inlineZIndex;
            } else {
              // Seulement si nécessaire, utiliser getComputedStyle
              const computedStyle = window.getComputedStyle(element);
              zIndexValue = computedStyle.zIndex;
            }

            // Vérifier si z-index est négatif
            if (zIndexValue && zIndexValue !== 'auto') {
              const zIndex = parseInt(zIndexValue);
              if (zIndex < 0) {
                // Utiliser getBoundingClientRect une seule fois
                const rect = element.getBoundingClientRect();

                // Extraction optimisée du contenu
                const content = element.textContent?.trim().substring(0, 100) ||
                              element.getAttribute('src') ||
                              element.getAttribute('href') ||
                              element.id ||
                              element.className.substring(0, 50);

                if (content) {
                  hiddenElements.push({
                    type: 'z-index-negative',
                    content: content,
                    location: element.tagName.toLowerCase(),
                    significance: 0.9, // Très suspect
                    pattern: 'negative_z_index',
                    metadata: {
                      zIndex: zIndex,
                      visible: rect.width > 0 && rect.height > 0
                    }
                  });

                  // Log moins fréquent (seulement les premiers)
                  if (hiddenElements.filter(el => el.type === 'z-index-negative').length <= 3) {
                    logger.warn('Negative z-index element detected', {
                      tag: element.tagName,
                      zIndex: zIndex
                    });
                  }
                }
              }
            }
            checkedCount++;
          }
        } catch (error) {
          logger.error('Error detecting z-index elements', { error });
        }
      };

      // Exécuter pendant les périodes d'inactivité
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(detectNegativeZIndex, { timeout: 2000 });
      } else {
        // Fallback pour navigateurs sans requestIdleCallback
        setTimeout(() => detectNegativeZIndex({
          timeRemaining: () => 50,
          didTimeout: false
        } as IdleDeadline), 100);
      }
    }

    // Analyser les patterns suspects
    const suspiciousPatterns = this.analyzeSuspiciousPatterns(hiddenElements);

    // Retourner les résultats avec métadonnées
    return hiddenElements.slice(0, maxElements);
  }

  /**
   * Analyse les patterns suspects dans les éléments cachés
   * @param elements Éléments cachés à analyser
   * @returns Nombre de patterns suspects détectés
   */
  private analyzeSuspiciousPatterns(elements: any[]): number {
    let suspiciousCount = 0;

    elements.forEach(element => {
      const content = element.content?.toLowerCase() || '';

      // Patterns suspects
      if (content.includes('track') ||
          content.includes('analytics') ||
          content.includes('pixel') ||
          content.includes('beacon') ||
          content.includes('telemetry') ||
          content.includes('fingerprint') ||
          element.type === 'z-index-negative') {
        suspiciousCount++;
      }
    });

    return suspiciousCount;
  }

  /**
   * Compte les éléments par type
   * @param elements Éléments à compter
   * @returns Objet avec le compte par type
   */
  private countByType(elements: any[]): Record<string, number> {
    const counts: Record<string, number> = {};

    elements.forEach(element => {
      counts[element.type] = (counts[element.type] || 0) + 1;
    });

    return counts;
  }

  /**
   * Restaure les fonctions réseau originales
   */
  private restoreNetworkFunctions(): void {
    if (this.originalFunctions.has('fetch')) {
      (window as any).fetch = this.originalFunctions.get('fetch');
    }
    if (this.originalFunctions.has('XMLHttpRequest.open')) {
      XMLHttpRequest.prototype.open = this.originalFunctions.get('XMLHttpRequest.open');
    }

    this.activeCountermeasures.delete('network_latency');
    logger.debug('[CountermeasureHandler] Network functions restored');
  }

  /**
   * Restaure les fonctions de fingerprinting
   */
  private restoreFingerprintFunctions(): void {
    if (this.originalFunctions.has('getTimezoneOffset')) {
      Date.prototype.getTimezoneOffset = this.originalFunctions.get('getTimezoneOffset');
      this.originalFunctions.delete('getTimezoneOffset');
    }

    if (this.originalFunctions.has('toDataURL')) {
      HTMLCanvasElement.prototype.toDataURL = this.originalFunctions.get('toDataURL');
      this.originalFunctions.delete('toDataURL');
    }

    // Restaurer les propriétés d'écran
    delete (screen as any).width;
    delete (screen as any).height;

    this.activeCountermeasures.delete('fingerprint_poison');
    logger.debug('[CountermeasureHandler] Fingerprint functions restored');
  }

  /**
   * Check if the deterministic FingerprintProtection is currently active.
   */
  public isFingerprintProtectionActive(): boolean {
    return this.fingerprintProtection.isActive();
  }

  /**
   * Nettoie toutes les contre-mesures actives
   */
  public cleanup(): void {
    // Restaurer toutes les fonctions
    this.restoreNetworkFunctions();
    this.restoreFingerprintFunctions();

    // Deactivate deterministic fingerprint protection
    if (this.fingerprintProtection.isActive()) {
      this.fingerprintProtection.deactivate();
    }

    // Nettoyer les contre-mesures actives
    this.activeCountermeasures.clear();

    logger.info('[CountermeasureHandler] All countermeasures cleaned up');
  }
}

// Export singleton
export const countermeasureHandler = new CountermeasureHandler();