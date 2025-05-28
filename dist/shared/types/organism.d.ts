export interface OrganismTraits {
    curiosity: number;
    focus: number;
    rhythm: number;
    empathy: number;
    creativity: number;
    [key: string]: number;
}
export interface OrganismState {
    /** Identifiant unique de l'organisme */
    id: string;
    /** Génération (lignée) */
    generation: number;
    /** ADN complet (pour héritage) */
    dna: string;
    /** Traits principaux */
    traits: OrganismTraits;
    /** Date de création */
    birthTime: number;
    /** Timestamp de la dernière mutation */
    lastMutation: number | null;
    /** Historique des mutations */
    mutations: any[];
    /** Connexions sociales */
    socialConnections: string[];
    /** Fragments de mémoire */
    memoryFragments: any[];
    health?: number;
    energy?: number;
    consciousness?: number;
    createdAt?: number;
    visualDNA?: string;
}
export interface OrganismMutation {
    type: 'visual' | 'behavioral' | 'cognitive';
    trigger: string;
    magnitude: number;
}
export interface MutationState {
    colorShift: number;
    patternIntensity: number;
    sizeMultiplier: number;
    opacity: number;
}
export interface BehaviorPattern {
    url: string;
    interactions: number;
    timeSpent: number;
    scrollDepth: number;
    timestamp: number;
}
export interface Mutation {
    trait: string;
    delta: number;
    reason: string;
}
export interface PageContext {
    url: string;
    time: number;
    userAgent: string;
}
export interface ActionPrediction {
    action: string;
    confidence: number;
    alternatives?: string[];
    reasoning?: string;
}
export interface Message {
    type: string;
    payload: any;
}
export type MessageType = string;
export interface RoutingResult {
    success: boolean;
    route?: string;
}
export interface PerformanceMetrics {
    cpu: number;
    memory: number;
    latency: number;
}
export interface OrganismHistory {
    states: OrganismState[];
    mutations: Mutation[];
}
export interface TimeSpan {
    start: number;
    end: number;
}
export interface ConsolidationResult {
    consolidated: boolean;
    details?: string;
}
export interface RenderQueue extends Array<any> {
}
export interface WebGLContext {
}
export interface VisualMutation {
}
//# sourceMappingURL=organism.d.ts.map