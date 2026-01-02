/**
 * ConsciousOrganismController - Contrôleur d'organisme avec conscience biologique
 * Intègre NeuroCore, ThoughtSynthesizer, CircadianRhythm et ExtensionBioDetector
 */

import { logger } from '@shared/utils/secureLogger';
import { organismStateManager } from '@shared/services/OrganismStateManager';
import { NeuroCore, type BrowserSensors, type ThoughtVector } from '../../core/consciousness/NeuroCore';
import { ThoughtSynthesizer } from '../../core/consciousness/ThoughtSynthesizer';
import { CircadianRhythm, SleepPhase } from '../../core/consciousness/CircadianRhythm';
import { ExtensionBioDetector, OrganType } from '../../core/consciousness/ExtensionBioDetector';
import { ConsciousnessStorage } from '../../core/consciousness/ConsciousnessStorage';

interface PageAnalysis {
  type: 'science' | 'social' | 'news' | 'entertainment' | 'coding' | 'learning' | 'default';
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  complexity: number;
  interactivity: number;
}

interface ConsciousThought {
  expression: string | null;      // Expression textuelle (rare)
  visualIntensity: number;        // Intensité visuelle (0-1)
  particleColor: string;          // Couleur des particules
  action: 'pulse' | 'float' | 'spiral' | 'meditate' | 'dream' | null;
  duration: number;               // Durée de l'expression en ms
}

export class ConsciousOrganismController {
  private static instance: ConsciousOrganismController;

  // Systèmes de conscience
  private neuroCore: NeuroCore;
  private thoughtSynthesizer: ThoughtSynthesizer;
  private circadianRhythm: CircadianRhythm;
  private extensionDetector: ExtensionBioDetector;
  private consciousnessStorage: ConsciousnessStorage;

  // État et analyse
  private pageAnalysis: PageAnalysis;
  private browserSensors: BrowserSensors;
  private lastThoughtTime: number = 0;
  // private lastInteraction: number = Date.now(); // Tracked in methods
  private thoughtCooldown: number = 0;

  // Métriques temps réel
  private tabCount: number = 0;
  private cpuUsage: number = 0;
  private memoryUsage: number = 0;
  private networkLatency: number = 0;

  private constructor() {
    // Initialiser le système de persistance
    this.consciousnessStorage = new ConsciousnessStorage();

    // Charger l'état sauvegardé
    const savedState = this.consciousnessStorage.getState();

    // Initialiser les systèmes de conscience avec l'état restauré
    this.neuroCore = new NeuroCore(savedState.chemistry);
    this.thoughtSynthesizer = new ThoughtSynthesizer(savedState.dna);
    this.circadianRhythm = new CircadianRhythm();
    this.extensionDetector = new ExtensionBioDetector();

    // Restaurer les mémoires dans le système circadien
    savedState.memories.forEach(memory => {
      this.circadianRhythm.recordMemory(
        memory.vector,
        memory.emotionalCharge,
        memory.context
      );
    });

    // Appliquer la personnalité sauvegardée au NeuroCore
    this.neuroCore.setPersonality(savedState.personality);

    // Restaurer la phase circadienne
    this.consciousnessStorage.updateCircadian(savedState.currentPhase, savedState.lastSleepTime);

    // Analyser l'environnement initial
    this.pageAnalysis = this.analyzePage();
    this.browserSensors = this.collectSensorData();

    // Démarrer les systèmes
    this.setupListeners();
    this.startConsciousnessLoop();

    logger.info('🧠 Conscious Organism activated', {
      totalThoughts: savedState.totalThoughts,
      totalDreams: savedState.totalDreams,
      totalInteractions: savedState.totalInteractions,
      personality: savedState.personality
    });
  }

  static getInstance(): ConsciousOrganismController {
    if (!this.instance) {
      this.instance = new ConsciousOrganismController();
    }
    return this.instance;
  }

  /**
   * Collecte les données sensorielles du navigateur
   */
  private collectSensorData(): BrowserSensors {
    // Compter les trackers publicitaires
    const adTrackers = document.querySelectorAll(
      'script[src*="google-analytics"], script[src*="facebook"], script[src*="doubleclick"]'
    ).length;

    // Détecter les popups
    const popups = document.querySelectorAll(
      '.popup, .modal, [class*="overlay"], [id*="modal"]'
    ).length;

    // Complexité de la page
    const pageComplexity = Math.min(1, document.getElementsByTagName('*').length / 5000);

    // Vitesse de scroll (mise à jour dans les événements)
    const scrollVelocity = this.calculateScrollVelocity();

    // Fréquence de clic (basée sur l'historique récent)
    const clickFrequency = this.calculateClickFrequency();

    // Temps sur la page
    const timeOnPage = (Date.now() - performance.timeOrigin) / 1000;

    // Mode sombre
    const isDarkMode = window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;

    // Extensions (nombre détecté par ExtensionBioDetector)
    const extensionCount = this.extensionDetector.getDetectedOrgans().length;

    return {
      adTrackers,
      popups,
      openTabs: this.tabCount,
      cpuUsage: this.cpuUsage,
      memoryUsage: this.memoryUsage,
      networkLatency: this.networkLatency,
      pageComplexity,
      scrollVelocity,
      clickFrequency,
      timeOnPage,
      isDarkMode,
      hasAdblocker: this.extensionDetector.hasOrgan(OrganType.BLOCKER),
      extensionCount
    };
  }

  /**
   * Boucle principale de conscience
   */
  private startConsciousnessLoop(): void {
    // Mise à jour haute fréquence pour conscience active
    setInterval(() => {
      this.updateConsciousness();
    }, 1000); // Toutes les secondes

    // Mise à jour des métriques système
    setInterval(() => {
      this.updateSystemMetrics();
    }, 5000); // Toutes les 5 secondes

    // Cycle de rêve/méditation
    setInterval(() => {
      this.processDreamCycle();
    }, 30000); // Toutes les 30 secondes
  }

  /**
   * Mise à jour du système de conscience
   */
  private async updateConsciousness(): Promise<void> {
    // Collecter les données sensorielles actuelles
    this.browserSensors = this.collectSensorData();

    // Mettre à jour la chimie neuronale
    this.neuroCore.processSensoryInput(this.browserSensors);

    // Appliquer l'influence du cycle circadien
    const circadianInfluence = this.circadianRhythm.getChemicalInfluence();
    if (circadianInfluence.melatonin !== undefined) {
      // Le cycle influence la chimie
      const chemistry = this.neuroCore.getChemistry();
      chemistry.melatonin = Math.max(0, Math.min(1,
        chemistry.melatonin + circadianInfluence.melatonin));
    }

    // Appliquer l'influence des extensions détectées
    const extensionInfluence = this.extensionDetector.getChemicalInfluence();
    if (extensionInfluence.adrenaline !== undefined) {
      const chemistry = this.neuroCore.getChemistry();
      chemistry.adrenaline = Math.max(0, Math.min(1,
        chemistry.adrenaline + extensionInfluence.adrenaline));
    }

    // Sauvegarder la chimie mise à jour
    this.consciousnessStorage.updateChemistry(this.neuroCore.getChemistry());
    this.consciousnessStorage.updateTemperature(this.neuroCore.getTemperature());

    // Générer un vecteur de pensée potentiel
    const thoughtVector = this.neuroCore.generateThoughtVector();

    if (thoughtVector) {
      // Enregistrer comme mémoire pour consolidation future
      const memory = this.circadianRhythm.recordMemory(
        thoughtVector.intention,
        thoughtVector.emotionalCharge,
        this.pageAnalysis.type
      );

      // Ajouter la mémoire au storage pour persistance
      if (memory) {
        this.consciousnessStorage.addMemory(memory);
      }

      // Ajouter le hash de la pensée
      const thoughtHash = this.hashThought(thoughtVector.intention);
      this.consciousnessStorage.addThoughtHash(thoughtHash);

      // Décider si exprimer la pensée
      if (this.shouldExpressThought(thoughtVector)) {
        await this.expressThought(thoughtVector);
      }
    }

    // Mise à jour de l'état dans le gestionnaire centralisé
    await this.syncWithStateManager();
  }

  /**
   * Décide si une pensée doit être exprimée
   */
  private shouldExpressThought(vector: ThoughtVector): boolean {
    // Respect du cooldown
    if (Date.now() - this.lastThoughtTime < this.thoughtCooldown) {
      return false;
    }

    // Préférence pour le silence (80%)
    if (vector.urgency < 0.5 && Math.random() > 0.2) {
      return false;
    }

    // Pendant le sommeil, expression minimale
    const circadianState = this.circadianRhythm.getState();
    if (circadianState.phase !== SleepPhase.AWAKE && vector.urgency < 0.8) {
      return false;
    }

    // Seuil de cohérence
    if (vector.coherence < 0.4) {
      return false;
    }

    return true;
  }

  /**
   * Exprime une pensée consciente
   */
  private async expressThought(vector: ThoughtVector): Promise<void> {
    // Synthétiser la pensée
    const thought = this.thoughtSynthesizer.synthesizeThought(vector);

    if (!thought) return;

    // Convertir en expression consciente
    const consciousThought = this.convertToConsciousExpression(thought, vector);

    // Envoyer au renderer WebGL pour manifestation visuelle
    window.postMessage({
      source: 'symbiont-consciousness',
      type: 'EXPRESS_THOUGHT',
      data: consciousThought
    }, '*');

    // Si c'est une expression textuelle (rare), l'envoyer aussi
    if (consciousThought.expression && vector.urgency > 0.7) {
      this.displayThoughtBubble(consciousThought.expression);
    }

    this.lastThoughtTime = Date.now();
    this.thoughtCooldown = 5000 + Math.random() * 10000; // 5-15 secondes

    logger.info(`Thought expressed: ${thought.type} with intensity ${consciousThought.visualIntensity}`);
  }

  /**
   * Convertit une pensée en expression consciente
   */
  private convertToConsciousExpression(
    thought: any,
    vector: ThoughtVector
  ): ConsciousThought {
    const chemistry = this.neuroCore.getChemistry();
    const circadianState = this.circadianRhythm.getState();

    // Déterminer l'action visuelle
    let action: ConsciousThought['action'] = null;
    if (circadianState.phase === SleepPhase.REM) {
      action = 'dream';
    } else if (chemistry.serotonin > 0.7) {
      action = 'meditate';
    } else if (chemistry.dopamine > 0.6) {
      action = 'spiral';
    } else if (chemistry.adrenaline > 0.5) {
      action = 'pulse';
    } else {
      action = 'float';
    }

    // Déterminer la couleur basée sur l'humeur
    let particleColor = '#00e0ff'; // Défaut cyan
    if (chemistry.adrenaline > 0.6) {
      particleColor = '#ff4444'; // Rouge stress
    } else if (chemistry.dopamine > 0.6) {
      particleColor = '#44ff44'; // Vert plaisir
    } else if (chemistry.serotonin > 0.6) {
      particleColor = '#4444ff'; // Bleu calme
    } else if (chemistry.melatonin > 0.6) {
      particleColor = '#8844ff'; // Violet sommeil
    }

    return {
      expression: thought.verbal && vector.urgency > 0.8 ? thought.components.join(' ') : null,
      visualIntensity: vector.activation,
      particleColor,
      action,
      duration: 3000 + vector.emotionalCharge * 2000
    };
  }

  /**
   * Affiche une bulle de pensée (rare)
   */
  private displayThoughtBubble(text: string): void {
    const bubble = document.createElement('div');
    bubble.className = 'symbiont-thought-bubble';
    bubble.textContent = text;
    bubble.style.cssText = `
      position: fixed;
      bottom: 120px;
      right: 20px;
      background: rgba(0, 224, 255, 0.1);
      border: 1px solid rgba(0, 224, 255, 0.3);
      border-radius: 20px;
      padding: 10px 15px;
      color: #00e0ff;
      font-family: monospace;
      font-size: 14px;
      z-index: 999999;
      animation: fadeInOut 5s ease-in-out;
      pointer-events: none;
    `;

    // Animation CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(10px); }
        20% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(bubble);

    setTimeout(() => {
      bubble.remove();
      style.remove();
    }, 5000);
  }

  /**
   * Traite le cycle de rêve/méditation
   */
  private processDreamCycle(): void {
    const circadianState = this.circadianRhythm.getState();

    // Mettre à jour la phase dans le storage
    this.consciousnessStorage.updateCircadian(circadianState.phase.toString());

    if (circadianState.phase === SleepPhase.REM && circadianState.dreamState) {
      // Incrémenter le compteur de rêves
      this.consciousnessStorage.incrementDreams();

      // En phase REM, manifester les rêves visuellement
      const dreamVector = this.circadianRhythm.getDreamVector();
      if (dreamVector) {
        window.postMessage({
          source: 'symbiont-consciousness',
          type: 'DREAM_STATE',
          data: {
            intensity: circadianState.dreamDepth,
            synthesis: Array.from(dreamVector),
            phase: circadianState.dreamState.phase
          }
        }, '*');
      }
    }
  }

  /**
   * Met à jour les métriques système
   */
  private async updateSystemMetrics(): Promise<void> {
    // Nombre d'onglets (approximation)
    if (chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_TAB_COUNT' });
        this.tabCount = response?.count || 1;
      } catch {
        this.tabCount = 1;
      }
    }

    // Performance metrics
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }

    // Network latency (ping simulé)
    const startTime = Date.now();
    try {
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
      this.networkLatency = (Date.now() - startTime) / 1000;
    } catch {
      this.networkLatency = 1;
    }
  }

  /**
   * Synchronise avec le gestionnaire d'état centralisé
   */
  private async syncWithStateManager(): Promise<void> {
    const chemistry = this.neuroCore.getChemistry();
    const circadianState = this.circadianRhythm.getState();

    // Déterminer l'humeur basée sur la chimie
    let mood: any = 'curious';
    if (chemistry.melatonin > 0.6) {
      mood = 'tired';
    } else if (chemistry.dopamine > 0.6) {
      mood = 'happy';
    } else if (chemistry.adrenaline > 0.6) {
      mood = 'excited';
    } else if (chemistry.serotonin > 0.7) {
      mood = 'meditating';
    } else if (chemistry.cortisol > 0.6) {
      mood = 'hungry';
    }

    // Calculer la conscience basée sur l'activité neuronale
    const consciousness =
      (1 - chemistry.melatonin) * 50 + // Éveil
      chemistry.acetylcholine * 30 +    // Focus
      (chemistry.dopamine + chemistry.serotonin) * 10; // Bien-être

    await organismStateManager.updateState({
      energy: (1 - chemistry.cortisol) * 100,
      consciousness: Math.min(100, consciousness),
      mood,
      currentPageType: this.pageAnalysis.type,
      isActive: circadianState.phase === SleepPhase.AWAKE
    });
  }

  // Méthodes héritées de l'ancien contrôleur
  private analyzePage(): PageAnalysis {
    // [Même implémentation que dans OrganismController]
    const url = window.location.href;
    // const title = document.title.toLowerCase(); // Unused
    const content = document.body?.innerText?.toLowerCase() || '';

    const keywords: string[] = [];
    const scienceWords = ['science', 'research', 'quantum', 'physics', 'biology'];
    // const socialWords = ['friend', 'share', 'like', 'comment', 'post']; // Unused
    const codingWords = ['code', 'function', 'variable', 'git', 'npm'];
    const learningWords = ['learn', 'tutorial', 'course', 'education'];

    let type: PageAnalysis['type'] = 'default';

    if (url.includes('github') || codingWords.filter(w => content.includes(w)).length > 3) {
      type = 'coding';
    } else if (url.includes('twitter') || url.includes('facebook')) {
      type = 'social';
    } else if (scienceWords.filter(w => content.includes(w)).length > 2) {
      type = 'science';
    } else if (url.includes('wikipedia') || learningWords.filter(w => content.includes(w)).length > 2) {
      type = 'learning';
    }

    const positiveWords = ['good', 'great', 'excellent', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'fail', 'error'];

    const positiveCount = positiveWords.filter(w => content.includes(w)).length;
    const negativeCount = negativeWords.filter(w => content.includes(w)).length;

    let sentiment: PageAnalysis['sentiment'] = 'neutral';
    if (positiveCount > negativeCount * 1.5) sentiment = 'positive';
    else if (negativeCount > positiveCount * 1.5) sentiment = 'negative';

    const words = content.split(/\s+/).slice(0, 1000);
    const avgWordLength = words.reduce((acc, w) => acc + w.length, 0) / words.length;
    const complexity = Math.min(1, avgWordLength / 10);

    const interactiveElements = document.querySelectorAll('button, input, textarea, select').length;
    const interactivity = Math.min(1, interactiveElements / 100);

    return {
      type,
      keywords: keywords.slice(0, 10),
      sentiment,
      complexity,
      interactivity
    };
  }

  private scrollVelocity: number = 0;
  private lastScrollY: number = 0;
  private lastScrollTime: number = Date.now();
  private lastInteraction: number = Date.now();

  private calculateScrollVelocity(): number {
    const currentY = window.scrollY;
    const currentTime = Date.now();
    const deltaY = Math.abs(currentY - this.lastScrollY);
    const deltaTime = (currentTime - this.lastScrollTime) / 1000;

    if (deltaTime > 0) {
      this.scrollVelocity = deltaY / deltaTime / 1000; // Normaliser
      this.scrollVelocity = Math.min(1, this.scrollVelocity);
    }

    this.lastScrollY = currentY;
    this.lastScrollTime = currentTime;

    return this.scrollVelocity;
  }

  private clickHistory: number[] = [];

  private calculateClickFrequency(): number {
    const now = Date.now();
    // Garder seulement les clics des 10 dernières secondes
    this.clickHistory = this.clickHistory.filter(t => now - t < 10000);
    return Math.min(1, this.clickHistory.length / 20); // Normaliser sur 20 clics max
  }

  private setupListeners(): void {
    // Interaction listeners
    document.addEventListener('click', () => {
      this.clickHistory.push(Date.now());
      this.lastInteraction = Date.now();

      // Incrémenter le compteur d'interactions
      this.consciousnessStorage.incrementInteractions();

      // Réaction immédiate
      window.postMessage({
        source: 'symbiont-consciousness',
        type: 'USER_INTERACTION',
        data: { action: 'pulse', intensity: 0.5 }
      }, '*');
    });

    document.addEventListener('scroll', () => {
      this.calculateScrollVelocity();
      this.lastInteraction = Date.now();
    });

    // Communication avec le background
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.type) {
        case 'GET_CONSCIOUSNESS_STATE':
          sendResponse({
            chemistry: this.neuroCore.getChemistry(),
            temperature: this.neuroCore.getTemperature(),
            circadian: this.circadianRhythm.getState(),
            organs: this.extensionDetector.getDetectedOrgans()
          });
          break;
      }
    });

    // Observer les changements de DOM
    const observer = new MutationObserver(() => {
      this.pageAnalysis = this.analyzePage();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  /**
   * Hash simple d'un vecteur de pensée pour identification
   */
  private hashThought(intention: Float32Array): string {
    // Utiliser les premiers éléments du vecteur pour créer un hash
    let hash = 0;
    for (let i = 0; i < Math.min(32, intention.length); i++) {
      const val = Math.floor(intention[i] * 1000);
      hash = ((hash << 5) - hash) + val;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  public destroy(): void {
    // Sauvegarder l'état final
    this.consciousnessStorage.saveState();

    // Nettoyer les systèmes de conscience
    this.circadianRhythm.destroy();
    this.consciousnessStorage.destroy();

    // Note: Ajouter le nettoyage des autres systèmes si nécessaire
    // this.extensionDetector.destroy(); // Si on ajoute une méthode destroy

    logger.info('🧠 Conscious Organism deactivated and cleaned up');
  }
}

// Auto-initialisation supprimée - maintenant gérée dans content/index.ts