export interface OrganismState {
    id: string;
    generation: number;
    health: number;
    energy: number;
    traits: {
        curiosity: number;
        focus: number;
        rhythm: number;
        empathy: number;
        creativity: number;
        [key: string]: number;
    };
    visualDNA: string;
    lastMutation: number;
    mutations: any[];
    createdAt: number;
    dna: string;
    consciousness?: number;
}
export interface OrganismMutation {
    type: 'visual' | 'behavioral' | 'cognitive';
    trigger: string;
    magnitude: number;
    timestamp: number;
}
