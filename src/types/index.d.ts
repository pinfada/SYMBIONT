// src/types/index.ts

// Types unifiés pour le moteur WebGL

// Représentation d'une couleur HSL
export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

// Propriétés visuelles extraites du DNA
export interface VisualProperties {
  primaryColor: HSLColor;
  secondaryColor: HSLColor;
}

// Traits comportementaux de l'organisme
export interface OrganismTraits {
  curiosity: number;
  focus: number;
  rhythm: number;
  empathy: number;
  creativity: number;
  energy: number;
  harmony: number;
  wisdom: number;
}

// État de rendu minimal pour le moteur
export interface OrganismState {
  instances?: number;
  complexity?: number;
  timeStamp?: number;
  traits?: OrganismTraits;
  visualDNA?: string;
}

// Mutation visuelle générique
export interface OrganismMutation {
  type: 'color_shift' | 'pattern_change' | 'size_fluctuation' | 'opacity_variation' | 'visual_evolution';
  magnitude: number;
  duration: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'bounce';
  trigger?: string;
  timestamp?: number;
}

// État courant des mutations
export interface MutationState {
  colorShift: number;
  patternIntensity: number;
  sizeMultiplier: number;
  opacity: number;
}

// Paramètres pour les shaders
export interface ShaderParameters {
  primaryColor: Float32Array;
  secondaryColor: Float32Array;
  complexity: number;
  symmetry: number;
  fluidity: number;
  colorVariance: number;
  patternDensity: number;
  evolutionRate: number;
}

// Métriques de performance
export interface PerformanceMetrics {
  fps: number;
  gpuLoad: number;
  memoryUsage: number;
  drawCalls: number;
}

// Géométrie générée
export interface Geometry {
  vertices: Float32Array;
  indices: Uint16Array;
  normals?: Float32Array;
}

// Texture générée procéduralement
export interface Texture {
  data: Uint8Array;
  width: number;
  height: number;
}

// Générateur pseudo-aléatoire à seed
export interface SeededRandom {
  next(): number;
}

// Squelette minimal pour centraliser les types globaux
export * from './messages';
export * from './organism';
export * from '../shared/types/messages';
export * from '../shared/types/organism';