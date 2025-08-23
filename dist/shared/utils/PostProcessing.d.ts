import { ShaderProgram } from './webgl';
export interface PostProcessingEffect {
    name: string;
    enabled: boolean;
    intensity: number;
    program: ShaderProgram;
    uniforms: Record<string, any>;
}
export interface PostProcessingFramebuffer {
    framebuffer: WebGLFramebuffer;
    texture: WebGLTexture;
    width: number;
    height: number;
}
export declare class PostProcessingManager {
    private gl;
    private effects;
    private framebuffers;
    private quadMesh;
    private currentFramebufferIndex;
    constructor(gl: WebGL2RenderingContext);
    private initializeQuadMesh;
    createFramebuffer(width: number, height: number, hdr?: boolean): PostProcessingFramebuffer | null;
    setupFramebuffers(width: number, height: number): boolean;
    addBloomEffect(intensity?: number): Promise<boolean>;
    addDepthOfFieldEffect(focusDistance?: number, blurStrength?: number): Promise<boolean>;
    beginFrame(): void;
    applyEffects(): void;
    endFrame(): void;
    setEffectEnabled(name: string, enabled: boolean): void;
    setEffectIntensity(name: string, intensity: number): void;
    updateEffectUniform(name: string, uniformName: string, value: any): void;
    resize(width: number, height: number): boolean;
    cleanup(): void;
    destroy(): void;
}
//# sourceMappingURL=PostProcessing.d.ts.map