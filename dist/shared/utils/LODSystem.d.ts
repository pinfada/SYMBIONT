import { WebGLMesh, ShaderProgram } from './webgl';
export interface LODLevel {
    level: number;
    distance: number;
    vertexCount: number;
    detail: number;
    mesh?: WebGLMesh;
    program?: ShaderProgram;
}
export interface LODObject {
    id: string;
    position: {
        x: number;
        y: number;
    };
    baseRadius: number;
    currentLOD: number;
    levels: LODLevel[];
    lastUpdate: number;
    importance: number;
    visible: boolean;
}
export interface LODConfig {
    maxLODLevels: number;
    distanceMultiplier: number;
    hysteresis: number;
    updateInterval: number;
    performanceBudget: number;
}
export declare class LODManager {
    private gl;
    private config;
    private objects;
    private camera;
    private lastUpdateTime;
    private stats;
    constructor(gl: WebGL2RenderingContext, config?: Partial<LODConfig>);
    updateCamera(camera: {
        x: number;
        y: number;
        zoom: number;
    }): void;
    private calculateDistance;
    private createOrganismLODLevels;
    private createLODMesh;
    registerObject(id: string, position: {
        x: number;
        y: number;
    }, radius: number, complexity: number, traits: any, importance?: number): void;
    updateObjectPosition(id: string, position: {
        x: number;
        y: number;
    }): void;
    updateObjectImportance(id: string, importance: number): void;
    setObjectVisible(id: string, visible: boolean): void;
    updateLOD(): void;
    private selectLODLevel;
    private findBestLODForBudget;
    private shouldChangeLOD;
    private resetStats;
    private updateStats;
    adaptLODToPerformance(currentFPS: number, targetFPS?: number): void;
    getRenderObjects(): Array<{
        object: LODObject;
        lodLevel: LODLevel;
    }>;
    renderLODGroup(renderObjects: Array<{
        object: LODObject;
        lodLevel: LODLevel;
    }>, shaderProgram: ShaderProgram): void;
    removeObject(id: string): void;
    getStats(): typeof this.stats;
    getLODEfficiency(): number;
    getConfig(): LODConfig;
    updateConfig(newConfig: Partial<LODConfig>): void;
    destroy(): void;
}
export default LODManager;
//# sourceMappingURL=LODSystem.d.ts.map