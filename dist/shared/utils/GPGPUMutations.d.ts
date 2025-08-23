export interface MutationData {
    position: Float32Array;
    velocity: Float32Array;
    traits: Float32Array;
    dna: Float32Array;
    energy: Float32Array;
    generation: Float32Array;
}
export declare class GPGPUMutationProcessor {
    private gl;
    private transformProgram;
    private renderProgram;
    private vao;
    private inputBuffers;
    private outputBuffers;
    private transformFeedback;
    private maxOrganisms;
    private initialized;
    constructor(gl: WebGL2RenderingContext, maxOrganisms?: number);
    private initialize;
    private createTransformFeedbackProgram;
    private createRenderToTextureProgram;
    private setupBuffers;
    private setupTransformFeedback;
    processMutations(data: MutationData, deltaTime: number): MutationData | null;
    private uploadInputData;
    private readOutputData;
    destroy(): void;
}
export default GPGPUMutationProcessor;
//# sourceMappingURL=GPGPUMutations.d.ts.map