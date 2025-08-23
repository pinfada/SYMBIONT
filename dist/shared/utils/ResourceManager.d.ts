export interface GLResource {
    id: string;
    type: 'buffer' | 'texture' | 'program' | 'framebuffer';
    glObject: WebGLBuffer | WebGLTexture | WebGLProgram | WebGLFramebuffer;
    size: number;
    lastUsed: number;
    refCount: number;
}
export declare class ResourceManager {
    private gl;
    private resources;
    private memoryUsage;
    private maxMemoryMB;
    private gcThresholdMB;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext);
    private detectMemoryLimits;
    createBuffer(id: string, data: ArrayBuffer, usage?: number): WebGLBuffer | null;
    createTexture(id: string, width: number, height: number, format?: number, data?: ArrayBufferView): WebGLTexture | null;
    retainResource(id: string): boolean;
    releaseResource(id: string): void;
    private deleteResource;
    private checkMemoryPressure;
    garbageCollect(): void;
    getMemoryUsage(): typeof this.memoryUsage;
    getMemoryUsageMB(): number;
    forceCleanup(): void;
    destroy(): void;
}
export default ResourceManager;
//# sourceMappingURL=ResourceManager.d.ts.map