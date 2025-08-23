// src/shared/utils/FrustumCulling.ts
import { logger } from './secureLogger';

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
  priority: number; // Higher priority objects are kept when culling aggressively
  lastVisible: number; // Timestamp when last visible
  distanceFromCamera?: number;
}

export class FrustumCuller {
  private camera: Camera2D;
  private frustum: Frustum;
  private cullingEnabled: boolean = true;
  private aggressiveCulling: boolean = false;
  private maxVisibleObjects: number = 1000;
  private cullingStats = {
    totalObjects: 0,
    visibleObjects: 0,
    culledObjects: 0,
    lastUpdateTime: 0
  };

  constructor(camera: Camera2D) {
    this.camera = camera;
    this.frustum = this.calculateFrustum();
  }

  public updateCamera(camera: Camera2D): void {
    this.camera = camera;
    this.frustum = this.calculateFrustum();
  }

  private calculateFrustum(): Frustum {
    const halfWidth = (this.camera.viewportWidth * 0.5) / this.camera.zoom;
    const halfHeight = (this.camera.viewportHeight * 0.5) / this.camera.zoom;

    // Account for camera rotation
    const cos = Math.cos(this.camera.rotation);
    const sin = Math.sin(this.camera.rotation);
    
    // Calculate rotated frustum bounds
    const corners = [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight }
    ];

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const corner of corners) {
      const rotX = corner.x * cos - corner.y * sin;
      const rotY = corner.x * sin + corner.y * cos;
      
      minX = Math.min(minX, rotX);
      maxX = Math.max(maxX, rotX);
      minY = Math.min(minY, rotY);
      maxY = Math.max(maxY, rotY);
    }

    return {
      left: this.camera.x + minX,
      right: this.camera.x + maxX,
      bottom: this.camera.y + minY,
      top: this.camera.y + maxY,
      near: -1000, // For 2D, we use a large range
      far: 1000
    };
  }

  public isBoxInFrustum(box: BoundingBox): boolean {
    return !(
      box.maxX < this.frustum.left ||
      box.minX > this.frustum.right ||
      box.maxY < this.frustum.bottom ||
      box.minY > this.frustum.top
    );
  }

  public isSphereInFrustum(sphere: BoundingSphere): boolean {
    // Check if sphere intersects with frustum
    const clampedX = Math.max(this.frustum.left, Math.min(sphere.x, this.frustum.right));
    const clampedY = Math.max(this.frustum.bottom, Math.min(sphere.y, this.frustum.top));
    
    const distanceSquared = 
      (sphere.x - clampedX) * (sphere.x - clampedX) +
      (sphere.y - clampedY) * (sphere.y - clampedY);
    
    return distanceSquared <= sphere.radius * sphere.radius;
  }

  private calculateDistance(obj: CullableObject): number {
    if ('radius' in obj.bounds) {
      const sphere = obj.bounds as BoundingSphere;
      return Math.sqrt(
        (sphere.x - this.camera.x) * (sphere.x - this.camera.x) +
        (sphere.y - this.camera.y) * (sphere.y - this.camera.y)
      );
    } else {
      const box = obj.bounds as BoundingBox;
      const centerX = (box.minX + box.maxX) * 0.5;
      const centerY = (box.minY + box.maxY) * 0.5;
      return Math.sqrt(
        (centerX - this.camera.x) * (centerX - this.camera.x) +
        (centerY - this.camera.y) * (centerY - this.camera.y)
      );
    }
  }

  public cullObjects(objects: CullableObject[]): CullableObject[] {
    if (!this.cullingEnabled) {
      return objects;
    }

    const currentTime = Date.now();
    this.cullingStats.totalObjects = objects.length;
    this.cullingStats.lastUpdateTime = currentTime;

    // First pass: frustum culling
    const visibleObjects: CullableObject[] = [];
    
    for (const obj of objects) {
      let isVisible: boolean;
      
      if ('radius' in obj.bounds) {
        isVisible = this.isSphereInFrustum(obj.bounds as BoundingSphere);
      } else {
        isVisible = this.isBoxInFrustum(obj.bounds as BoundingBox);
      }

      if (isVisible) {
        obj.lastVisible = currentTime;
        obj.distanceFromCamera = this.calculateDistance(obj);
        visibleObjects.push(obj);
      }
    }

    // Second pass: aggressive culling if too many objects
    let finalObjects = visibleObjects;
    
    if (this.aggressiveCulling && visibleObjects.length > this.maxVisibleObjects) {
      // Sort by priority (descending) and distance (ascending)
      finalObjects = visibleObjects
        .sort((a, b) => {
          const priorityDiff = b.priority - a.priority;
          if (priorityDiff !== 0) return priorityDiff;
          
          return (a.distanceFromCamera || 0) - (b.distanceFromCamera || 0);
        })
        .slice(0, this.maxVisibleObjects);
      
      logger.info(`Aggressive culling: ${visibleObjects.length} → ${finalObjects.length} objects`);
    }

    this.cullingStats.visibleObjects = finalObjects.length;
    this.cullingStats.culledObjects = objects.length - finalObjects.length;

    return finalObjects;
  }

  // Level of Detail culling based on distance
  public cullByLOD(objects: CullableObject[], lodLevels: number[]): Map<number, CullableObject[]> {
    const lodGroups = new Map<number, CullableObject[]>();
    
    // Initialize LOD groups
    for (let i = 0; i < lodLevels.length; i++) {
      lodGroups.set(i, []);
    }

    for (const obj of objects) {
      const distance = obj.distanceFromCamera || this.calculateDistance(obj);
      
      // Determine LOD level based on distance
      let lodLevel = lodLevels.length - 1; // Default to lowest detail
      
      for (let i = 0; i < lodLevels.length; i++) {
        if (distance <= lodLevels[i]) {
          lodLevel = i;
          break;
        }
      }

      const group = lodGroups.get(lodLevel);
      if (group) {
        group.push(obj);
      }
    }

    return lodGroups;
  }

  // Occlusion culling (simplified for 2D)
  public cullByOcclusion(objects: CullableObject[], occluders: BoundingBox[]): CullableObject[] {
    if (occluders.length === 0) {
      return objects;
    }

    return objects.filter(obj => {
      // Check if object is completely occluded by any occluder
      for (const occluder of occluders) {
        let isOccluded = false;
        
        if ('radius' in obj.bounds) {
          const sphere = obj.bounds as BoundingSphere;
          // Check if sphere center is inside occluder (simplified)
          isOccluded = sphere.x >= occluder.minX && 
                      sphere.x <= occluder.maxX &&
                      sphere.y >= occluder.minY && 
                      sphere.y <= occluder.maxY;
        } else {
          const box = obj.bounds as BoundingBox;
          // Check if box is completely inside occluder
          isOccluded = box.minX >= occluder.minX && 
                      box.maxX <= occluder.maxX &&
                      box.minY >= occluder.minY && 
                      box.maxY <= occluder.maxY;
        }

        if (isOccluded) {
          return false; // Object is occluded
        }
      }

      return true; // Object is not occluded
    });
  }

  // Dynamic culling based on frame rate
  public adaptiveCull(objects: CullableObject[], currentFPS: number, targetFPS: number = 60): CullableObject[] {
    const performanceRatio = currentFPS / targetFPS;
    
    if (performanceRatio < 0.8) {
      // Performance is low, cull more aggressively
      this.aggressiveCulling = true;
      this.maxVisibleObjects = Math.floor(this.maxVisibleObjects * 0.8);
      
      logger.info(`Performance adaptive culling: FPS ${currentFPS.toFixed(1)}, max objects: ${this.maxVisibleObjects}`);
    } else if (performanceRatio > 1.2) {
      // Performance is good, allow more objects
      this.aggressiveCulling = false;
      this.maxVisibleObjects = Math.min(1000, Math.floor(this.maxVisibleObjects * 1.1));
    }

    return this.cullObjects(objects);
  }

  // Predictive culling for moving objects
  public predictiveCull(objects: CullableObject[], deltaTime: number): CullableObject[] {
    // Extend frustum based on object velocities and time delta
    const extendedFrustum = { ...this.frustum };
    const extension = deltaTime * 100; // Extend by movement prediction
    
    extendedFrustum.left -= extension;
    extendedFrustum.right += extension;
    extendedFrustum.top += extension;
    extendedFrustum.bottom -= extension;

    const originalFrustum = this.frustum;
    this.frustum = extendedFrustum;
    
    const result = this.cullObjects(objects);
    
    this.frustum = originalFrustum;
    return result;
  }

  // Spatial partitioning for efficient culling
  public spatialCull(objects: CullableObject[], gridSize: number = 100): CullableObject[] {
    // Create a simple grid-based spatial partitioning
    const grid = new Map<string, CullableObject[]>();
    
    // Determine which grid cells the frustum overlaps
    const minGridX = Math.floor(this.frustum.left / gridSize);
    const maxGridX = Math.floor(this.frustum.right / gridSize);
    const minGridY = Math.floor(this.frustum.bottom / gridSize);
    const maxGridY = Math.floor(this.frustum.top / gridSize);

    const relevantObjects: CullableObject[] = [];

    // Only check objects in grid cells that overlap with frustum
    for (const obj of objects) {
      let objGridX: number, objGridY: number;
      
      if ('radius' in obj.bounds) {
        const sphere = obj.bounds as BoundingSphere;
        objGridX = Math.floor(sphere.x / gridSize);
        objGridY = Math.floor(sphere.y / gridSize);
      } else {
        const box = obj.bounds as BoundingBox;
        objGridX = Math.floor((box.minX + box.maxX) * 0.5 / gridSize);
        objGridY = Math.floor((box.minY + box.maxY) * 0.5 / gridSize);
      }

      // Check if object's grid cell overlaps with frustum grid cells
      if (objGridX >= minGridX && objGridX <= maxGridX &&
          objGridY >= minGridY && objGridY <= maxGridY) {
        relevantObjects.push(obj);
      }
    }

    // Perform detailed culling only on relevant objects
    return this.cullObjects(relevantObjects);
  }

  public setMaxVisibleObjects(max: number): void {
    this.maxVisibleObjects = Math.max(10, Math.min(10000, max));
  }

  public setAggressiveCulling(enabled: boolean): void {
    this.aggressiveCulling = enabled;
  }

  public setCullingEnabled(enabled: boolean): void {
    this.cullingEnabled = enabled;
  }

  public getFrustum(): Frustum {
    return { ...this.frustum };
  }

  public getStats(): typeof this.cullingStats {
    return { ...this.cullingStats };
  }

  public getCullingEfficiency(): number {
    if (this.cullingStats.totalObjects === 0) return 0;
    return this.cullingStats.culledObjects / this.cullingStats.totalObjects;
  }

  public resetStats(): void {
    this.cullingStats = {
      totalObjects: 0,
      visibleObjects: 0,
      culledObjects: 0,
      lastUpdateTime: Date.now()
    };
  }

  // Debug visualization helpers
  public getFrustumCorners(): Array<{x: number, y: number}> {
    return [
      { x: this.frustum.left, y: this.frustum.bottom },
      { x: this.frustum.right, y: this.frustum.bottom },
      { x: this.frustum.right, y: this.frustum.top },
      { x: this.frustum.left, y: this.frustum.top }
    ];
  }

  public isObjectVisible(obj: CullableObject): boolean {
    if ('radius' in obj.bounds) {
      return this.isSphereInFrustum(obj.bounds as BoundingSphere);
    } else {
      return this.isBoxInFrustum(obj.bounds as BoundingBox);
    }
  }
}

export default FrustumCuller;