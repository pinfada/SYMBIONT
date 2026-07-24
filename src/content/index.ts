// src/content/index.ts
// Point d'entrée Content Script avec WebGL Organism Renderer
//console.log('[SYMBIONT] Content script loading...');

import { MessageBus } from '../core/messaging/MessageBus';
import { NavigationObserver } from '../shared/observers/NavigationObserver';
import { InteractionCollector } from './collectors/InteractionCollector';
import { DOMAnalyzer } from './observers/DOMAnalyzer';
import { DOMResonanceSensor } from './observers/DOMResonanceSensor';
import { ScrollTracker } from './observers/ScrollTracker';
import { AttentionMonitor } from './monitors/AttentionMonitor';
import { logger } from '@shared/utils/secureLogger';
// Import du gestionnaire de contre-mesures pour les rituels
import { countermeasureHandler } from './rituals/CountermeasureHandler';

//console.log('[SYMBIONT] Importing WebGL modules...');

// Import du renderer WebGL et du contrôleur conscient
import './webgl/OrganismRenderer';
// Import et activation explicite du contrôleur conscient
import { ConsciousOrganismController } from './webgl/ConsciousOrganismController';

// Activer le système de conscience après un court délai pour s'assurer que le DOM est prêt
setTimeout(() => {
  // Forcer l'activation du système de conscience
  ConsciousOrganismController.getInstance();
  logger.info('🧠 Conscious Organism Controller activated in content script');
}, 100);

//console.log('[SYMBIONT] WebGL modules imported');

/**
 * ContentScript - Système sensoriel de SYMBIONT
 * Collecte les données comportementales dans la page web
 */
class ContentScript {
  private static instance: ContentScript;
  
  private messageBus: MessageBus;
  private navigationObserver: NavigationObserver;
  private interactionCollector: InteractionCollector;
  private domAnalyzer: DOMAnalyzer;
  private domResonanceSensor: DOMResonanceSensor;
  private scrollTracker: ScrollTracker;
  private attentionMonitor: AttentionMonitor;
  
  // État local
  private pageData = {
    startTime: Date.now(),
    url: window.location.href,
    title: document.title,
    interactions: [] as InteractionEvent[],
    scrollData: {
      maxDepth: 0,
      totalDistance: 0,
      pattern: 'unknown' as ScrollPattern
    },
    attention: {
      totalActiveTime: 0,
      distractions: 0
    }
  };

  private latestLCP: number = 0;

  private constructor() {
    logger.info('🔍 SYMBIONT Content Script initializing...');
    
    this.messageBus = new MessageBus('content');
    this.navigationObserver = new NavigationObserver(this.messageBus);
    this.interactionCollector = new InteractionCollector(this.messageBus);
    this.domAnalyzer = new DOMAnalyzer();
    this.domResonanceSensor = new DOMResonanceSensor();
    this.scrollTracker = new ScrollTracker(this.messageBus);
    this.attentionMonitor = new AttentionMonitor(this.messageBus);
    
    this.initialize();
  }

  static getInstance(): ContentScript {
    if (!ContentScript.instance) {
      ContentScript.instance = new ContentScript();
    }
    return ContentScript.instance;
  }

  private initialize(): void {
    // Initialisation des observateurs
    this.setupObservers();
    this.setupEventListeners();
    this.performInitialAnalysis();
    
    // Nettoyage à la fermeture
    window.addEventListener('beforeunload', this.cleanup.bind(this));
    
    logger.info('✅ SYMBIONT Content Script ready');
  }

  private setupObservers(): void {
    // Observation de la navigation SPA
    (this.navigationObserver as any).observe((change: NavigationChange) => {
      this.handleNavigationChange(change);
    });

    // Collection des interactions
    this.interactionCollector.start({
      clicks: true,
      keypresses: true,
      forms: true,
      media: true
    });

    this.interactionCollector.on('interaction', (interaction) => {
      this.handleInteraction(interaction);
    });

    // Tracking du scroll
    this.scrollTracker.on('scroll', (data: any) => {
      if (data && typeof data === 'object' && 'timestamp' in data) {
        this.updateScrollData(data as ScrollEvent);
      }
    });

    // Monitoring de l'attention
    this.attentionMonitor.on('attentionChange', (state: any) => {
      if (state && typeof state === 'object' && 'isActive' in state) {
        this.handleAttentionChange(state as AttentionState);
      }
    });

    // Démarrage du capteur de résonance DOM
    this.domResonanceSensor.start();
    logger.info('🌊 DOM Resonance Sensor activated');
  }

  private setupEventListeners(): void {
    // Visibilité de la page
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
    
    // Focus/Blur de la fenêtre
    window.addEventListener('focus', () => this.handleWindowFocus(true));
    window.addEventListener('blur', () => this.handleWindowFocus(false));
    
    // Événements de performance
    if ('PerformanceObserver' in window) {
      this.setupPerformanceObserver();
    }
    
    // Communication avec background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.messageBus.emit(message.type, {
        message,
        sender,
        sendResponse
      });
      return true; // keep channel open for async
    });
  }

  private setupPerformanceObserver(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          this.latestLCP = entry.startTime;
          this.handleLCP(entry as PerformanceEntry);
        }
      }
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  }

  private async performInitialAnalysis(): Promise<void> {
    // Analyse DOM initiale
    const domAnalysis = await this.domAnalyzer.analyze();
    
    // Extraction du contenu principal
    this.analyzeMainContent();
    
    // Catégorisation de la page
    const pageCategory = this.domAnalyzer.categorizeContent();
    
    // Signale la visite de page au background : c'est ce message qui
    // alimente l'évolution des traits de l'organisme selon la navigation
    // (updateOrganismTraits) et crée l'entrée comportementale associée.
    this.messageBus.sendToBackground({
      type: 'PAGE_VISIT',
      payload: {
        url: this.pageData.url,
        title: this.pageData.title,
        category: pageCategory
      }
    });

    // Envoi de l'analyse initiale
    this.messageBus.sendToBackground({
      type: 'PAGE_ANALYSIS_COMPLETE',
      payload: {
        url: this.pageData.url,
        title: this.pageData.title,
        category: pageCategory,
        contentMetrics: {
          wordCount: domAnalysis.wordCount,
          imageCount: domAnalysis.imageCount,
          videoCount: domAnalysis.videoCount,
          linkCount: domAnalysis.linkCount,
          readingTime: domAnalysis.estimatedReadingTime
        },
        performance: {
          loadTime: performance.now(),
          resourceCount: performance.getEntriesByType('resource').length
        }
      }
    });
  }

  private analyzeMainContent(): void {
    this.domAnalyzer.extractMainContent();
  }

  private handleInteraction(interaction: InteractionEvent): void {
    // Enrichissement avec le contexte
    const enrichedInteraction = {
      ...interaction,
      pageContext: {
        url: this.pageData.url,
        title: this.pageData.title,
        timeOnPage: Date.now() - this.pageData.startTime
      }
    };
    
    this.pageData.interactions.push(enrichedInteraction);
    
    // Envoi temps réel pour les interactions importantes
    if (this.isSignificantInteraction(interaction)) {
      this.messageBus.sendToBackground({
        type: 'INTERACTION_DETECTED',
        payload: enrichedInteraction
      });
    }
  }

  private isSignificantInteraction(interaction: InteractionEvent): boolean {
    // Définir ce qui constitue une interaction significative
    return (
      interaction.type === 'form_submit' ||
      interaction.type === 'video_play' ||
      (interaction.type === 'click' && interaction.data.isNavigation) ||
      (interaction.type === 'keypress' && interaction.data.isShortcut)
    );
  }

  private updateScrollData(data: ScrollEvent): void {
    this.pageData.scrollData.maxDepth = Math.max(
      this.pageData.scrollData.maxDepth,
      data.depth
    );
    
    this.pageData.scrollData.totalDistance += Math.abs(data.delta);
    
    // Détection du pattern de scroll
    this.pageData.scrollData.pattern = this.scrollTracker.getScrollPattern();
  }

  private handleAttentionChange(state: AttentionState): void {
    // Mise à jour des métriques d'attention
    if (state.isActive) {
      this.pageData.attention.totalActiveTime += state.duration || 0;
    } else {
      this.pageData.attention.distractions++;
    }
    
    // Notification au background
    this.messageBus.sendToBackground({
      type: 'ATTENTION_UPDATE',
      payload: {
        url: this.pageData.url,
        state,
        duration: Date.now() - this.pageData.startTime
      }
    });
  }

  private handleNavigationChange(change: NavigationChange): void {
    // Sauvegarde des données de la page précédente
    this.finalizePage();
    
    // Réinitialisation pour la nouvelle page
    this.latestLCP = 0;
    this.pageData = {
      startTime: Date.now(),
      url: change.url,
      title: document.title,
      interactions: [],
      scrollData: {
        maxDepth: 0,
        totalDistance: 0,
        pattern: 'unknown'
      },
      attention: {
        totalActiveTime: 0,
        distractions: 0
      }
    };
    
    // Nouvelle analyse
    this.performInitialAnalysis();
  }

  private handleVisibilityChange(): void {
    const isVisible = document.visibilityState === 'visible';
    
    this.messageBus.sendToBackground({
      type: 'VISIBILITY_CHANGE',
      payload: {
        url: this.pageData.url,
        isVisible,
        timestamp: Date.now()
      }
    });
    
    // Pause/Resume du monitoring d'attention
    if (isVisible) {
      this.attentionMonitor.start();
    } else {
      this.attentionMonitor.stop();
    }
  }

  private handleWindowFocus(hasFocus: boolean): void {
    this.messageBus.sendToBackground({
      type: 'FOCUS_CHANGE',
      payload: {
        url: this.pageData.url,
        hasFocus,
        timestamp: Date.now()
      }
    });
  }

  private finalizePage(): void {
    const duration = Date.now() - this.pageData.startTime;
    
    // Ne pas finaliser si durée très courte (prob navigation rapide)
    if (duration < 1000) return;
    
    // Compilation des données finales
    const pageSession = {
      url: this.pageData.url,
      title: this.pageData.title,
      startTime: this.pageData.startTime,
      duration,
      interactions: this.pageData.interactions,
      scrollData: this.pageData.scrollData,
      attention: {
        totalActiveTime: this.pageData.attention.totalActiveTime,
        distractionCount: this.pageData.attention.distractions,
        focusPeriods: this.attentionMonitor.getStats().focusPeriods || []
      },
      performance: this.collectPerformanceMetrics()
    };
    
    // Réinitialise latestLCP pour la prochaine page
    this.latestLCP = 0;
    
    // Envoi au background
    this.messageBus.sendToBackground({
      type: 'PAGE_SESSION_COMPLETE',
      payload: pageSession
    });
  }

  private collectPerformanceMetrics(): PerformanceMetrics {
    const entries = performance.getEntriesByType('navigation');
    const navigation = entries.length > 0 ? entries[0] as PerformanceNavigationTiming : null;
    
    return {
      loadTime: navigation ? navigation.loadEventEnd - navigation.startTime : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.startTime : 0,
      firstPaint: this.getFirstPaint(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      largestContentfulPaint: this.latestLCP,
      resourceCount: performance.getEntriesByType('resource').length
    };
  }

  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : 0;
  }

  private handleLCP(entry: PerformanceEntry): void {
    // Notification optionnelle sur LCP
    if (entry.startTime > 2500) { // Seuil critique LCP > 2.5s
      logger.debug('Slow LCP detected:', entry.startTime);
    }
  }

  private cleanup(): void {
    // Finalisation de la session
    this.finalizePage();

    // Nettoyage des observateurs
    (this.navigationObserver as any).disconnect();
    this.interactionCollector.stop();
    this.scrollTracker.stop();
    this.attentionMonitor.stop();
    this.domResonanceSensor.stop();

    // Nettoyage des contre-mesures de rituels
    countermeasureHandler.cleanup();

    logger.info('🧹 SYMBIONT Content Script cleaned up');
  }
}

// Types internes supplémentaires
interface InteractionEvent {
  type: string;
  timestamp: number;
  target: string;
  data: Record<string, any>;
}

interface ScrollEvent {
  timestamp: number;
  depth: number;
  velocity: number;
  delta: number;
  direction: 'up' | 'down';
}

interface AttentionState {
  isActive: boolean;
  engagement: 'high' | 'medium' | 'low';
  distractions: number;
  duration?: number;
}

export interface NavigationChange {
  type: 'pushstate' | 'replacestate' | 'popstate' | 'hashchange';
  url: string;
  timestamp: number;
}

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  resourceCount: number;
}

export type ScrollPattern = 'fast_scan' | 'deep_read' | 'search' | 'skim' | 'unknown';

// Point d'entrée avec protection contre les injections multiples
if (!window.__SYMBIONT_CONTENT_SCRIPT_LOADED__) {
  window.__SYMBIONT_CONTENT_SCRIPT_LOADED__ = true;
  ContentScript.getInstance();
}

// Déclaration pour TypeScript
declare global {
  interface Window {
    __SYMBIONT_CONTENT_SCRIPT_LOADED__: boolean;
  }
}