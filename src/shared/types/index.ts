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
  metrics: any;
}

export * from './organism'; 