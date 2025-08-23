export declare class WebGLContentScriptRenderer {
    private canvas;
    private gl;
    private initialized;
    private hiddenContainer;
    initialize(): Promise<boolean>;
    private createHiddenCanvas;
    private initializeWebGL;
    private setupMessageListener;
    private handleRenderRequest;
    private renderSimpleOrganism;
    private createSimpleShaderProgram;
    private compileShader;
    private extractImageData;
    cleanup(): void;
    isInitialized(): boolean;
}
export default WebGLContentScriptRenderer;
//# sourceMappingURL=WebGLContentScript.d.ts.map