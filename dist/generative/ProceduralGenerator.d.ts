interface GenerativeParameters {
    complexity: number;
    symmetry: number;
    fluidity: number;
    colorVariance: number;
    patternDensity: number;
}
export declare class ProceduralGenerator {
    private params;
    private rng;
    constructor(params: GenerativeParameters, seed?: number);
    generateBaseForm(params: GenerativeParameters): Geometry;
    applyLSystem(iterations: number): Geometry;
    generateFractalPattern(seed: number): Texture;
    private fractalNoise;
    private noise2D;
    private fade;
    private lerp;
    private grad;
    private perm;
    private initPermutation;
}
export {};
