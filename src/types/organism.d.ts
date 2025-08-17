export interface OrganismState {
    id: string;
    generation: number;
    health: number;
    energy: number;
    traits: OrganismTraits;
    visualDNA: string;
    lastMutation: number;
}
  
export interface OrganismTraits {
    curiosity: number;      // Tendency to explore new sites
    focus: number;          // Time spent on single pages
    rhythm: number;         // Navigation speed/patterns
    empathy: number;        // Response to social content
    creativity: number;     // Interaction with creative content
}
  
export interface OrganismMutation {
    type: 'visual' | 'behavioral' | 'cognitive';
    trigger: string;
    magnitude: number;
    timestamp: number;
}