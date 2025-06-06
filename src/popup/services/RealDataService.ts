// Service de transition des données mockées vers vraies données
import { OrganismState } from '../../shared/types/organism';
import { Invitation, InvitationStatus } from '../../shared/types/invitation';

// Feature flags pour migration progressive
const FEATURE_FLAGS = {
  USE_REAL_DNA: localStorage.getItem('symbiont_feature_real_dna') === 'true',
  USE_REAL_BEHAVIOR: localStorage.getItem('symbiont_feature_real_behavior') === 'true',
  USE_REAL_NETWORK: localStorage.getItem('symbiont_feature_real_network') === 'true',
  USE_BACKEND_API: localStorage.getItem('symbiont_feature_backend_api') === 'true'
};

// Configuration backend API
const API_CONFIG = {
  BASE_URL: process.env.SYMBIONT_API_URL || 'http://localhost:3001/api',
  WS_URL: process.env.SYMBIONT_WS_URL || 'ws://localhost:3001',
  API_KEY: process.env.SYMBIONT_API_KEY || 'demo-key'
};

interface BehaviorMetrics {
  domains: Map<string, DomainData>;
  sessionTime: number;
  totalInteractions: number;
  scrollPatterns: ScrollPattern[];
  timePatterns: TimePattern[];
}

interface DomainData {
  visits: number;
  totalTime: number;
  lastVisit: number;
  category: string;
  interactions: InteractionData[];
}

interface ScrollPattern {
  depth: number;
  velocity: number;
  timestamp: number;
}

interface TimePattern {
  hour: number;
  duration: number;
  frequency: number;
}

interface InteractionData {
  type: 'click' | 'scroll' | 'focus' | 'blur';
  timestamp: number;
  element?: string;
  value?: any;
}

export class RealDataService {
  private static instance: RealDataService;
  private behaviorMetrics: BehaviorMetrics;
  private apiHeaders: HeadersInit;

  private constructor() {
    this.behaviorMetrics = {
      domains: new Map(),
      sessionTime: 0,
      totalInteractions: 0,
      scrollPatterns: [],
      timePatterns: []
    };
    
    this.apiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_CONFIG.API_KEY}`
    };
    
    this.initializeBehaviorTracking();
  }

  static getInstance(): RealDataService {
    if (!this.instance) {
      this.instance = new RealDataService();
    }
    return this.instance;
  }

  // === GÉNÉRATION ADN RÉEL ===
  
  async generateRealDNA(userId: string): Promise<string> {
    if (!FEATURE_FLAGS.USE_REAL_DNA) {
      return 'MOCKDNA123456789ABCDEF'; // Fallback mode démo
    }

    try {
      const behaviors = await this.collectUserBehaviors(userId);
      return this.buildDNAFromBehaviors(behaviors);
    } catch (error) {
      console.warn('Erreur génération ADN réel, fallback mock:', error);
      return 'MOCKDNA123456789ABCDEF';
    }
  }

  private async collectUserBehaviors(_userId: string): Promise<BehaviorMetrics> {
    // Collecter données réelles de navigation
    const history = await chrome.history.search({ text: '', maxResults: 100 });
    
    const behaviorData: BehaviorMetrics = {
      domains: new Map(),
      sessionTime: 0,
      totalInteractions: 0,
      scrollPatterns: [],
      timePatterns: []
    };

    // Analyser l'historique
    for (const item of history) {
      if (item.url) {
        const domain = new URL(item.url).hostname;
        const existing = behaviorData.domains.get(domain) || {
          visits: 0,
          totalTime: 0,
          lastVisit: 0,
          category: await this.categorizeWebsite(domain),
          interactions: []
        };
        
        existing.visits += item.visitCount || 1;
        existing.lastVisit = item.lastVisitTime || Date.now();
        behaviorData.domains.set(domain, existing);
      }
    }

    return behaviorData;
  }

  private buildDNAFromBehaviors(behaviors: BehaviorMetrics): string {
    // Mapping catégories → séquences ADN
    const sequences: Record<string, string> = {
      'social': 'ATCG',
      'work': 'GCTA', 
      'entertainment': 'CGAT',
      'education': 'TACG',
      'news': 'AGCT',
      'shopping': 'TGCA',
      'other': 'CTAG'
    };

    let dna = '';
    const categories = new Map<string, number>();

    // Compter les catégories
    for (const [_domain, data] of behaviors.domains) {
      const count = categories.get(data.category) || 0;
      categories.set(data.category, count + data.visits);
    }

    // Construire ADN basé sur distribution des catégories
    const total = Array.from(categories.values()).reduce((a, b) => a + b, 0);
    
    for (const [category, count] of categories) {
      const ratio = count / total;
      const sequence = sequences[category] || sequences['other'];
      const length = Math.floor(ratio * 16); // 64 caractères max
      
      for (let i = 0; i < length; i++) {
        dna += sequence[i % sequence.length];
      }
    }

    // Ajouter timestamp pour unicité
    const timeHash = Date.now().toString(36).toUpperCase();
    dna += timeHash.slice(-8);

    return dna.padEnd(64, 'X').slice(0, 64);
  }

  private async categorizeWebsite(domain: string): Promise<string> {
    // Classification simple par domaines connus
    const categories: Record<string, string> = {
      'facebook.com': 'social',
      'twitter.com': 'social',
      'linkedin.com': 'social',
      'instagram.com': 'social',
      'youtube.com': 'entertainment',
      'netflix.com': 'entertainment',
      'twitch.tv': 'entertainment',
      'github.com': 'work',
      'stackoverflow.com': 'work',
      'google.com': 'other',
      'wikipedia.org': 'education',
      'coursera.org': 'education',
      'amazon.com': 'shopping',
      'news.google.com': 'news',
      'bbc.com': 'news'
    };

    return categories[domain] || 'other';
  }

  // === INVITATIONS RÉELLES ===

  async getRealInvitations(userId: string): Promise<{
    userCode: string;
    inviter: Invitation | null;
    invitees: Invitation[];
    history: Array<Invitation & { status: InvitationStatus; type: 'envoyée' | 'reçue' }>;
  }> {
    if (!FEATURE_FLAGS.USE_BACKEND_API) {
      // Mode démo - utiliser MockInvitationService
      const { MockInvitationService } = await import('./MockInvitationService');
      return {
        userCode: await MockInvitationService.getUserCode(),
        inviter: await MockInvitationService.getInviter(),
        invitees: await MockInvitationService.getInvitees(),
        history: await MockInvitationService.getHistory()
      };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/invitations/user/${userId}`, {
        headers: this.apiHeaders
      });

      if (!response.ok) throw new Error('API Error');
      
      return await response.json();
    } catch (error) {
      console.warn('Erreur API invitations, fallback mock:', error);
      // Fallback vers données mock
      const { MockInvitationService } = await import('./MockInvitationService');
      return {
        userCode: await MockInvitationService.getUserCode(),
        inviter: await MockInvitationService.getInviter(),
        invitees: await MockInvitationService.getInvitees(),
        history: await MockInvitationService.getHistory()
      };
    }
  }

  // === MÉTRIQUES SYSTÈME RÉELLES ===

  async getRealSystemMetrics(): Promise<{
    cpu: number;
    memory: number;
    latency: number;
  }> {
    if (!FEATURE_FLAGS.USE_REAL_BEHAVIOR) {
      // Mode démo - métriques aléatoires
      return {
        cpu: Math.random() * 0.2,
        memory: Math.random() * 20,
        latency: Math.random() * 5
      };
    }

    try {
      // Métriques réelles via Performance API
      const memory = await this.getMemoryUsage();
      const cpu = await this.getCPUUsage();
      const latency = await this.getNetworkLatency();

      return { cpu, memory, latency };
    } catch (error) {
      console.warn('Erreur métriques réelles, fallback mock:', error);
      return {
        cpu: Math.random() * 0.2,
        memory: Math.random() * 20,
        latency: Math.random() * 5
      };
    }
  }

  private async getMemoryUsage(): Promise<number> {
    if ('memory' in performance) {
      // @ts-ignore - API expérimentale
      const memInfo = await performance.measureUserAgentSpecificMemory();
      return memInfo.bytes / (1024 * 1024); // MB
    }
    return Math.random() * 20; // Fallback
  }

  private async getCPUUsage(): Promise<number> {
    // Estimation basée sur Performance Observer
    return new Promise((resolve) => {
      const start = performance.now();
      const iterations = 10000;
      
      // CPU stress test léger
      for (let i = 0; i < iterations; i++) {
        Math.random() * Math.random();
      }
      
      const duration = performance.now() - start;
      const cpuRatio = Math.min(duration / 10, 1); // Normalisation
      resolve(cpuRatio);
    });
  }

  private async getNetworkLatency(): Promise<number> {
    try {
      const start = performance.now();
      await fetch('/favicon.ico', { method: 'HEAD' });
      return performance.now() - start;
    } catch {
      return Math.random() * 5; // Fallback
    }
  }

  // === TRACKING COMPORTEMENTAL ===

  private initializeBehaviorTracking(): void {
    if (!FEATURE_FLAGS.USE_REAL_BEHAVIOR) return;

    // Écouter les messages du content script
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'behavior_data') {
        this.processBehaviorData(message.data);
        sendResponse({ status: 'received' });
      }
    });

    // Tracker les changements d'onglets
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.trackTabChange(activeInfo.tabId);
    });

    // Tracker la navigation
    chrome.webNavigation.onCompleted.addListener((details) => {
      if (details.frameId === 0) { // Main frame seulement
        this.trackNavigation(details.url, details.tabId);
      }
    });
  }

  private processBehaviorData(data: any): void {
    // Traiter les données comportementales du content script
    const domain = new URL(data.url).hostname;
    const existing = this.behaviorMetrics.domains.get(domain) || {
      visits: 0,
      totalTime: 0,
      lastVisit: Date.now(),
      category: 'other',
      interactions: []
    };

    existing.totalTime += data.timeSpent || 0;
    existing.interactions.push(...(data.interactions || []));
    existing.lastVisit = Date.now();

    this.behaviorMetrics.domains.set(domain, existing);
    this.behaviorMetrics.totalInteractions += data.interactions?.length || 0;
  }

  private trackTabChange(tabId: number): void {
    chrome.tabs.get(tabId, (tab) => {
      if (tab.url) {
        console.log('Tab changed to:', new URL(tab.url).hostname);
      }
    });
  }

  private trackNavigation(url: string, _tabId: number): void {
    const domain = new URL(url).hostname;
    const existing = this.behaviorMetrics.domains.get(domain) || {
      visits: 0,
      totalTime: 0,
      lastVisit: Date.now(),
      category: 'other',
      interactions: []
    };

    existing.visits += 1;
    existing.lastVisit = Date.now();
    this.behaviorMetrics.domains.set(domain, existing);
  }

  // === FEATURE FLAGS MANAGEMENT ===

  static enableFeature(feature: keyof typeof FEATURE_FLAGS): void {
    localStorage.setItem(`symbiont_feature_${feature.toLowerCase()}`, 'true');
    location.reload(); // Recharger pour appliquer
  }

  static disableFeature(feature: keyof typeof FEATURE_FLAGS): void {
    localStorage.setItem(`symbiont_feature_${feature.toLowerCase()}`, 'false');
    location.reload();
  }

  static getFeatureStatus(): typeof FEATURE_FLAGS {
    return { ...FEATURE_FLAGS };
  }

  // === MIGRATION UTILITIES ===

  async migrateToRealData(userId: string): Promise<void> {
    console.log('🚀 Démarrage migration vers vraies données...');

    try {
      // 1. Générer ADN réel
      const realDNA = await this.generateRealDNA(userId);
      
      // 2. Récupérer organisme actuel
      const currentOrganism = JSON.parse(localStorage.getItem('symbiont_organism') || '{}');
      
      // 3. Mettre à jour avec vraies données
      const updatedOrganism: OrganismState = {
        ...currentOrganism,
        dna: realDNA,
        visualDNA: realDNA,
        lastMutation: Date.now(),
        mutations: [
          ...currentOrganism.mutations || [],
          {
            type: 'behavioral_evolution',
            trigger: 'real_data_migration',
            magnitude: 0.8,
            timestamp: Date.now(),
            description: 'Migration vers données comportementales réelles'
          }
        ]
      };

      // 4. Sauvegarder
      localStorage.setItem('symbiont_organism', JSON.stringify(updatedOrganism));
      
      console.log('✅ Migration réussie:', realDNA);
    } catch (error) {
      console.error('❌ Erreur migration:', error);
      throw error;
    }
  }
}

// Export singleton
export const realDataService = RealDataService.getInstance(); 