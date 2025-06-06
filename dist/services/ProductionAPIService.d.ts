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
export declare class ProductionAPIService {
    private baseURL;
    private token;
    private wsConnection;
    constructor();
    /**
     * Authentification et gestion des tokens
     */
    authenticate(email: string, password: string): Promise<{
        token: string;
        refreshToken: string;
        user: any;
    }>;
    register(email: string, username: string, password: string): Promise<any>;
    /**
     * Gestion des organismes
     */
    getOrganisms(): Promise<Organism[]>;
    getOrganism(id: string): Promise<Organism>;
    createOrganism(data: {
        name: string;
        initialTraits?: PersonalityTraits;
    }): Promise<Organism>;
    updateOrganism(id: string, updates: Partial<Organism>): Promise<Organism>;
    /**
     * Mutations et évolution
     */
    applyMutation(organismId: string, mutation: {
        mutationType: string;
        trigger: string;
        magnitude?: number;
    }): Promise<DNAMutation>;
    getEvolutionHistory(organismId: string, limit?: number): Promise<any[]>;
    /**
     * Données comportementales et analytics
     */
    saveBehaviorData(data: BehaviorData[]): Promise<void>;
    getBehaviorAnalytics(timeframe?: string): Promise<any>;
    generatePersonalizedDNA(behaviorData: any[]): Promise<string>;
    /**
     * Prédictions et IA
     */
    getPredictions(organismId: string): Promise<PredictionResult[]>;
    analyzeEmotionalState(behaviorData: any[]): Promise<{
        mood: string;
        intensity: number;
        triggers: string[];
    }>;
    /**
     * Réseau social et invitations
     */
    getInvitations(): Promise<any[]>;
    createInvitation(): Promise<{
        code: string;
    }>;
    useInvitation(code: string): Promise<any>;
    getSocialConnections(): Promise<any[]>;
    /**
     * Rituels
     */
    initiateRitual(organismId: string, ritual: {
        ritualType: string;
        duration?: number;
        intensity?: number;
    }): Promise<any>;
    getRitualHistory(organismId: string): Promise<any[]>;
    /**
     * Mémoires
     */
    getMemories(organismId: string, type?: string): Promise<any[]>;
    addMemory(organismId: string, memory: {
        content: string;
        type: string;
        strength?: number;
        context?: any;
    }): Promise<any>;
    /**
     * WebSocket pour temps réel
     */
    private connectWebSocket;
    private handleWebSocketMessage;
    private handleNetworkEvent;
    private handleMutationEvent;
    private handleRitualInvitation;
    private handleSyncRequest;
    /**
     * Requête HTTP générique
     */
    private request;
    /**
     * Données de fallback pour le développement
     */
    private getFallbackData;
    /**
     * Méthodes utilitaires
     */
    setToken(token: string): void;
    getToken(): string | null;
    logout(): void;
    isAuthenticated(): boolean;
}
export declare const apiService: ProductionAPIService;
//# sourceMappingURL=ProductionAPIService.d.ts.map