// Types core pour éliminer les `any`

export interface DNASequence {
  sequence: string;
  length: number;
  checksum: string;
}

export interface DNAGene {
  id: string;
  expression: number;
  dominance: number;
  mutation_rate: number;
}

export interface DNAInterpreter {
  sequence: DNASequence;
  genes: DNAGene[];
  
  // Méthodes d'interprétation
  parseSequence(dna: string): DNASequence;
  extractGenes(): DNAGene[];
  getTraitValue(traitName: string): number;
  
  // Mutations
  mutate(rate: number): DNASequence;
  crossover(other: DNAInterpreter): DNASequence;
  
  // Validation
  validate(): boolean;
  repair(): boolean;
}

export interface ShaderContext {
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
  attributes: Record<string, number>;
}

export interface RenderState {
  isActive: boolean;
  frameCount: number;
  lastFrameTime: number;
  fps: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface ErrorContext {
  component: string;
  method: string;
  timestamp: number;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  details?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  context?: ErrorContext;
}

export interface AsyncOperation<T> {
  id: string;
  promise: Promise<T>;
  status: 'pending' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
}

// Factory types pour l'injection de dépendances
export interface ComponentFactory<T> {
  create(...args: any[]): T;
  createAsync(...args: any[]): Promise<T>;
}

export interface DependencyResolver {
  resolve<T>(key: string): T;
  register<T>(key: string, factory: ComponentFactory<T>): void;
  isRegistered(key: string): boolean;
} 