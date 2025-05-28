"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/content/index.ts
// Point d'entrée Content Script
// src/content/index.ts
const MessageBus_1 = require("../core/messaging/MessageBus");
const NavigationObserver_1 = require("@shared/observers/NavigationObserver");
const InteractionCollector_1 = require("./collectors/InteractionCollector");
const DOMAnalyzer_1 = require("./observers/DOMAnalyzer");
const ScrollTracker_1 = require("./observers/ScrollTracker");
const AttentionMonitor_1 = require("./monitors/AttentionMonitor");
/**
 * ContentScript - Système sensoriel de SYMBIONT
 * Collecte les données comportementales dans la page web
 */
class ContentScript {
    constructor() {
        // État local
        this.pageData = {
            startTime: Date.now(),
            url: window.location.href,
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
        console.log('🔍 SYMBIONT Content Script initializing...');
        this.messageBus = new MessageBus_1.MessageBus('content');
        this.navigationObserver = new NavigationObserver_1.NavigationObserver();
        this.interactionCollector = new InteractionCollector_1.InteractionCollector();
        this.domAnalyzer = new DOMAnalyzer_1.DOMAnalyzer();
        this.scrollTracker = new ScrollTracker_1.ScrollTracker();
        this.attentionMonitor = new AttentionMonitor_1.AttentionMonitor();
        this.initialize();
    }
    static getInstance() {
        if (!ContentScript.instance) {
            ContentScript.instance = new ContentScript();
        }
        return ContentScript.instance;
    }
    initialize() {
        // Initialisation des observateurs
        this.setupObservers();
        this.setupEventListeners();
        this.performInitialAnalysis();
        // Nettoyage à la fermeture
        window.addEventListener('beforeunload', this.cleanup.bind(this));
        console.log('✅ SYMBIONT Content Script ready');
    }
    setupObservers() {
        // Observation de la navigation SPA
        this.navigationObserver.observe((change) => {
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
    setupEventListeners() {
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
    setupPerformanceObserver() {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'largest-contentful-paint') {
                    this.handleLCP(entry);
                }
            }
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
    async performInitialAnalysis() {
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
    handleInteraction(interaction) {
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
    isSignificantInteraction(interaction) {
        // Définir ce qui constitue une interaction significative
        return (interaction.type === 'form_submit' ||
            interaction.type === 'video_play' ||
            (interaction.type === 'click' && interaction.data.isNavigation) ||
            (interaction.type === 'keypress' && interaction.data.isShortcut));
    }
    updateScrollData(data) {
        this.pageData.scrollData.maxDepth = Math.max(this.pageData.scrollData.maxDepth, data.depth);
        this.pageData.scrollData.totalDistance += Math.abs(data.delta);
        // Détection du pattern de scroll
        this.pageData.scrollData.pattern = this.scrollTracker.detectPattern();
    }
    handleAttentionChange(state) {
        // Mise à jour des métriques d'attention
        if (state.isActive) {
            this.pageData.attention.totalActiveTime += state.duration || 0;
        }
        else {
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
    handleNavigationChange(change) {
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
    handleVisibilityChange() {
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
        }
        else {
            this.attentionMonitor.pause();
        }
    }
    handleWindowFocus(hasFocus) {
        this.messageBus.sendToBackground({
            type: 'FOCUS_CHANGE',
            payload: {
                url: this.pageData.url,
                hasFocus,
                timestamp: Date.now()
            }
        });
    }
    finalizePage() {
        const duration = Date.now() - this.pageData.startTime;
        // Ne pas finaliser si durée très courte (prob navigation rapide)
        if (duration < 1000)
            return;
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
    collectPerformanceMetrics() {
        const entries = performance.getEntriesByType('navigation');
        const navigation = entries.length > 0 ? entries[0] : null;
        return {
            loadTime: navigation ? navigation.loadEventEnd - navigation.startTime : 0,
            domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.startTime : 0,
            firstPaint: this.getFirstPaint(),
            firstContentfulPaint: this.getFirstContentfulPaint(),
            largestContentfulPaint: this.getLargestContentfulPaint(),
            resourceCount: performance.getEntriesByType('resource').length
        };
    }
    getFirstPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : 0;
    }
    getFirstContentfulPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        return fcp ? fcp.startTime : 0;
    }
    getLargestContentfulPaint() {
        const entries = performance.getEntriesByType('largest-contentful-paint');
        if (entries.length > 0) {
            const lcp = entries[entries.length - 1];
            return lcp.startTime;
        }
        return 0;
    }
    handleLCP(entry) {
        // Notification optionnelle sur LCP
        if (entry.startTime > 2500) { // Seuil critique LCP > 2.5s
            console.debug('Slow LCP detected:', entry.startTime);
        }
    }
    cleanup() {
        // Finalisation de la session
        this.finalizePage();
        // Nettoyage des observateurs
        this.navigationObserver.disconnect();
        this.interactionCollector.stop();
        this.scrollTracker.stop();
        this.attentionMonitor.stop();
        console.log('🧹 SYMBIONT Content Script cleaned up');
    }
}
// Point d'entrée avec protection contre les injections multiples
if (!window.__SYMBIONT_CONTENT_SCRIPT_LOADED__) {
    window.__SYMBIONT_CONTENT_SCRIPT_LOADED__ = true;
    ContentScript.getInstance();
}
