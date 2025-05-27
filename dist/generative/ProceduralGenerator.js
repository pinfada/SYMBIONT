"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProceduralGenerator = void 0;
class ProceduralGenerator {
    constructor(params, seed) {
        // Table de permutation pour le bruit
        this.perm = new Uint8Array(512);
        this.params = params;
        this.rng = new SeededRandom(seed || Date.now());
    }
    generateBaseForm(params) {
        const vertices = new Float32Array(18); // 6 vertices * 3 coords
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
    applyLSystem(iterations) {
        // L-System pour croissance organique
        const rules = {
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
    generateFractalPattern(seed) {
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
    fractalNoise(x, y, seed) {
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
    noise2D(x, y) {
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
        return this.lerp(v, this.lerp(u, this.grad(this.perm[a], x, y), this.grad(this.perm[b], x - 1, y)), this.lerp(u, this.grad(this.perm[a + 1], x, y - 1), this.grad(this.perm[b + 1], x - 1, y - 1)));
    }
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    lerp(t, a, b) {
        return a + t * (b - a);
    }
    grad(hash, x, y) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    initPermutation() {
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++)
            p[i] = i;
        // Shuffle
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(this.rng.next() * (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }
        // Dupliquer
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
        }
    }
}
exports.ProceduralGenerator = ProceduralGenerator;
