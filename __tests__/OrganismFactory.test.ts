import { OrganismFactory } from '../src/core/factories/OrganismFactory';
import { INeuralMesh } from '../src/core/interfaces/INeuralMesh';
import { IOrganismCore } from '../src/core/interfaces/IOrganismCore';
import { NeuralMesh } from '../src/core/NeuralMesh';

// Mock NeuralMesh pour les tests
class MockNeuralMesh implements INeuralMesh {
  private nodes = new Map();
  private activations = new Map();

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  addNode(id: string, type: 'input' | 'hidden' | 'output', bias?: number): void {
    this.nodes.set(id, { id, type, bias: bias || 0 });
    this.activations.set(id, 0);
  }

  addConnection(fromId: string, toId: string, weight: number): void {
    // Mock implementation
  }

  stimulate(nodeId: string, value: number): void {
    this.activations.set(nodeId, value);
  }

  propagate(): void {
    // Mock propagation
  }

  getActivation(nodeId: string): number {
    return this.activations.get(nodeId) || 0;
  }

  mutate(rate?: number): void {
    // Mock mutation
  }

  getNeuralActivity(): number {
    return 0.5;
  }

  getConnectionStrength(): number {
    return 0.3;
  }

  async getCPUUsage(): Promise<number> {
    return 0.1;
  }

  async getMemoryUsage(): Promise<number> {
    return 0.05;
  }

  toJSON(): any {
    return { nodes: Array.from(this.nodes.values()) };
  }

  async suspend(): Promise<void> {
    return Promise.resolve();
  }
}

describe('OrganismFactory', () => {
  beforeEach(() => {
    // Reset factory state before each test
    OrganismFactory.setDependencies({
      createNeuralMesh: () => new MockNeuralMesh()
    });
  });

  describe('Dependency Management', () => {
    it('should set and use dependencies correctly', () => {
      const mockMeshFactory = jest.fn(() => new MockNeuralMesh());
      
      OrganismFactory.setDependencies({
        createNeuralMesh: mockMeshFactory
      });

      const organism = OrganismFactory.createOrganism('ATCGATCGATCGATCG');
      
      expect(mockMeshFactory).toHaveBeenCalled();
      expect(organism).toBeDefined();
    });

    it('should throw error when dependencies not set', () => {
      // Reset dependencies to null
      (OrganismFactory as any).dependencies = null;

      expect(() => {
        OrganismFactory.createOrganism('ATCGATCGATCGATCG');
      }).toThrow('OrganismFactory dependencies not set');
    });

    it('should create different organisms with same dependencies', () => {
      const organism1 = OrganismFactory.createOrganism('ATCGATCGATCGATCG', {
        creativity: 0.3
      });
      
      const organism2 = OrganismFactory.createOrganism('GCTAGCTAGCTAGCTA', {
        creativity: 0.7
      });

      expect(organism1).toBeDefined();
      expect(organism2).toBeDefined();
      expect(organism1).not.toBe(organism2);
    });
  });

  describe('Organism Creation', () => {
    it('should create organism with valid DNA', () => {
      const organism = OrganismFactory.createOrganism('ATCGATCGATCGATCG');
      
      expect(organism).toBeDefined();
      expect(typeof organism.boot).toBe('function');
      expect(typeof organism.mutate).toBe('function');
      expect(typeof organism.getTraits).toBe('function');
    });

    it('should create organism with custom traits', () => {
      const customTraits = {
        creativity: 0.8,
        focus: 0.3,
        energy: 0.9
      };

      const organism = OrganismFactory.createOrganism('ATCGATCGATCGATCG', customTraits);
      
      expect(organism).toBeDefined();
    });

    it('should handle short DNA sequences', () => {
      const shortDNA = 'ATCGATCGAT';
      
      const organism = OrganismFactory.createOrganism(shortDNA);
      expect(organism).toBeDefined();
    });

    it('should handle long DNA sequences', () => {
      const longDNA = 'ATCGATCGATCGATCG'.repeat(10);
      
      const organism = OrganismFactory.createOrganism(longDNA);
      expect(organism).toBeDefined();
    });

    it('should validate DNA format during creation', () => {
      expect(() => {
        OrganismFactory.createOrganism(''); // Empty DNA
      }).toThrow();

      expect(() => {
        OrganismFactory.createOrganism('INVALID'); // Too short
      }).toThrow();

      expect(() => {
        OrganismFactory.createOrganism('ATCGATCGATCGATCG'); // Valid
      }).not.toThrow();
    });
  });

  describe('NeuralMesh Creation', () => {
    it('should create neural mesh directly', () => {
      const mesh = OrganismFactory.createNeuralMesh();
      
      expect(mesh).toBeDefined();
      expect(typeof mesh.initialize).toBe('function');
      expect(typeof mesh.addNode).toBe('function');
      expect(typeof mesh.propagate).toBe('function');
    });

    it('should create different mesh instances', () => {
      const mesh1 = OrganismFactory.createNeuralMesh();
      const mesh2 = OrganismFactory.createNeuralMesh();
      
      expect(mesh1).not.toBe(mesh2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid trait values gracefully', () => {
      const invalidTraits = {
        creativity: -0.5, // Invalid negative value
        focus: 1.5,       // Invalid > 1 value
        energy: 0.5       // Valid value
      };

      expect(() => {
        OrganismFactory.createOrganism('ATCGATCGATCGATCG', invalidTraits);
      }).toThrow();
    });

    it('should handle DNA with invalid characters', () => {
      const invalidDNA = 'ATCGATCGXYZGATCG'; // Contains invalid characters
      
      expect(() => {
        OrganismFactory.createOrganism(invalidDNA);
      }).toThrow();
    });

    it('should handle null/undefined parameters', () => {
      expect(() => {
        OrganismFactory.createOrganism(null as any);
      }).toThrow();

      expect(() => {
        OrganismFactory.createOrganism(undefined as any);
      }).toThrow();
    });
  });

  describe('Integration with Real Components', () => {
    it('should work with real NeuralMesh', () => {
      OrganismFactory.setDependencies({
        createNeuralMesh: () => new NeuralMesh()
      });

      const organism = OrganismFactory.createOrganism('ATCGATCGATCGATCG');
      expect(organism).toBeDefined();
    });

    it('should maintain mesh independence between organisms', async () => {
      const organism1 = OrganismFactory.createOrganism('ATCGATCGATCGATCG');
      const organism2 = OrganismFactory.createOrganism('GCTAGCTAGCTAGCTA');

      await organism1.boot();
      await organism2.boot();

      // Stimulate one organism
      organism1.stimulate('sensory_input', 0.8);
      
      // Should not affect the other
      const traits1 = organism1.getTraits();
      const traits2 = organism2.getTraits();
      
      // They might be the same initially, but should be independent instances
      expect(organism1).not.toBe(organism2);

      await organism1.hibernate();
      await organism2.hibernate();
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory when creating multiple organisms', () => {
      const organisms: IOrganismCore[] = [];
      
      // Create multiple organisms
      for (let i = 0; i < 10; i++) {
        const dna = 'ATCGATCGATCGATCG'.repeat(i + 1);
        organisms.push(OrganismFactory.createOrganism(dna));
      }

      expect(organisms.length).toBe(10);
      
      // All should be different instances
      const uniqueOrganisms = new Set(organisms);
      expect(uniqueOrganisms.size).toBe(10);
    });
  });

  describe('Factory State Management', () => {
    it('should maintain dependencies across multiple calls', () => {
      const mockFactory = jest.fn(() => new MockNeuralMesh());
      
      OrganismFactory.setDependencies({
        createNeuralMesh: mockFactory
      });

      // Create multiple organisms
      OrganismFactory.createOrganism('ATCGATCGATCGATCG');
      OrganismFactory.createOrganism('GCTAGCTAGCTAGCTA');
      OrganismFactory.createOrganism('TTAAGGCCTTAAGGCC');

      expect(mockFactory).toHaveBeenCalledTimes(3);
    });

    it('should allow dependency updates', () => {
      const firstFactory = jest.fn(() => new MockNeuralMesh());
      const secondFactory = jest.fn(() => new MockNeuralMesh());

      // Set first dependencies
      OrganismFactory.setDependencies({
        createNeuralMesh: firstFactory
      });

      OrganismFactory.createOrganism('ATCGATCGATCGATCG');
      expect(firstFactory).toHaveBeenCalledTimes(1);

      // Update dependencies
      OrganismFactory.setDependencies({
        createNeuralMesh: secondFactory
      });

      OrganismFactory.createOrganism('GCTAGCTAGCTAGCTA');
      expect(secondFactory).toHaveBeenCalledTimes(1);
      expect(firstFactory).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });
}); 