// Interface d'abstraction pour OrganismCore

import { OrganismState, OrganismTraits } from '../../shared/types/organism';
import { PerformanceMetrics } from './INeuralMesh';

export interface ShaderParameters {
  energy: number;
  health: number;
  neuralActivity: number;
  creativity: number;
  focus: number;
  time: number;
  colorPrimary?: [number, number, number];
  colorSecondary?: [number, number, number];
  morphology?: number;
  complexity?: number;
  animation?: number;
}

export interface OrganismJSON {
  mesh: any;
  traits: any;
  energy: any;
  health: number;
  dna: string;
  timestamp: number;
  neural?: any;
  lastMutation?: number;
}

export interface IOrganismCore {
  // Cycle de vie
  boot(): Promise<void>;
  hibernate(): Promise<void>;
  update(deltaTime?: number): void;
  
  // Stimulation
  stimulate(inputId: string, value: number): void;
  
  // Évolution
  mutate(rate?: number): void;
  feed(amount?: number): void;
  
  // État et traits
  getTraits(): OrganismTraits;
  setTraits(traits: Partial<OrganismTraits>): void;
  getState(): OrganismState;
  
  // Métriques et export
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
  getShaderParameters(): ShaderParameters;
  toJSON(): OrganismJSON;
} 