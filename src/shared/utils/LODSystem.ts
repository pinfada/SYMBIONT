// src/shared/utils/LODSystem.ts
import { logger } from './secureLogger';
import WebGLUtils, { WebGLMesh, ShaderProgram } from './webgl';

export interface LODLevel {
  level: number;
  distance: number;
  vertexCount: number;
  detail: number; // 0.0 to 1.0
  mesh?: WebGLMesh;
  program?: ShaderProgram;
}

export interface LODObject {
  id: string;
  position: { x: number; y: number };
  baseRadius: number;
  currentLOD: number;
  levels: LODLevel[];
  lastUpdate: number;
  importance: number; // Higher importance objects get better LOD
  visible: boolean;
}

export interface LODConfig {
  maxLODLevels: number;
  distanceMultiplier: number;
  hysteresis: number; // Prevents LOD flickering
  updateInterval: number; // ms between LOD updates
  performanceBudget: number; // Max total vertices to render
}

export class LODManager {
  private gl: WebGL2RenderingContext;
  private config: LODConfig;
  private objects: Map<string, LODObject> = new Map();
  private camera: { x: number; y: number; zoom: number };
  private lastUpdateTime: number = 0;
  private stats = {
    totalObjects: 0,
    highDetailObjects: 0,
    mediumDetailObjects: 0,
    lowDetailObjects: 0,
    culledObjects: 0,
    totalVertices: 0,
    frameBudgetUsed: 0
  };

  constructor(gl: WebGL2RenderingContext, config: Partial<LODConfig> = {}) {
    this.gl = gl;
    this.config = {
      maxLODLevels: 4,
      distanceMultiplier: 1.0,
      hysteresis: 0.1,
      updateInterval: 100, // Update LOD 10 times per second
      performanceBudget: 100000, // 100k vertices max per frame
      ...config
    };
    
    this.camera = { x: 0, y: 0, zoom: 1.0 };
  }

  public updateCamera(camera: { x: number; y: number; zoom: number }): void {
    this.camera = camera;
  }

  private calculateDistance(obj: LODObject): number {
    const dx = obj.position.x - this.camera.x;
    const dy = obj.position.y - this.camera.y;
    return Math.sqrt(dx * dx + dy * dy) / this.camera.zoom;
  }

  private createOrganismLODLevels(complexity: number, traits: any): LODLevel[] {
    const levels: LODLevel[] = [];
    
    // Base distances for each LOD level
    const baseDistances = [50, 150, 400, 1000];
    
    for (let i = 0; i < this.config.maxLODLevels; i++) {
      const detail = 1.0 - (i / (this.config.maxLODLevels - 1));
      const distance = baseDistances[i] * this.config.distanceMultiplier;
      
      // Vertex count based on detail level and organism complexity
      const baseVertexCount = Math.floor(32 + complexity * 32); // 32-64 base vertices
      const vertexCount = Math.floor(baseVertexCount * Math.pow(detail, 1.5));
      
      levels.push({
        level: i,
        distance,
        detail,
        vertexCount: Math.max(8, vertexCount), // Minimum 8 vertices
        mesh: this.createLODMesh(vertexCount, detail, traits)
      });
    }
    
    return levels;
  }

  private createLODMesh(vertexCount: number, detail: number, traits: any): WebGLMesh | undefined {
    // Create a circle mesh with varying detail
    const segments = Math.max(6, Math.floor(vertexCount / 2));
    
    try {
      const mesh = WebGLUtils.createCircleMesh(this.gl, segments);
      if (mesh) {
        // Store detail level in mesh for shader use
        (mesh as any).lodDetail = detail;
        return mesh;
      }
    } catch (error) {
      logger.error('Failed to create LOD mesh:', error);
    }
    
    return undefined;
  }

  public registerObject(
    id: string, 
    position: { x: number; y: number },
    radius: number,
    complexity: number,
    traits: any,
    importance: number = 1.0
  ): void {
    const levels = this.createOrganismLODLevels(complexity, traits);
    
    const lodObject: LODObject = {
      id,
      position,
      baseRadius: radius,
      currentLOD: 0,
      levels,
      lastUpdate: Date.now(),
      importance,
      visible: true
    };

    this.objects.set(id, lodObject);
    logger.info(`Registered LOD object ${id} with ${levels.length} levels`);
  }

  public updateObjectPosition(id: string, position: { x: number; y: number }): void {
    const obj = this.objects.get(id);
    if (obj) {
      obj.position = position;
    }
  }

  public updateObjectImportance(id: string, importance: number): void {
    const obj = this.objects.get(id);
    if (obj) {
      obj.importance = Math.max(0.1, Math.min(10.0, importance));
    }
  }

  public setObjectVisible(id: string, visible: boolean): void {
    const obj = this.objects.get(id);
    if (obj) {
      obj.visible = visible;
    }
  }

  public updateLOD(): void {
    const currentTime = Date.now();
    
    // Only update LOD at specified intervals
    if (currentTime - this.lastUpdateTime < this.config.updateInterval) {
      return;
    }

    this.lastUpdateTime = currentTime;
    this.resetStats();

    // Sort objects by importance and distance
    const sortedObjects = Array.from(this.objects.values())
      .filter(obj => obj.visible)
      .sort((a, b) => {
        const distanceA = this.calculateDistance(a);
        const distanceB = this.calculateDistance(b);
        const weightedDistanceA = distanceA / a.importance;
        const weightedDistanceB = distanceB / b.importance;
        return weightedDistanceA - weightedDistanceB;
      });

    let currentVertexBudget = this.config.performanceBudget;

    // Update LOD for each object
    for (const obj of sortedObjects) {
      const distance = this.calculateDistance(obj);
      let newLOD = this.selectLODLevel(obj, distance);

      // Apply performance budgeting
      if (currentVertexBudget > 0) {
        const lodLevel = obj.levels[newLOD];
        if (lodLevel && lodLevel.vertexCount <= currentVertexBudget) {
          currentVertexBudget -= lodLevel.vertexCount;
        } else {
          // Force to a lower detail level that fits budget
          newLOD = this.findBestLODForBudget(obj, currentVertexBudget);
          if (newLOD >= 0) {
            currentVertexBudget -= obj.levels[newLOD].vertexCount;
          } else {
            obj.visible = false; // Cull object if no LOD fits budget
            this.stats.culledObjects++;
            continue;
          }
        }
      } else {
        obj.visible = false;
        this.stats.culledObjects++;
        continue;
      }

      // Apply hysteresis to prevent LOD flickering
      if (this.shouldChangeLOD(obj, newLOD)) {
        obj.currentLOD = newLOD;
        obj.lastUpdate = currentTime;
      }

      this.updateStats(obj);
    }

    this.stats.frameBudgetUsed = 1.0 - (currentVertexBudget / this.config.performanceBudget);

    // Log performance info periodically
    if (currentTime % 5000 < this.config.updateInterval) {
      logger.info(`LOD Stats: ${this.stats.totalObjects} objects, ${this.stats.totalVertices} vertices, ${(this.stats.frameBudgetUsed * 100).toFixed(1)}% budget used`);
    }
  }

  private selectLODLevel(obj: LODObject, distance: number): number {
    // Find the appropriate LOD level based on distance and object importance
    const adjustedDistance = distance / Math.max(0.1, obj.importance);
    
    for (let i = 0; i < obj.levels.length; i++) {
      if (adjustedDistance <= obj.levels[i].distance) {
        return i;
      }
    }
    
    return obj.levels.length - 1; // Return lowest detail level
  }

  private findBestLODForBudget(obj: LODObject, budget: number): number {
    // Find the highest detail LOD that fits within the budget
    for (let i = obj.levels.length - 1; i >= 0; i--) {
      if (obj.levels[i].vertexCount <= budget) {
        return i;
      }
    }
    return -1; // No LOD fits the budget
  }

  private shouldChangeLOD(obj: LODObject, newLOD: number): boolean {
    if (obj.currentLOD === newLOD) {
      return false;
    }

    // Apply hysteresis to prevent flickering
    const distance = this.calculateDistance(obj);
    const currentLevel = obj.levels[obj.currentLOD];
    const newLevel = obj.levels[newLOD];
    
    if (!currentLevel || !newLevel) {
      return true;
    }

    const hysteresisAmount = currentLevel.distance * this.config.hysteresis;
    
    if (newLOD > obj.currentLOD) {
      // Reducing quality - require distance to be clearly past threshold
      return distance > newLevel.distance + hysteresisAmount;
    } else {
      // Increasing quality - require distance to be clearly before threshold
      return distance < newLevel.distance - hysteresisAmount;
    }
  }

  private resetStats(): void {
    this.stats = {
      totalObjects: 0,
      highDetailObjects: 0,
      mediumDetailObjects: 0,
      lowDetailObjects: 0,
      culledObjects: 0,
      totalVertices: 0,
      frameBudgetUsed: 0
    };
  }

  private updateStats(obj: LODObject): void {
    this.stats.totalObjects++;
    this.stats.totalVertices += obj.levels[obj.currentLOD]?.vertexCount || 0;

    if (obj.currentLOD <= 1) {
      this.stats.highDetailObjects++;
    } else if (obj.currentLOD <= 2) {
      this.stats.mediumDetailObjects++;
    } else {
      this.stats.lowDetailObjects++;
    }
  }

  // Adaptive LOD based on frame rate
  public adaptLODToPerformance(currentFPS: number, targetFPS: number = 60): void {
    const performanceRatio = currentFPS / targetFPS;
    
    if (performanceRatio < 0.8) {
      // Reduce quality globally
      this.config.distanceMultiplier *= 0.9;
      this.config.performanceBudget = Math.floor(this.config.performanceBudget * 0.9);
      logger.info(`Reducing LOD quality: distance multiplier ${this.config.distanceMultiplier.toFixed(2)}, budget ${this.config.performanceBudget}`);
    } else if (performanceRatio > 1.2) {
      // Increase quality gradually
      this.config.distanceMultiplier = Math.min(2.0, this.config.distanceMultiplier * 1.05);
      this.config.performanceBudget = Math.min(200000, Math.floor(this.config.performanceBudget * 1.05));
    }
  }

  // Get LOD objects ready for rendering
  public getRenderObjects(): Array<{object: LODObject, lodLevel: LODLevel}> {
    const renderObjects: Array<{object: LODObject, lodLevel: LODLevel}> = [];
    
    for (const obj of this.objects.values()) {
      if (!obj.visible) continue;
      
      const lodLevel = obj.levels[obj.currentLOD];
      if (lodLevel && lodLevel.mesh) {
        renderObjects.push({ object: obj, lodLevel });
      }
    }
    
    return renderObjects;
  }

  // Specialized rendering for different LOD levels
  public renderLODGroup(renderObjects: Array<{object: LODObject, lodLevel: LODLevel}>, shaderProgram: ShaderProgram): void {
    const gl = this.gl;
    
    // Group by LOD level for batched rendering
    const lodGroups = new Map<number, Array<{object: LODObject, lodLevel: LODLevel}>>();
    
    for (const renderObject of renderObjects) {
      const level = renderObject.lodLevel.level;
      if (!lodGroups.has(level)) {
        lodGroups.set(level, []);
      }
      lodGroups.get(level)!.push(renderObject);
    }

    // Render each LOD group
    for (const [lodLevel, objects] of lodGroups) {
      // Set LOD-specific uniforms
      if (shaderProgram.uniforms['u_lodLevel']) {
        WebGLUtils.setUniform1f(gl, shaderProgram.uniforms['u_lodLevel'], lodLevel);
      }
      
      if (shaderProgram.uniforms['u_lodDetail']) {
        const detail = objects[0]?.lodLevel.detail || 1.0;
        WebGLUtils.setUniform1f(gl, shaderProgram.uniforms['u_lodDetail'], detail);
      }

      // Render all objects in this LOD level
      for (const { object, lodLevel: level } of objects) {
        if (level.mesh) {
          // Set object-specific uniforms
          if (shaderProgram.uniforms['u_position']) {
            WebGLUtils.setUniform2f(gl, shaderProgram.uniforms['u_position'], object.position.x, object.position.y);
          }

          // Setup mesh buffers
          gl.bindBuffer(gl.ARRAY_BUFFER, level.mesh.vertexBuffer);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, level.mesh.indexBuffer);

          // Setup vertex attributes
          const positionLocation = shaderProgram.attributes['a_position'];
          const texCoordLocation = shaderProgram.attributes['a_texCoord'];

          if (positionLocation !== undefined && positionLocation >= 0) {
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
          }

          if (texCoordLocation !== undefined && texCoordLocation >= 0) {
            gl.enableVertexAttribArray(texCoordLocation);
            gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
          }

          // Draw
          gl.drawElements(gl.TRIANGLES, level.mesh.vertexCount, gl.UNSIGNED_SHORT, 0);
        }
      }
    }
  }

  public removeObject(id: string): void {
    const obj = this.objects.get(id);
    if (obj) {
      // Clean up meshes
      for (const level of obj.levels) {
        if (level.mesh) {
          this.gl.deleteBuffer(level.mesh.vertexBuffer);
          this.gl.deleteBuffer(level.mesh.indexBuffer);
        }
        if (level.program) {
          this.gl.deleteProgram(level.program.program);
        }
      }
      this.objects.delete(id);
    }
  }

  public getStats(): typeof this.stats {
    return { ...this.stats };
  }

  public getLODEfficiency(): number {
    if (this.stats.totalObjects === 0) return 0;
    return 1.0 - (this.stats.highDetailObjects / this.stats.totalObjects);
  }

  public getConfig(): LODConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<LODConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('LOD configuration updated:', this.config);
  }

  public destroy(): void {
    for (const obj of this.objects.values()) {
      for (const level of obj.levels) {
        if (level.mesh) {
          this.gl.deleteBuffer(level.mesh.vertexBuffer);
          this.gl.deleteBuffer(level.mesh.indexBuffer);
        }
        if (level.program) {
          this.gl.deleteProgram(level.program.program);
        }
      }
    }
    this.objects.clear();
    logger.info('LODManager destroyed');
  }
}

export default LODManager;