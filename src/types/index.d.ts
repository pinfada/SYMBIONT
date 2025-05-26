// src/types/index.ts
export interface OrganismState {
    instances: number;
    complexity: number;
    timeStamp: number;
}
  
export interface OrganismMutation {
    type: 'color_shift' | 'pattern_change' | 'size_fluctuation' | 'opacity_variation';
    magnitude: number;
    duration: number;
    easing?: 'linear' | 'ease-in' | 'ease-out' | 'bounce';
}
  
export interface PerformanceMetrics {
    fps: number;
    gpuLoad: number;
    memoryUsage: number;
    drawCalls: number;
}
  
export interface MutationState {
    colorShift: number;
    patternIntensity: number;
    sizeMultiplier: number;
    opacity: number;
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