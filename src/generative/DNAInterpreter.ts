// src/generative/DNAInterpreter.ts
// Interpréteur DNA → visuel
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
  
  export class DNAInterpreter {
    private dna: string;
    private cachedParams: ShaderParameters | null = null;
    private mutationAccumulator: number = 0;
    
    constructor(dna: string) {
      this.dna = dna;
      this.interpret();
    }
    
    public interpret(dna: string = this.dna): ShaderParameters {
      // DNA string => hash values
      const hash1 = this.hashDNA(dna, 0);
      const hash2 = this.hashDNA(dna, 1);
      const hash3 = this.hashDNA(dna, 2);
      
      // Conversion en paramètres visuels
      const params: ShaderParameters = {
        primaryColor: new Float32Array([
          (hash1 % 256) / 255,
          ((hash1 >> 8) % 256) / 255,
          ((hash1 >> 16) % 256) / 255
        ]),
        secondaryColor: new Float32Array([
          (hash2 % 256) / 255,
          ((hash2 >> 8) % 256) / 255,
          ((hash2 >> 16) % 256) / 255
        ]),
        complexity: (hash1 % 100) / 100,
        symmetry: (hash2 % 100) / 100,
        fluidity: (hash3 % 100) / 100,
        colorVariance: ((hash1 ^ hash2) % 100) / 100,
        patternDensity: ((hash2 ^ hash3) % 100) / 100,
        evolutionRate: ((hash1 ^ hash3) % 100) / 100
      };
      
      this.cachedParams = params;
      return params;
    }
    
    private hashDNA(dna: string, seed: number): number {
      // FNV-1a hash pour distribution uniforme
      let hash = 2166136261 ^ seed;
      for (let i = 0; i < dna.length; i++) {
        hash ^= dna.charCodeAt(i);
        hash *= 16777619;
      }
      return hash >>> 0;
    }
    
    public getCurrentParameters(): ShaderParameters {
      if (!this.cachedParams) {
        this.cachedParams = this.interpret();
      }
      
      // Application des mutations accumulées
      const mutated = { ...this.cachedParams };
      mutated.fluidity += Math.sin(this.mutationAccumulator) * 0.1;
      mutated.complexity += Math.cos(this.mutationAccumulator * 0.7) * 0.05;
      
      return mutated;
    }
    
    public evolveDNA(factor: number): void {
      this.mutationAccumulator += factor;
      // Mutation progressive du DNA
      if (Math.abs(this.mutationAccumulator) > Math.PI * 2) {
        this.mutateDNA();
        this.mutationAccumulator = 0;
      }
    }
    
    private mutateDNA(): void {
      // Mutation aléatoire mais contrôlée
      const chars = this.dna.split('');
      const mutationIndex = Math.floor(Math.random() * chars.length);
      const mutationChar = String.fromCharCode(
        33 + Math.floor(Math.random() * 94) // ASCII printable
      );
      chars[mutationIndex] = mutationChar;
      this.dna = chars.join('');
      this.cachedParams = null; // Force recalcul
    }
}