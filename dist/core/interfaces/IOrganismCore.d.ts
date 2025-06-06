import { OrganismState, OrganismTraits } from '../../shared/types/organism';
import { PerformanceMetrics } from './INeuralMesh';
export interface ShaderParameters {
    energy: number;
    health: number;
    neuralActivity: number;
    creativity: number;
    focus: number;
    time: number;
}
export interface OrganismJSON {
    mesh: any;
    traits: OrganismTraits;
    energy: number;
    health: number;
    dna: string;
    timestamp: number;
}
export interface IOrganismCore {
    boot(): Promise<void>;
    hibernate(): Promise<void>;
    update(deltaTime?: number): void;
    stimulate(inputId: string, value: number): void;
    mutate(rate?: number): void;
    feed(amount?: number): void;
    getTraits(): OrganismTraits;
    setTraits(traits: Partial<OrganismTraits>): void;
    getState(): OrganismState;
    getPerformanceMetrics(): Promise<PerformanceMetrics>;
    getShaderParameters(): ShaderParameters;
    toJSON(): OrganismJSON;
}
//# sourceMappingURL=IOrganismCore.d.ts.map