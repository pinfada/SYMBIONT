// Contrôleur pour synchroniser l'état de l'organisme entre popup et content
import { logger } from '@shared/utils/secureLogger';
import { organismStateManager } from '@shared/services/OrganismStateManager';

interface PageAnalysis {
  type: 'science' | 'social' | 'news' | 'entertainment' | 'coding' | 'learning' | 'default';
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  complexity: number; // 0-1
  interactivity: number; // 0-1
}

export class OrganismController {
  private static instance: OrganismController;
  private pageAnalysis: PageAnalysis;
  private updateInterval: number | null = null;
  private lastInteraction: number = Date.now();

  private constructor() {
    this.pageAnalysis = this.analyzePage();
    this.setupListeners();
    this.startMonitoring();
  }

  static getInstance(): OrganismController {
    if (!this.instance) {
      this.instance = new OrganismController();
    }
    return this.instance;
  }

  private analyzePage(): PageAnalysis {
    const url = window.location.href;
    const title = document.title.toLowerCase();
    const content = document.body?.innerText?.toLowerCase() || '';

    // Extraction de mots-clés
    const keywords: string[] = [];
    const scienceWords = ['science', 'research', 'quantum', 'physics', 'biology', 'chemistry', 'experiment', 'theory', 'discovery'];
    const socialWords = ['friend', 'share', 'like', 'comment', 'post', 'follow', 'message', 'profile'];
    const codingWords = ['code', 'function', 'variable', 'git', 'npm', 'debug', 'api', 'framework', 'javascript', 'python'];
    const learningWords = ['learn', 'tutorial', 'course', 'education', 'study', 'lesson', 'teach', 'knowledge'];

    // Analyser le type de page
    let type: PageAnalysis['type'] = 'default';
    let maxScore = 0;

    // Science
    const scienceScore = scienceWords.filter(w => content.includes(w)).length;
    if (scienceScore > maxScore) {
      maxScore = scienceScore;
      type = 'science';
      keywords.push(...scienceWords.filter(w => content.includes(w)));
    }

    // Social
    if (url.includes('twitter') || url.includes('facebook') || url.includes('instagram') ||
        url.includes('linkedin') || url.includes('reddit')) {
      type = 'social';
      keywords.push(...socialWords.filter(w => content.includes(w)));
    }

    // Coding
    if (url.includes('github') || url.includes('stackoverflow') || url.includes('codepen') ||
        codingWords.filter(w => content.includes(w)).length > 3) {
      type = 'coding';
      keywords.push(...codingWords.filter(w => content.includes(w)));
    }

    // Learning
    if (url.includes('wikipedia') || url.includes('coursera') || url.includes('udemy') ||
        learningWords.filter(w => content.includes(w)).length > 2) {
      type = 'learning';
      keywords.push(...learningWords.filter(w => content.includes(w)));
    }

    // News
    if (url.includes('news') || url.includes('bbc') || url.includes('cnn') ||
        title.includes('news')) {
      type = 'news';
    }

    // Entertainment
    if (url.includes('youtube') || url.includes('netflix') || url.includes('twitch') ||
        url.includes('spotify')) {
      type = 'entertainment';
    }

    // Analyser le sentiment (simplifié)
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'happy', 'success'];
    const negativeWords = ['bad', 'terrible', 'hate', 'fail', 'error', 'problem', 'issue'];

    const positiveCount = positiveWords.filter(w => content.includes(w)).length;
    const negativeCount = negativeWords.filter(w => content.includes(w)).length;

    let sentiment: PageAnalysis['sentiment'] = 'neutral';
    if (positiveCount > negativeCount * 1.5) sentiment = 'positive';
    else if (negativeCount > positiveCount * 1.5) sentiment = 'negative';

    // Calculer la complexité (basé sur la longueur moyenne des mots et phrases)
    const words = content.split(/\s+/).slice(0, 1000); // Analyser les 1000 premiers mots
    const avgWordLength = words.reduce((acc, w) => acc + w.length, 0) / words.length;
    const complexity = Math.min(1, avgWordLength / 10); // Normaliser entre 0 et 1

    // Calculer l'interactivité (basé sur les éléments interactifs)
    const interactiveElements = document.querySelectorAll('button, input, textarea, select, a, video, audio').length;
    const interactivity = Math.min(1, interactiveElements / 100);

    return {
      type,
      keywords: keywords.slice(0, 10), // Limiter à 10 mots-clés
      sentiment,
      complexity,
      interactivity
    };
  }

  private setupListeners(): void {
    // Écouter les messages du background/popup
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.type) {
        case 'GET_PAGE_ANALYSIS':
          sendResponse(this.pageAnalysis);
          break;

        case 'FEED_ORGANISM':
          this.feedOrganism();
          sendResponse({ success: true });
          break;

        case 'TOGGLE_ORGANISM':
          this.toggleOrganismVisibility();
          sendResponse({ success: true });
          break;

        case 'GET_ORGANISM_POSITION':
          sendResponse(this.getOrganismPosition());
          break;
      }
    });

    // Détecter les interactions de l'utilisateur
    document.addEventListener('click', () => this.onUserInteraction('click'));
    document.addEventListener('scroll', () => this.onUserInteraction('scroll'));
    document.addEventListener('keypress', () => this.onUserInteraction('type'));

    // Observer les changements de DOM
    const observer = new MutationObserver(() => {
      this.onPageChange();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  private startMonitoring(): void {
    // Mise à jour périodique de l'état
    this.updateInterval = window.setInterval(() => {
      this.updateOrganismState();
    }, 5000); // Toutes les 5 secondes

    // Analyser la page toutes les 30 secondes
    setInterval(() => {
      this.pageAnalysis = this.analyzePage();
      this.notifyBackgroundOfPageChange();
    }, 30000);
  }

  private async updateOrganismState(): Promise<void> {
    const timeSinceInteraction = Date.now() - this.lastInteraction;
    const isUserActive = timeSinceInteraction < 30000; // Actif dans les 30 dernières secondes

    // Mettre à jour l'état centralisé
    await organismStateManager.updateState({
      currentPageType: this.pageAnalysis.type,
      isActive: isUserActive
    });

    // Notifier de la visite de page
    await organismStateManager.onPageVisit(this.pageAnalysis.type);

    // Obtenir l'état actuel synchronisé
    const currentState = organismStateManager.getState();

    // Envoyer la mise à jour au renderer WebGL
    window.postMessage({
      source: 'symbiont-controller',
      type: 'UPDATE_ORGANISM_STATE',
      data: {
        energy: currentState.energy,
        consciousness: currentState.consciousness,
        mood: currentState.mood,
        size: currentState.size,
        position: currentState.position,
        behavior: currentState.behavior
      }
    }, '*');
  }


  private onUserInteraction(type: string): void {
    this.lastInteraction = Date.now();

    // Réaction immédiate selon le type d'interaction
    const reaction = {
      click: { action: 'pulse', intensity: 0.5 },
      scroll: { action: 'float', intensity: 0.3 },
      type: { action: 'wiggle', intensity: 0.2 }
    };

    window.postMessage({
      source: 'symbiont-controller',
      type: 'USER_INTERACTION',
      data: reaction[type as keyof typeof reaction] || { action: 'none', intensity: 0 }
    }, '*');
  }

  private onPageChange(): void {
    // Détecter les changements significatifs
    const newAnalysis = this.analyzePage();

    if (newAnalysis.type !== this.pageAnalysis.type) {
      logger.info(`Page type changed from ${this.pageAnalysis.type} to ${newAnalysis.type}`);
      this.pageAnalysis = newAnalysis;

      // Notifier le renderer du changement
      window.postMessage({
        source: 'symbiont-controller',
        type: 'PAGE_TYPE_CHANGED',
        data: {
          newType: newAnalysis.type,
          keywords: newAnalysis.keywords
        }
      }, '*');
    }
  }

  private feedOrganism(): void {
    window.postMessage({
      source: 'symbiont-controller',
      type: 'ORGANISM_ACTION',
      data: { action: 'feed' }
    }, '*');
  }

  private toggleOrganismVisibility(): void {
    window.postMessage({
      source: 'symbiont-controller',
      type: 'TOGGLE_VISIBILITY',
      data: {}
    }, '*');
  }

  private getOrganismPosition(): { x: number; y: number } {
    const container = document.getElementById('symbiont-organism-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }
    return { x: 0, y: 0 };
  }

  private notifyBackgroundOfPageChange(): void {
    chrome.runtime.sendMessage({
      type: 'PAGE_ANALYSIS_UPDATE',
      data: this.pageAnalysis
    }).catch(() => {
      // Extension context invalidated, ignore
    });
  }

  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Auto-initialisation si WebGL est activé
chrome.storage.local.get(['symbiont_webgl_enabled'], (result) => {
  if (result.symbiont_webgl_enabled !== false) {
    OrganismController.getInstance();
  }
});