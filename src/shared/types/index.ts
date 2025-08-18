// Types partagés centralisés

export interface OrganismTraits {
  curiosity: number;
  focus: number;
  rhythm: number;
  empathy: number;
  creativity: number;
  energy: number;
  harmony: number;
  wisdom: number;
  [key: string]: number;
}

export interface VisualProperties {
  primaryColor: { h: number; s: number; l: number };
  secondaryColor: { h: number; s: number; l: number };
}

export interface Geometry {
  vertices: Float32Array;
  indices: Uint16Array;
  normals?: Float32Array;
}

export interface WebGLState {
  initialized: boolean;
  error: string | null;
  metrics: unknown;
}

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

export interface MutationState {
  colorShift: number;
  patternIntensity: number;
  sizeMultiplier: number;
  opacity: number;
}

export interface PerformanceMetrics {
  fps: number;
  gpuLoad: number;
  memoryUsage: number;
  drawCalls: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface Texture {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface SeededRandom {
  next(): number;
}

export * from './organism'; 