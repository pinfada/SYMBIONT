// Service API de production - Intégration Backend Réelle
// ATTENTION : Correction de l'import pour éviter l'erreur de module introuvable
// On définit ici les types nécessaires localement pour garantir la compatibilité

export interface PersonalityTraits {
  [key: string]: number | string | boolean;
}

export interface DNAMutation {
  gene: string;
  from: string;
  to: string;
  impact: number;
}

export interface PredictionResult {
  prediction: string;
  confidence: number;
  details?: any;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: any;
}

export interface Organism {
  id: string;
  name: string;
  dna: string;
  generation: number;
  health: number;
  energy: number;
  consciousness: number;
  traits: PersonalityTraits;
  createdAt: string;
  updatedAt: string;
}

export interface BehaviorData {
  domain: string;
  url: string;
  visitCount: number;
  totalTime: number;
  scrollDepth: number;
  category: string;
  lastVisit: string;
}

export class ProductionAPIService {
  private baseURL: string;
  private token: string | null = null;
  private wsConnection: WebSocket | null = null;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  }

  /**
   * Authentification et gestion des tokens
   */
  async authenticate(email: string, password: string): Promise<{
    token: string;
    refreshToken: string;
    user: any;
  }> {
    const response = await this.request<any>('POST', '/auth/login', {
      email,
      password
    });

    this.token = response.data.token;
    localStorage.setItem('symbiont_token', this.token || '');
    
    // Établir connexion WebSocket
    this.connectWebSocket();

    return response.data;
  }

  async register(email: string, username: string, password: string): Promise<any> {
    return this.request('POST', '/auth/register', {
      email,
      username,
      password
    });
  }

  /**
   * Gestion des organismes
   */
  async getOrganisms(): Promise<Organism[]> {
    const response = await this.request<Organism[]>('GET', '/organisms');
    return response.data;
  }

  async getOrganism(id: string): Promise<Organism> {
    const response = await this.request<Organism>('GET', `/organisms/${id}`);
    return response.data;
  }

  async createOrganism(data: {
    name: string;
    initialTraits?: PersonalityTraits;
  }): Promise<Organism> {
    const response = await this.request<Organism>('POST', '/organisms', data);
    return response.data;
  }

  async updateOrganism(id: string, updates: Partial<Organism>): Promise<Organism> {
    const response = await this.request<Organism>('PUT', `/organisms/${id}`, updates);
    return response.data;
  }

  /**
   * Mutations et évolution
   */
  async applyMutation(organismId: string, mutation: {
    mutationType: string;
    trigger: string;
    magnitude?: number;
  }): Promise<DNAMutation> {
    const response = await this.request<DNAMutation>('POST', `/organisms/${organismId}/mutate`, mutation);
    return response.data;
  }

  async getEvolutionHistory(organismId: string, limit?: number): Promise<any[]> {
    const response = await this.request<any[]>('GET', `/organisms/${organismId}/evolution?limit=${limit || 50}`);
    return response.data;
  }

  /**
   * Données comportementales et analytics
   */
  async saveBehaviorData(data: BehaviorData[]): Promise<void> {
    await this.request('POST', '/behavior/batch', { behaviors: data });
  }

  async getBehaviorAnalytics(timeframe?: string): Promise<any> {
    const response = await this.request<any>('GET', `/analytics/behavior?timeframe=${timeframe || '7d'}`);
    return response.data;
  }

  async generatePersonalizedDNA(behaviorData: any[]): Promise<string> {
    const response = await this.request<{ dna: string }>('POST', '/analytics/generate-dna', {
      behaviorData
    });
    return response.data.dna;
  }

  /**
   * Prédictions et IA
   */
  async getPredictions(organismId: string): Promise<PredictionResult[]> {
    const response = await this.request<PredictionResult[]>('GET', `/organisms/${organismId}/predictions`);
    return response.data;
  }

  async analyzeEmotionalState(behaviorData: any[]): Promise<{
    mood: string;
    intensity: number;
    triggers: string[];
  }> {
    const response = await this.request<any>('POST', '/analytics/emotional-state', {
      behaviorData
    });
    return response.data;
  }

  /**
   * Réseau social et invitations
   */
  async getInvitations(): Promise<any[]> {
    const response = await this.request<any[]>('GET', '/invitations');
    return response.data;
  }

  async createInvitation(): Promise<{ code: string }> {
    const response = await this.request<{ code: string }>('POST', '/invitations');
    return response.data;
  }

  async useInvitation(code: string): Promise<any> {
    const response = await this.request<any>('POST', '/invitations/use', { code });
    return response.data;
  }

  async getSocialConnections(): Promise<any[]> {
    const response = await this.request<any[]>('GET', '/social/connections');
    return response.data;
  }

  /**
   * Rituels
   */
  async initiateRitual(organismId: string, ritual: {
    ritualType: string;
    duration?: number;
    intensity?: number;
  }): Promise<any> {
    const response = await this.request<any>('POST', `/organisms/${organismId}/ritual`, ritual);
    return response.data;
  }

  async getRitualHistory(organismId: string): Promise<any[]> {
    const response = await this.request<any[]>('GET', `/rituals/history/${organismId}`);
    return response.data;
  }

  /**
   * Mémoires
   */
  async getMemories(organismId: string, type?: string): Promise<any[]> {
    const url = `/organisms/${organismId}/memories${type ? `?type=${type}` : ''}`;
    const response = await this.request<any[]>('GET', url);
    return response.data;
  }

  async addMemory(organismId: string, memory: {
    content: string;
    type: string;
    strength?: number;
    context?: any;
  }): Promise<any> {
    const response = await this.request<any>('POST', `/organisms/${organismId}/memories`, memory);
    return response.data;
  }

  /**
   * WebSocket pour temps réel
   */
  private connectWebSocket(): void {
    if (!this.token) return;

    const wsURL = this.baseURL.replace('http', 'ws').replace('/api', '');
    this.wsConnection = new WebSocket(wsURL);

    this.wsConnection.onopen = () => {
      console.log('🔌 WebSocket connected');
      // Authentification WebSocket
      this.wsConnection?.send(JSON.stringify({
        type: 'authenticate',
        token: this.token
      }));
    };

    this.wsConnection.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    };

    this.wsConnection.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    this.wsConnection.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      // Reconnexion automatique
      setTimeout(() => this.connectWebSocket(), 5000);
    };
  }

  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'network_event':
        this.handleNetworkEvent(data.event);
        break;
      case 'mutation':
        this.handleMutationEvent(data);
        break;
      case 'ritual_invitation':
        this.handleRitualInvitation(data);
        break;
      case 'sync_request':
        this.handleSyncRequest(data);
        break;
    }
  }

  private handleNetworkEvent(event: any): void {
    // Diffuser l'événement aux composants React
    window.dispatchEvent(new CustomEvent('symbiont:network_event', {
      detail: event
    }));
  }

  private handleMutationEvent(data: any): void {
    window.dispatchEvent(new CustomEvent('symbiont:mutation', {
      detail: data
    }));
  }

  private handleRitualInvitation(data: any): void {
    window.dispatchEvent(new CustomEvent('symbiont:ritual_invitation', {
      detail: data
    }));
  }

  private handleSyncRequest(data: any): void {
    window.dispatchEvent(new CustomEvent('symbiont:sync_request', {
      detail: data
    }));
  }

  /**
   * Requête HTTP générique
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      
      // Fallback vers données mock en cas d'erreur
      if (process.env.NODE_ENV === 'development') {
        return this.getFallbackData<T>(endpoint, method);
      }
      
      throw error;
    }
  }

  /**
   * Données de fallback pour le développement
   */
  private getFallbackData<T>(endpoint: string, method: string): APIResponse<T> {
    console.warn(`🔄 Using fallback data for ${method} ${endpoint}`);
    
    const fallbackData: any = {
      '/organisms': {
        success: true,
        data: [{
          id: '1',
          name: 'Organisme Alpha',
          dna: 'ATCGATCGATCGATCGATCG',
          generation: 1,
          health: 0.9,
          energy: 0.7,
          consciousness: 0.6,
          traits: {
            curiosity: 0.7,
            focus: 0.6,
            social: 0.5,
            creativity: 0.8,
            analytical: 0.4,
            adaptability: 0.7
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      }
    };

    return fallbackData[endpoint] || { success: true, data: [] as T };
  }

  /**
   * Méthodes utilitaires
   */
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('symbiont_token', token);
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('symbiont_token');
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('symbiont_token');
    this.wsConnection?.close();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

// Singleton instance
export const apiService = new ProductionAPIService();

// Auto-load token au démarrage
const savedToken = localStorage.getItem('symbiont_token');
if (savedToken) {
  apiService.setToken(savedToken);
} 