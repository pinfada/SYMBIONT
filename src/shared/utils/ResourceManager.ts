// src/shared/utils/ResourceManager.ts
import { logger } from './secureLogger';

export interface GLResource {
  id: string;
  type: 'buffer' | 'texture' | 'program' | 'framebuffer';
  glObject: WebGLBuffer | WebGLTexture | WebGLProgram | WebGLFramebuffer;
  size: number; // Estimated memory usage in bytes
  lastUsed: number;
  refCount: number;
}

export class ResourceManager {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private resources: Map<string, GLResource> = new Map();
  private memoryUsage = {
    buffers: 0,
    textures: 0,
    programs: 0,
    framebuffers: 0,
    total: 0
  };
  private maxMemoryMB: number = 128; // 128MB limit
  private gcThresholdMB: number = 100; // Start GC at 100MB

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.gl = gl;
    this.detectMemoryLimits();
  }

  private detectMemoryLimits(): void {
    try {
      // Try to detect mobile/desktop and adjust limits
      const canvas = this.gl.canvas as HTMLCanvasElement;
      const isHighDPI = window.devicePixelRatio > 1.5;
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        this.maxMemoryMB = 64; // Conservative for mobile
        this.gcThresholdMB = 48;
      } else if (isHighDPI) {
        this.maxMemoryMB = 256; // More for high-DPI displays
        this.gcThresholdMB = 200;
      }
      
      logger.info(`ResourceManager: max ${this.maxMemoryMB}MB, GC at ${this.gcThresholdMB}MB`);
    } catch (error) {
      logger.warn('Failed to detect memory limits:', error);
    }
  }

  public createBuffer(id: string, data: ArrayBuffer, usage: number = this.gl.STATIC_DRAW): WebGLBuffer | null {
    try {
      const existing = this.resources.get(id);
      if (existing && existing.type === 'buffer') {
        existing.refCount++;
        existing.lastUsed = Date.now();
        return existing.glObject as WebGLBuffer;
      }

      const buffer = this.gl.createBuffer();
      if (!buffer) {
        logger.error('Failed to create buffer');
        return null;
      }

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, data, usage);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

      const resource: GLResource = {
        id,
        type: 'buffer',
        glObject: buffer,
        size: data.byteLength,
        lastUsed: Date.now(),
        refCount: 1
      };

      this.resources.set(id, resource);
      this.memoryUsage.buffers += data.byteLength;
      this.memoryUsage.total += data.byteLength;

      this.checkMemoryPressure();
      return buffer;

    } catch (error) {
      logger.error('Failed to create buffer:', error);
      return null;
    }
  }

  public createTexture(id: string, width: number, height: number, format: number = this.gl.RGBA, data?: ArrayBufferView): WebGLTexture | null {
    try {
      const existing = this.resources.get(id);
      if (existing && existing.type === 'texture') {
        existing.refCount++;
        existing.lastUsed = Date.now();
        return existing.glObject as WebGLTexture;
      }

      const texture = this.gl.createTexture();
      if (!texture) {
        logger.error('Failed to create texture');
        return null;
      }

      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      
      // Calculate texture size (assuming RGBA8)
      let bytesPerPixel = 4; // RGBA
      if (format === this.gl.RGB) bytesPerPixel = 3;
      else if (format === this.gl.LUMINANCE) bytesPerPixel = 1;
      
      const textureSize = width * height * bytesPerPixel;

      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, format, width, height, 0, format, this.gl.UNSIGNED_BYTE, data || null);
      
      // Set reasonable defaults
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      
      this.gl.bindTexture(this.gl.TEXTURE_2D, null);

      const resource: GLResource = {
        id,
        type: 'texture',
        glObject: texture,
        size: textureSize,
        lastUsed: Date.now(),
        refCount: 1
      };

      this.resources.set(id, resource);
      this.memoryUsage.textures += textureSize;
      this.memoryUsage.total += textureSize;

      this.checkMemoryPressure();
      return texture;

    } catch (error) {
      logger.error('Failed to create texture:', error);
      return null;
    }
  }

  public retainResource(id: string): boolean {
    const resource = this.resources.get(id);
    if (resource) {
      resource.refCount++;
      resource.lastUsed = Date.now();
      return true;
    }
    return false;
  }

  public releaseResource(id: string): void {
    const resource = this.resources.get(id);
    if (resource) {
      resource.refCount--;
      if (resource.refCount <= 0) {
        this.deleteResource(resource);
        this.resources.delete(id);
      }
    }
  }

  private deleteResource(resource: GLResource): void {
    try {
      switch (resource.type) {
        case 'buffer':
          this.gl.deleteBuffer(resource.glObject as WebGLBuffer);
          this.memoryUsage.buffers -= resource.size;
          break;
        case 'texture':
          this.gl.deleteTexture(resource.glObject as WebGLTexture);
          this.memoryUsage.textures -= resource.size;
          break;
        case 'program':
          this.gl.deleteProgram(resource.glObject as WebGLProgram);
          this.memoryUsage.programs -= resource.size;
          break;
        case 'framebuffer':
          this.gl.deleteFramebuffer(resource.glObject as WebGLFramebuffer);
          this.memoryUsage.framebuffers -= resource.size;
          break;
      }
      this.memoryUsage.total -= resource.size;
    } catch (error) {
      logger.error('Failed to delete resource:', error);
    }
  }

  private checkMemoryPressure(): void {
    const memoryMB = this.memoryUsage.total / (1024 * 1024);
    
    if (memoryMB > this.gcThresholdMB) {
      logger.warn(`Memory pressure: ${memoryMB.toFixed(1)}MB, running GC...`);
      this.garbageCollect();
    }
  }

  public garbageCollect(): void {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    let collected = 0;

    // Sort resources by last used time (oldest first)
    const sortedResources = Array.from(this.resources.entries())
      .filter(([_, resource]) => resource.refCount === 0)
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

    // Remove old unused resources
    for (const [id, resource] of sortedResources) {
      if (now - resource.lastUsed > maxAge) {
        this.deleteResource(resource);
        this.resources.delete(id);
        collected++;
      }

      // Stop if we're under pressure threshold
      if (this.memoryUsage.total / (1024 * 1024) < this.gcThresholdMB) {
        break;
      }
    }

    if (collected > 0) {
      logger.info(`GC: collected ${collected} resources, ${(this.memoryUsage.total / (1024 * 1024)).toFixed(1)}MB remaining`);
    }
  }

  public getMemoryUsage(): typeof this.memoryUsage {
    return { ...this.memoryUsage };
  }

  public getMemoryUsageMB(): number {
    return this.memoryUsage.total / (1024 * 1024);
  }

  public forceCleanup(): void {
    // Emergency cleanup - remove all unreferenced resources
    const toDelete: string[] = [];
    
    for (const [id, resource] of this.resources) {
      if (resource.refCount === 0) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      const resource = this.resources.get(id)!;
      this.deleteResource(resource);
      this.resources.delete(id);
    }

    logger.warn(`Emergency cleanup: removed ${toDelete.length} resources`);
  }

  public destroy(): void {
    // Clean up all resources
    for (const resource of this.resources.values()) {
      this.deleteResource(resource);
    }
    this.resources.clear();
    
    this.memoryUsage = {
      buffers: 0,
      textures: 0,
      programs: 0,
      framebuffers: 0,
      total: 0
    };
    
    logger.info('ResourceManager destroyed');
  }
}

export default ResourceManager;