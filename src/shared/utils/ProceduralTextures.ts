// src/shared/utils/ProceduralTextures.ts
import { logger } from './secureLogger';
import { SecureRandom } from './secureRandom';
import WebGLUtils from './webgl';

export interface OrganismTraits {
  curiosity: number;
  focus: number;
  rhythm: number;
  empathy: number;
  creativity: number;
}

export interface ProceduralTextureOptions {
  size: number;
  traits: OrganismTraits;
  dna?: string;
  generation?: number;
  energy?: number;
}

export class ProceduralTextureGenerator {
  private gl: WebGL2RenderingContext;
  private textureCache: Map<string, WebGLTexture> = new Map();
  
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  // Hash function to convert DNA string to numeric seed
  private hashDNA(dna: string): number {
    let hash = 0;
    for (let i = 0; i < dna.length; i++) {
      const char = dna.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Seeded noise function using DNA
  private seededNoise(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return (n - Math.floor(n));
  }

  // Generate fractal noise pattern based on traits
  private generateFractalNoise(width: number, height: number, traits: OrganismTraits, seed: number): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        // Normalize coordinates
        const nx = x / width;
        const ny = y / height;
        
        // Multi-octave noise influenced by traits
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;
        
        // Number of octaves based on complexity (creativity trait)
        const octaves = Math.floor(2 + traits.creativity * 4);
        
        for (let i = 0; i < octaves; i++) {
          // Scale frequency by focus (higher focus = more organized patterns)
          const scaledFreq = frequency * (1 + traits.focus * 2);
          
          const noiseValue = this.seededNoise(
            nx * scaledFreq * 8,
            ny * scaledFreq * 8,
            seed + i * 1000
          );
          
          value += noiseValue * amplitude;
          maxValue += amplitude;
          
          // Rhythm affects how amplitude decreases
          amplitude *= 0.5 + traits.rhythm * 0.3;
          frequency *= 2;
        }
        
        value /= maxValue;
        
        // Apply trait-based color modifications
        const r = Math.floor(255 * (value * (0.5 + traits.curiosity * 0.5)));
        const g = Math.floor(255 * (value * (0.4 + traits.empathy * 0.6)));
        const b = Math.floor(255 * (value * (0.6 + traits.creativity * 0.4)));
        const a = Math.floor(255 * (0.7 + value * 0.3));
        
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = a;
      }
    }
    
    return data;
  }

  // Generate cellular automata pattern for organic structures
  private generateCellularPattern(width: number, height: number, traits: OrganismTraits, seed: number): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    const grid = new Array(width * height);
    
    // Initialize with random cells based on traits
    const density = 0.3 + traits.creativity * 0.4; // More creative = more initial cells
    
    for (let i = 0; i < grid.length; i++) {
      grid[i] = this.seededNoise(i % width, Math.floor(i / width), seed) < density ? 1 : 0;
    }
    
    // Apply cellular automata rules influenced by traits
    const iterations = Math.floor(2 + traits.focus * 3); // More focus = more iterations
    
    for (let iter = 0; iter < iterations; iter++) {
      const newGrid = [...grid];
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const index = y * width + x;
          let neighbors = 0;
          
          // Count neighbors
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              neighbors += grid[(y + dy) * width + (x + dx)];
            }
          }
          
          // Empathy affects survival rules (more empathetic = more cooperative)
          const survivalThreshold = 4 - Math.floor(traits.empathy * 2);
          const birthThreshold = 3 + Math.floor(traits.rhythm * 2);
          
          if (grid[index] === 1) {
            newGrid[index] = neighbors >= survivalThreshold ? 1 : 0;
          } else {
            newGrid[index] = neighbors >= birthThreshold ? 1 : 0;
          }
        }
      }
      
      grid.splice(0, grid.length, ...newGrid);
    }
    
    // Convert to color data
    for (let i = 0; i < grid.length; i++) {
      const pixelIndex = i * 4;
      const alive = grid[i];
      
      if (alive) {
        // Living cells - warm colors influenced by traits
        data[pixelIndex] = Math.floor(255 * (0.8 + traits.curiosity * 0.2));     // Red
        data[pixelIndex + 1] = Math.floor(255 * (0.5 + traits.empathy * 0.5));   // Green  
        data[pixelIndex + 2] = Math.floor(255 * (0.3 + traits.creativity * 0.4)); // Blue
        data[pixelIndex + 3] = Math.floor(255 * (0.8 + traits.focus * 0.2));     // Alpha
      } else {
        // Dead cells - cooler, transparent
        data[pixelIndex] = Math.floor(128 * traits.rhythm);
        data[pixelIndex + 1] = Math.floor(128 * traits.focus);
        data[pixelIndex + 2] = Math.floor(128 * (1 - traits.curiosity));
        data[pixelIndex + 3] = Math.floor(64 * (1 - traits.empathy));
      }
    }
    
    return data;
  }

  // Generate reaction-diffusion pattern for organic textures
  private generateReactionDiffusion(width: number, height: number, traits: OrganismTraits, seed: number): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    const gridA = new Float32Array(width * height);
    const gridB = new Float32Array(width * height);
    const newGridA = new Float32Array(width * height);
    const newGridB = new Float32Array(width * height);
    
    // Initialize with seed pattern
    for (let i = 0; i < gridA.length; i++) {
      gridA[i] = 1.0;
      gridB[i] = 0.0;
    }
    
    // Add initial perturbations based on traits
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const perturbRadius = Math.floor(5 + traits.creativity * 15);
    
    for (let y = centerY - perturbRadius; y < centerY + perturbRadius; y++) {
      for (let x = centerX - perturbRadius; x < centerX + perturbRadius; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = y * width + x;
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          if (distance < perturbRadius) {
            gridB[index] = 1.0;
          }
        }
      }
    }
    
    // Reaction-diffusion parameters influenced by traits
    const Da = 1.0;  // Diffusion rate A
    const Db = 0.5;  // Diffusion rate B
    const f = 0.037 + traits.rhythm * 0.025;    // Feed rate
    const k = 0.060 + traits.focus * 0.020;     // Kill rate
    const dt = 1.0;
    
    const iterations = Math.floor(80 + traits.empathy * 40);
    
    for (let iter = 0; iter < iterations; iter++) {
      // Apply reaction-diffusion
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const index = y * width + x;
          
          // Laplacian for A
          const laplacianA = (
            gridA[index - 1] + gridA[index + 1] + 
            gridA[(y - 1) * width + x] + gridA[(y + 1) * width + x] - 
            4 * gridA[index]
          );
          
          // Laplacian for B
          const laplacianB = (
            gridB[index - 1] + gridB[index + 1] + 
            gridB[(y - 1) * width + x] + gridB[(y + 1) * width + x] - 
            4 * gridB[index]
          );
          
          const A = gridA[index];
          const B = gridB[index];
          const AB2 = A * B * B;
          
          newGridA[index] = A + dt * (Da * laplacianA - AB2 + f * (1 - A));
          newGridB[index] = B + dt * (Db * laplacianB + AB2 - (k + f) * B);
          
          // Clamp values
          newGridA[index] = Math.max(0, Math.min(1, newGridA[index]));
          newGridB[index] = Math.max(0, Math.min(1, newGridB[index]));
        }
      }
      
      // Swap grids
      gridA.set(newGridA);
      gridB.set(newGridB);
    }
    
    // Convert to color data
    for (let i = 0; i < gridA.length; i++) {
      const pixelIndex = i * 4;
      const valueA = gridA[i];
      const valueB = gridB[i];
      
      // Create organic-looking colors based on concentration and traits
      const concentration = valueB / (valueA + valueB + 0.001);
      
      data[pixelIndex] = Math.floor(255 * (concentration * (0.6 + traits.curiosity * 0.4)));
      data[pixelIndex + 1] = Math.floor(255 * (concentration * (0.8 + traits.empathy * 0.2)));
      data[pixelIndex + 2] = Math.floor(255 * ((1 - concentration) * (0.7 + traits.creativity * 0.3)));
      data[pixelIndex + 3] = Math.floor(255 * (0.8 + concentration * 0.2));
    }
    
    return data;
  }

  public generateOrganismTexture(options: ProceduralTextureOptions): WebGLTexture | null {
    const { size, traits, dna = 'default', generation = 0, energy = 1.0 } = options;
    
    // Create cache key
    const cacheKey = `${dna}-${generation}-${size}-${JSON.stringify(traits)}`;
    
    // Check cache
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }
    
    try {
      // Generate seed from DNA and generation
      const seed = this.hashDNA(dna) + generation * 1000;
      
      let textureData: Uint8Array;
      
      // Choose texture generation method based on dominant trait
      const maxTrait = Math.max(traits.curiosity, traits.focus, traits.rhythm, traits.empathy, traits.creativity);
      
      if (maxTrait === traits.creativity) {
        // Artistic, fractal patterns
        textureData = this.generateFractalNoise(size, size, traits, seed);
      } else if (maxTrait === traits.empathy) {
        // Organic, cellular patterns
        textureData = this.generateCellularPattern(size, size, traits, seed);
      } else if (maxTrait === traits.rhythm || maxTrait === traits.focus) {
        // Flowing, reaction-diffusion patterns
        textureData = this.generateReactionDiffusion(size, size, traits, seed);
      } else {
        // Default to fractal noise
        textureData = this.generateFractalNoise(size, size, traits, seed);
      }
      
      // Apply energy-based post-processing
      if (energy < 1.0) {
        for (let i = 0; i < textureData.length; i += 4) {
          // Reduce saturation and brightness when low energy
          const r = textureData[i];
          const g = textureData[i + 1];
          const b = textureData[i + 2];
          const a = textureData[i + 3];
          
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const energyFactor = 0.3 + energy * 0.7;
          
          textureData[i] = Math.floor(gray * (1 - energyFactor) + r * energyFactor);
          textureData[i + 1] = Math.floor(gray * (1 - energyFactor) + g * energyFactor);
          textureData[i + 2] = Math.floor(gray * (1 - energyFactor) + b * energyFactor);
          textureData[i + 3] = Math.floor(a * (0.5 + energy * 0.5));
        }
      }
      
      // Create WebGL texture
      const texture = WebGLUtils.createTexture(this.gl, size, size, textureData);
      
      if (texture) {
        // Configure texture parameters for organic look
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        
        // Cache the texture
        this.textureCache.set(cacheKey, texture);
        
        logger.info(`Generated procedural texture for organism with dominant trait: ${Object.keys(traits).find(k => (traits as any)[k] === maxTrait)}`);
      }
      
      return texture;
      
    } catch (error) {
      logger.error('Failed to generate procedural texture:', error);
      return null;
    }
  }

  public generateDNAVisualization(dna: string, size: number = 256): WebGLTexture | null {
    const data = new Uint8Array(size * size * 4);
    const hash = this.hashDNA(dna);
    
    // Create DNA-like double helix pattern
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        
        const nx = (x / size) * 2 - 1;
        const ny = (y / size) * 2 - 1;
        
        // Create helix pattern
        const angle = Math.atan2(ny, nx);
        const radius = Math.sqrt(nx * nx + ny * ny);
        const helixT = y / size * 8; // 8 turns
        
        const helix1 = Math.sin(helixT * Math.PI * 2 + angle);
        const helix2 = Math.sin(helixT * Math.PI * 2 + angle + Math.PI);
        
        // Base pairs
        const basePair1 = Math.abs(radius - 0.3) < 0.05 && Math.abs(helix1) < 0.2;
        const basePair2 = Math.abs(radius - 0.5) < 0.05 && Math.abs(helix2) < 0.2;
        
        // Color based on DNA hash
        const hashComponent = (hash >> ((x + y) % 24)) & 0xFF;
        
        if (basePair1 || basePair2) {
          data[index] = Math.floor(255 * 0.8 + hashComponent * 0.2 / 255);
          data[index + 1] = Math.floor(255 * 0.6 + (hashComponent ^ 0xAA) * 0.4 / 255);
          data[index + 2] = Math.floor(255 * 0.9 + (hashComponent ^ 0x55) * 0.1 / 255);
          data[index + 3] = 255;
        } else {
          data[index] = Math.floor(hashComponent * 0.3);
          data[index + 1] = Math.floor((hashComponent ^ 0xAA) * 0.2);
          data[index + 2] = Math.floor((hashComponent ^ 0x55) * 0.4);
          data[index + 3] = 32;
        }
      }
    }
    
    return WebGLUtils.createTexture(this.gl, size, size, data);
  }

  public clearCache(): void {
    for (const texture of this.textureCache.values()) {
      this.gl.deleteTexture(texture);
    }
    this.textureCache.clear();
    logger.info('Procedural texture cache cleared');
  }

  public getCacheSize(): number {
    return this.textureCache.size;
  }

  public destroy(): void {
    this.clearCache();
    logger.info('ProceduralTextureGenerator destroyed');
  }
}

export default ProceduralTextureGenerator;