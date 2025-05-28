interface GenerativeParameters {
    complexity: number;
    symmetry: number;
    fluidity: number;
    colorVariance: number;
    patternDensity: number;
}
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
    private calculateNormals;
    private triangulate;
    private interpretLSystem;
}
export {};
//# sourceMappingURL=ProceduralGenerator.d.ts.map