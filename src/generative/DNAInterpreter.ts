// src/generative/DNAInterpreter.ts
// Interpréteur DNA → paramètres visuels harmonisé
import { ShaderParameters } from '../types';
import { SecureRandom } from '@shared/utils/secureRandom';

export class DNAInterpreter {
  private dna: string;
  private cachedParams: ShaderParameters | null = null;
  private mutationAccumulator: number = 0;
  
  constructor(dna: string) {
    this.dna = dna;
    this.interpret();
  }
  
  /**
   * Interprète le DNA en paramètres shaders déterministes
   */
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
  
  /**
   * Hash FNV-1a pour distribution uniforme
   */
  private hashDNA(dna: string, seed: number): number {
    // FNV-1a hash pour distribution uniforme
    let hash = 2166136261 ^ seed;
    for (let i = 0; i < dna.length; i++) {
      hash ^= dna.charCodeAt(i);
      hash *= 16777619;
    }
    return hash >>> 0;
  }
  
  /**
   * Retourne les paramètres courants, avec mutations accumulées
   */
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
  
  /**
   * Fait évoluer le DNA (mutation progressive)
   */
  public evolveDNA(factor: number): void {
    this.mutationAccumulator += factor;
    // Mutation progressive du DNA
    if (Math.abs(this.mutationAccumulator) > Math.PI * 2) {
      this.mutateDNA();
      this.mutationAccumulator = 0;
    }
  }
  
  /**
   * Mutation aléatoire mais contrôlée du DNA
   */
  private mutateDNA(): void {
    // Mutation aléatoire mais contrôlée
    const chars = this.dna.split('');
    const mutationIndex = Math.floor(SecureRandom.random() * chars.length);
    const mutationChar = String.fromCharCode(
      33 + Math.floor(SecureRandom.random() * 94) // ASCII printable
    );
    chars[mutationIndex] = mutationChar;
    this.dna = chars.join('');
    this.cachedParams = null; // Force recalcul
  }
}