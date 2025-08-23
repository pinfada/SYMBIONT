export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export interface BoundingSphere {
    x: number;
    y: number;
    radius: number;
}
export interface Frustum {
    left: number;
    right: number;
    top: number;
    bottom: number;
    near: number;
    far: number;
}
export interface Camera2D {
    x: number;
    y: number;
    zoom: number;
    rotation: number;
    viewportWidth: number;
    viewportHeight: number;
}
export interface CullableObject {
    id: string;
    bounds: BoundingSphere | BoundingBox;
    priority: number;
    lastVisible: number;
    distanceFromCamera?: number;
}
export declare class FrustumCuller {
    private camera;
    private frustum;
    private cullingEnabled;
    private aggressiveCulling;
    private maxVisibleObjects;
    private cullingStats;
    constructor(camera: Camera2D);
    updateCamera(camera: Camera2D): void;
    private calculateFrustum;
    isBoxInFrustum(box: BoundingBox): boolean;
    isSphereInFrustum(sphere: BoundingSphere): boolean;
    private calculateDistance;
    cullObjects(objects: CullableObject[]): CullableObject[];
    cullByLOD(objects: CullableObject[], lodLevels: number[]): Map<number, CullableObject[]>;
    cullByOcclusion(objects: CullableObject[], occluders: BoundingBox[]): CullableObject[];
    adaptiveCull(objects: CullableObject[], currentFPS: number, targetFPS?: number): CullableObject[];
    predictiveCull(objects: CullableObject[], deltaTime: number): CullableObject[];
    spatialCull(objects: CullableObject[], gridSize?: number): CullableObject[];
    setMaxVisibleObjects(max: number): void;
    setAggressiveCulling(enabled: boolean): void;
    setCullingEnabled(enabled: boolean): void;
    getFrustum(): Frustum;
    getStats(): typeof this.cullingStats;
    getCullingEfficiency(): number;
    resetStats(): void;
    getFrustumCorners(): Array<{
        x: number;
        y: number;
    }>;
    isObjectVisible(obj: CullableObject): boolean;
}
export default FrustumCuller;
//# sourceMappingURL=FrustumCulling.d.ts.map