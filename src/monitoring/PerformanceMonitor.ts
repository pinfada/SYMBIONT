// src/monitoring/PerformanceMonitor.ts
import { PerformanceMetrics } from '../types';
export class PerformanceMonitor {
    private gpuLimit: number;
    private samples: number[] = [];
    private sampleSize: number = 30;
    private lastFrameTime: number = 0;
    
    constructor(gpuLimit: number = 0.3) {
      this.gpuLimit = gpuLimit;
    }
    
    public startFrame(): void {
      this.lastFrameTime = performance.now();
    }
    
    public endFrame(): void {
      const frameTime = performance.now() - this.lastFrameTime;
      this.samples.push(frameTime);
      
      if (this.samples.length > this.sampleSize) {
        this.samples.shift();
      }
    }
    
    public getCurrentLoad(): number {
      if (this.samples.length === 0) return 0;
      
      const avgFrameTime = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
      // Estimation approximative de la charge GPU
      return Math.min(avgFrameTime / 16.67, 1) * 0.7; // 60fps baseline
    }
    
    public isOverloaded(): boolean {
      return this.getCurrentLoad() > this.gpuLimit;
    }
    
    public getMetrics(): PerformanceMetrics {
      const fps = this.samples.length > 0 
        ? 1000 / (this.samples.reduce((a, b) => a + b, 0) / this.samples.length)
        : 0;
        
      return {
        fps: Math.round(fps),
        gpuLoad: this.getCurrentLoad(),
        memoryUsage: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0,
        drawCalls: 1 // À implémenter avec compteur réel
      };
    }
}