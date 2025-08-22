export declare class ParticleSystem {
    private gl;
    private program;
    private particles;
    private particleBuffer;
    private maxParticles;
    private emissionRate;
    private lastEmission;
    constructor(gl: WebGLRenderingContext, maxParticles?: number);
    private initializeShaders;
    private createBuffers;
    emitParticle(x: number, y: number, energy: number): void;
    update(deltaTime: number, globalEnergy: number, centerX: number, centerY: number): void;
    render(time: number, globalEnergy: number): void;
    destroy(): void;
}
export default ParticleSystem;
//# sourceMappingURL=ParticleSystem.d.ts.map