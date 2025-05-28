// src/content/index.ts
// Point d'entrée Content Script
// src/content/index.ts
import { MessageBus } from '../core/messaging/MessageBus';
import { NavigationObserver } from '../shared/observers/NavigationObserver';
import { InteractionCollector } from './collectors/InteractionCollector';
import { DOMAnalyzer } from './observers/DOMAnalyzer';
import { ScrollTracker } from './observers/ScrollTracker';
import { AttentionMonitor } from './monitors/AttentionMonitor';

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

  private constructor() {
    console.log('🔍 SYMBIONT Content Script initializing...');
    
    this.messageBus = new MessageBus('content');
    this.navigationObserver = new NavigationObserver();
    this.interactionCollector = new InteractionCollector();
    this.domAnalyzer = new DOMAnalyzer();
    this.scrollTracker = new ScrollTracker();
    this.attentionMonitor = new AttentionMonitor();
    
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
    
    console.log('✅ SYMBIONT Content Script ready');
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
    this.scrollTracker.on('scroll', (data) => {
      this.updateScrollData(data);
    });
    
    // Monitoring de l'attention
    this.attentionMonitor.on('attentionChange', (state) => {
      this.handleAttentionChange(state);
    });
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
    const mainContent = this.domAnalyzer.extractMainContent();
    
    // Catégorisation de la page
    const pageCategory = this.domAnalyzer.categorizeContent();
    
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
    this.pageData.scrollData.pattern = this.scrollTracker.detectPattern();
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
      this.attentionMonitor.resume();
    } else {
      this.attentionMonitor.pause();
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
        focusPeriods: this.attentionMonitor.getSessionSummary().focusPeriods
      },
      performance: this.collectPerformanceMetrics()
    };
    
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
      largestContentfulPaint: this.getLargestContentfulPaint(),
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

  private getLargestContentfulPaint(): number {
    const entries = performance.getEntriesByType('largest-contentful-paint');
    if (entries.length > 0) {
      const lcp = entries[entries.length - 1];
      return lcp.startTime;
    }
    return 0;
  }

  private handleLCP(entry: PerformanceEntry): void {
    // Notification optionnelle sur LCP
    if (entry.startTime > 2500) { // Seuil critique LCP > 2.5s
      console.debug('Slow LCP detected:', entry.startTime);
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
    
    console.log('🧹 SYMBIONT Content Script cleaned up');
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