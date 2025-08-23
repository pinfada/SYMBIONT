export declare enum ParticleType {
    ENERGY = 0,
    MUTATION = 1,
    CONSCIOUSNESS = 2,
    TRAIT = 3
}
export declare class ParticleSystem {
    private gl;
    private program;
    private particles;
    private particleBuffer;
    private maxParticles;
    private emissionRate;
    private lastEmission;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, maxParticles?: number);
    private initializeShaders;
    private createBuffers;
    emitParticle(x: number, y: number, energy: number, type?: ParticleType): void;
    private getSpeedForType;
    private getColorForType;
    private getSizeForType;
    private getMaxAgeForType;
    emitMutationBurst(x: number, y: number, intensity: number): void;
    emitConsciousnessPulse(x: number, y: number, consciousness: number): void;
    emitTraitParticles(x: number, y: number, traits: Record<string, number>): void;
    update(deltaTime: number, globalEnergy: number, centerX: number, centerY: number): void;
    render(time: number, globalEnergy: number, mutationLevel?: number): void;
    destroy(): void;
}
export default ParticleSystem;
//# sourceMappingURL=ParticleSystem.d.ts.map