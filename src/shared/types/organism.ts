// Squelette minimal pour lever les erreurs d'import
export interface OrganismTraits {
    curiosity: number;
    focus: number;
    rhythm: number;
    empathy: number;
    creativity: number;
    resilience: number;
    adaptability: number;
    memory: number;
    intuition: number;
    [key: string]: number;
}

export interface OrganismState {
    /** Identifiant unique de l'organisme */
    id: string;
    /** Génération (lignée) */
    generation?: number;
    /** ADN complet (pour héritage) */
    dna: string;
    /** Traits principaux */
    traits: OrganismTraits;
    /** Date de création */
    birthTime?: number;
    /** Timestamp de la dernière mutation */
    lastMutation: number | null;
    /** Historique des mutations */
    mutations?: unknown[];
    /** Connexions sociales */
    socialConnections?: string[];
    /** Fragments de mémoire */
    memoryFragments?: unknown[];
    // Ajouts pour compatibilité
    health?: number;
    energy?: number;
    maxEnergy?: number;
    consciousness?: number;
    createdAt?: number;
    visualDNA?: string;
    visualState?: VisualState;
    balance?: number;
    metabolismRate?: number;
    age?: number;
}

export interface VisualState {
    color?: [number, number, number];
    scale?: number;
    geometry?: string;
    animation?: string;
    opacity?: number;
    size?: number;
}

export interface OrganismMutation {
    type: 'visual' | 'behavioral' | 'cognitive';
    trigger: string;
    magnitude: number;
    // Ajoutez d'autres propriétés si besoin
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
    payload: unknown;
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
    fps?: number;
    memoryUsage?: number;
    renderTime?: number;
}

export interface VisualMutation {
    type: 'color' | 'size' | 'shape' | 'animation';
    value: [number, number, number] | number | string;
    timestamp?: number;
}

export interface WebGLContext {
    tabId: number;
    canvas: HTMLCanvasElement;
    gl: WebGLRenderingContext;
    ready: boolean;
}

export type RenderQueue = Array<{
    id: string;
    mutations: VisualMutation[];
    timestamp: number;
}>;

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
    details: string;
}