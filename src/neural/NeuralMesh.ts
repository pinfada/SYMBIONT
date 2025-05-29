export class NeuralMesh {
  private neurons: Record<string, string[]> = {};
  addNeuron(id: string) { this.neurons[id] = []; }
  connect(from: string, to: string) { this.neurons[from].push(to); }
  getConnections(id: string) { return this.neurons[id] || []; }
} 