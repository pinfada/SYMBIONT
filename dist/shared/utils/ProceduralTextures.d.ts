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
export declare class ProceduralTextureGenerator {
    private gl;
    private textureCache;
    constructor(gl: WebGL2RenderingContext);
    private hashDNA;
    private seededNoise;
    private generateFractalNoise;
    private generateCellularPattern;
    private generateReactionDiffusion;
    generateOrganismTexture(options: ProceduralTextureOptions): WebGLTexture | null;
    generateDNAVisualization(dna: string, size?: number): WebGLTexture | null;
    clearCache(): void;
    getCacheSize(): number;
    destroy(): void;
}
export default ProceduralTextureGenerator;
//# sourceMappingURL=ProceduralTextures.d.ts.map