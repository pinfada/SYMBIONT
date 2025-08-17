// Interface d'abstraction pour résoudre la dépendance circulaire OrganismCore ↔ NeuralMesh

export interface NeuralNode {
  id: string;
  type: 'input' | 'hidden' | 'output';
  activation: number;
  bias: number;
}

export interface NeuralConnection {
  from: string;
  to: string;
  weight: number;
  active: boolean;
}

export interface PerformanceMetrics {
  cpu: number;
  memory: number;
  neuralActivity: number;
  connectionStrength: number;
}

export interface INeuralMesh {
  // Configuration
  initialize(): Promise<void>;
  
  // Structure du réseau
  addNode(id: string, type: 'input' | 'hidden' | 'output', bias?: number): void;
  addConnection(fromId: string, toId: string, weight: number): void;
  
  // Activation et propagation
  stimulate(nodeId: string, value: number): void;
  propagate(): void;
  getActivation(nodeId: string): number;
  
  // Évolution
  mutate(rate?: number): void;
  
  // Métriques
  getNeuralActivity(): number;
  getConnectionStrength(): number;
  getCPUUsage(): Promise<number>;
  getMemoryUsage(): Promise<number>;
  
  // Sérialisation
  toJSON(): any;
  suspend(): Promise<void>;
  
  // Pattern processing for service compatibility
  processPattern?: (pattern: any) => Promise<any>;
  learn?: (data: any) => Promise<void>;
  getPerformanceMetrics?: () => any;

  // Missing methods for service compatibility
  saveState(): any;
  loadState(state: any): void;
  reset(): void;
  healthCheck(): { healthy: boolean; issues: string[] };
  cleanup(): void;
} 