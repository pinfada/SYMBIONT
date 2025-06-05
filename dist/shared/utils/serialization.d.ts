export interface SerializableOrganismState {
    id: string;
    generation: number;
    health: number;
    energy: number;
    traits: Record<string, number>;
    visualDNA: string;
    lastMutation: number;
    mutations: Array<{
        type: string;
        trigger: string;
        magnitude: number;
        timestamp: number;
    }>;
    createdAt: number;
    dna: string;
    birthTime: number;
    socialConnections: Array<{
        id: string;
        type: string;
        strength: number;
    }>;
    memoryFragments: Array<{
        id: string;
        content: string;
        timestamp: number;
    }>;
}
export declare function sanitizeOrganismState(state: any): SerializableOrganismState | null;
export declare function sanitizeMessage(message: any): any;
//# sourceMappingURL=serialization.d.ts.map