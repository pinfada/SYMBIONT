// src/generative/ProceduralGenerator.ts
// Générateur procédural
interface GenerativeParameters {
    complexity: number;
    symmetry: number;
    fluidity: number;
    colorVariance: number;
    patternDensity: number;
  }
  
  // Types minimaux pour lever les erreurs
  interface Geometry {
    vertices: Float32Array;
    normals?: Float32Array;
    indices: Uint16Array;
  }
  
  interface Texture {
    data: Uint8Array;
    width: number;
    height: number;
  }
  
  class SeededRandom {
    private seed: number;
    constructor(seed: number) { this.seed = seed; }
    next(): number { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  }
  
  export class ProceduralGenerator {
    private params: GenerativeParameters;
    private rng: SeededRandom;
    
    constructor(params: GenerativeParameters, seed?: number) {
      this.params = params;
      this.rng = new SeededRandom(seed || Date.now());
    }
    
    public generateBaseForm(params: GenerativeParameters): Geometry {
      const vertices: Float32Array = new Float32Array(18); // 6 vertices * 3 coords
      const complexity = Math.floor(3 + params.complexity * 12); // 3-15 sides
      
      // Génération de forme base
      for (let i = 0; i < complexity; i++) {
        const angle = (i / complexity) * Math.PI * 2;
        const radius = 0.3 + this.rng.next() * 0.2 * params.complexity;
        
        vertices[i * 3] = Math.cos(angle) * radius;
        vertices[i * 3 + 1] = Math.sin(angle) * radius;
        vertices[i * 3 + 2] = 0;
      }
      
      return {
        vertices,
        normals: this.calculateNormals(vertices),
        indices: this.triangulate(complexity)
      };
    }
    
    public applyLSystem(iterations: number): Geometry {
      // L-System pour croissance organique
      const rules: { [key: string]: string } = {
        'F': 'FF+[+F-F-F]-[-F+F+F]',
        '+': '+',
        '-': '-',
        '[': '[',
        ']': ']'
      };
      
      let current = 'F';
      for (let i = 0; i < iterations; i++) {
        current = current.split('').map(char => rules[char] || char).join('');
      }
      
      return this.interpretLSystem(current);
    }
    
    public generateFractalPattern(seed: number): Texture {
      const size = 256;
      const data = new Uint8Array(size * size * 4);
      
      // Bruit de Perlin multi-octave
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const value = this.fractalNoise(x / size, y / size, seed);
          const idx = (y * size + x) * 4;
          
          data[idx] = value * 255;
          data[idx + 1] = value * 255;
          data[idx + 2] = value * 255;
          data[idx + 3] = 255;
        }
      }
      
      return { data, width: size, height: size };
    }
    
    private fractalNoise(x: number, y: number, seed: number): number {
      let value = 0;
      let amplitude = 1;
      let frequency = 1;
      let maxValue = 0;
      
      for (let i = 0; i < 8; i++) {
        value += this.noise2D(x * frequency + seed, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }
      
      return value / maxValue;
    }
    
    private noise2D(x: number, y: number): number {
      // Implémentation simplifiée du bruit de Perlin
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      
      x -= Math.floor(x);
      y -= Math.floor(y);
      
      const u = this.fade(x);
      const v = this.fade(y);
      
      // Gradient pseudo-aléatoire
      const a = this.perm[X] + Y;
      const b = this.perm[X + 1] + Y;
      
      return this.lerp(v,
        this.lerp(u, this.grad(this.perm[a], x, y),
                     this.grad(this.perm[b], x - 1, y)),
        this.lerp(u, this.grad(this.perm[a + 1], x, y - 1),
                     this.grad(this.perm[b + 1], x - 1, y - 1))
      );
    }
    
    private fade(t: number): number {
      return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    private lerp(t: number, a: number, b: number): number {
      return a + t * (b - a);
    }
    
    private grad(hash: number, x: number, y: number): number {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    // Table de permutation pour le bruit
    private perm = new Uint8Array(512);
    private initPermutation(): void {
      // Initialise la table de permutation de Perlin
      // Cette implémentation sera nécessaire pour le bruit procédural avancé
    }
    
    private calculateNormals(vertices: Float32Array): Float32Array { return new Float32Array(vertices.length); }
    private triangulate(complexity: number): Uint16Array { return new Uint16Array(complexity); }
    private interpretLSystem(current: string): Geometry { return { vertices: new Float32Array(0), indices: new Uint16Array(0) }; }
  }