export interface PersonalityTraits {
    curiosity: number;
    focus: number;
    social: number;
    creativity: number;
    analytical: number;
    adaptability: number;
}
export interface DNAMutation {
    id: string;
    type: 'behavioral' | 'cognitive' | 'social' | 'emotional';
    trigger: string;
    magnitude: number;
    description: string;
    effects: PersonalityTraits;
    timestamp: Date;
}
export interface PredictionResult {
    action: string;
    probability: number;
    confidence: number;
    reasoning: string[];
}
export interface OrganismState {
    id: string;
    name?: string;
    dna: string;
    visualDNA: string;
    generation: number;
    health: number;
    energy: number;
    consciousness: number;
    traits: PersonalityTraits;
    birthTime: Date;
    lastMutation?: Date;
}
export interface BehaviorPattern {
    id: string;
    pattern: string;
    frequency: number;
    timeSpent: number;
    category: 'work' | 'social' | 'entertainment' | 'education' | 'shopping' | 'news' | 'other';
    domains: string[];
    timestamp: Date;
}
export interface NetworkConnection {
    fromUserId: string;
    toUserId: string;
    strength: number;
    type: 'invitation' | 'mutual' | 'following';
    organism?: OrganismState;
}
export interface RitualSession {
    id: string;
    type: 'meditation' | 'synchronization' | 'revelation' | 'evolution';
    duration: number;
    intensity: number;
    participants: string[];
    effects: any;
    startedAt: Date;
    completedAt?: Date;
}
export interface MemoryFragment {
    id: string;
    content: string;
    type: 'navigation' | 'interaction' | 'emotion' | 'learning';
    strength: number;
    context?: any;
    createdAt: Date;
}
export interface EmotionalState {
    mood: 'excited' | 'focused' | 'stressed' | 'relaxed' | 'curious' | 'frustrated';
    intensity: number;
    triggers: string[];
    timestamp: Date;
}
export interface NetworkEvent {
    id: string;
    type: 'mutation' | 'connection' | 'ritual' | 'synchronization' | 'evolution';
    userId: string;
    organismId: string;
    data: any;
    timestamp: Date;
}
export interface SystemMetrics {
    cpu: number;
    memory: number;
    latency: number;
    userAgent?: string;
    platform?: string;
    timestamp: Date;
}
export interface InvitationCode {
    id: string;
    code: string;
    inviterId?: string;
    inviteeId?: string;
    isConsumed: boolean;
    consumedAt?: Date;
    createdAt: Date;
    expiresAt: Date;
}
export interface UserProfile {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatar?: string;
    timezone?: string;
    language: string;
    preferences: any;
    createdAt: Date;
}
export interface FeatureFlags {
    USE_REAL_DNA: boolean;
    USE_REAL_BEHAVIOR: boolean;
    USE_REAL_NETWORK: boolean;
    USE_BACKEND_API: boolean;
}
export interface SymbiontConfig {
    apiUrl: string;
    wsUrl: string;
    features: FeatureFlags;
    version: string;
    environment: 'development' | 'staging' | 'production';
}
export type WebSocketEventType = 'network_event' | 'mutation' | 'ritual_invitation' | 'sync_request' | 'connection' | 'disconnection';
export interface WebSocketMessage {
    type: WebSocketEventType;
    data: any;
    timestamp: Date;
}
export interface BehaviorAnalytics {
    dominantCategories: string[];
    timeDistribution: Record<string, number>;
    patterns: string[];
    anomalies: string[];
    emotionalProfile: EmotionalState[];
}
export interface EvolutionHistory {
    id: string;
    organismId: string;
    generation: number;
    mutations: DNAMutation[];
    parentId?: string;
    children: string[];
    milestones: {
        type: string;
        timestamp: Date;
        description: string;
    }[];
}
export interface UIState {
    currentView: 'main' | 'network' | 'evolution' | 'rituals' | 'settings';
    isLoading: boolean;
    error?: string;
    notifications: Notification[];
}
export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
}
export interface APIResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    meta?: {
        count?: number;
        page?: number;
        totalPages?: number;
        timestamp?: string;
    };
}
export interface APIError {
    error: string;
    code?: string;
    details?: any;
}
export interface SymbiontContextType {
    organism: OrganismState | null;
    isLoading: boolean;
    error: string | null;
    updateOrganism: (updates: Partial<OrganismState>) => void;
    applyMutation: (mutation: Omit<DNAMutation, 'id' | 'timestamp'>) => void;
    refreshData: () => Promise<void>;
}
export declare const DEFAULT_TRAITS: PersonalityTraits;
export declare const DNA_BASES: readonly ["A", "T", "G", "C"];
export type DNABase = typeof DNA_BASES[number];
export declare const CATEGORIES: readonly ["work", "social", "entertainment", "education", "shopping", "news", "other"];
export type BehaviorCategory = typeof CATEGORIES[number];
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type Timestamp = string | Date;
//# sourceMappingURL=SymbiontTypes.d.ts.map