export interface ShaderProgram {
    program: WebGLProgram;
    uniforms: Record<string, WebGLUniformLocation | null>;
    attributes: Record<string, number>;
}
export interface WebGLMesh {
    vertexBuffer: WebGLBuffer;
    indexBuffer: WebGLBuffer;
    vertexCount: number;
}
export declare class WebGLUtils {
    static createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null;
    static createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): ShaderProgram | null;
    static createBuffer(gl: WebGLRenderingContext, data: Float32Array, usage?: 35044): WebGLBuffer | null;
    static createIndexBuffer(gl: WebGLRenderingContext, data: Uint16Array, usage?: 35044): WebGLBuffer | null;
    static createQuadMesh(gl: WebGLRenderingContext): WebGLMesh | null;
    static createCircleMesh(gl: WebGLRenderingContext, segments?: number): WebGLMesh | null;
    static setUniform1f(gl: WebGLRenderingContext, location: WebGLUniformLocation | null, value: number): void;
    static setUniform3f(gl: WebGLRenderingContext, location: WebGLUniformLocation | null, x: number, y: number, z: number): void;
    static setUniformMatrix3(gl: WebGLRenderingContext, location: WebGLUniformLocation | null, matrix: Float32Array): void;
    static createTexture(gl: WebGLRenderingContext, width: number, height: number, data?: Uint8Array): WebGLTexture | null;
    static generateNoiseTexture(gl: WebGLRenderingContext, size?: number): WebGLTexture | null;
    static resizeCanvas(canvas: HTMLCanvasElement, displayWidth?: number, displayHeight?: number): boolean;
}
export default WebGLUtils;
//# sourceMappingURL=webgl.d.ts.map