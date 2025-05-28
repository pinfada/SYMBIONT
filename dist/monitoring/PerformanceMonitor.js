"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
class PerformanceMonitor {
    constructor(gpuLimit = 0.3) {
        this.samples = [];
        this.sampleSize = 30;
        this.lastFrameTime = 0;
        this.gpuLimit = gpuLimit;
    }
    startFrame() {
        this.lastFrameTime = performance.now();
    }
    endFrame() {
        const frameTime = performance.now() - this.lastFrameTime;
        this.samples.push(frameTime);
        if (this.samples.length > this.sampleSize) {
            this.samples.shift();
        }
    }
    getCurrentLoad() {
        if (this.samples.length === 0)
            return 0;
        const avgFrameTime = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
        // Estimation approximative de la charge GPU
        return Math.min(avgFrameTime / 16.67, 1) * 0.7; // 60fps baseline
    }
    isOverloaded() {
        return this.getCurrentLoad() > this.gpuLimit;
    }
    getMetrics() {
        const fps = this.samples.length > 0
            ? 1000 / (this.samples.reduce((a, b) => a + b, 0) / this.samples.length)
            : 0;
        const memory = performance.memory;
        return {
            fps: Math.round(fps),
            gpuLoad: this.getCurrentLoad(),
            memoryUsage: memory ? memory.usedJSHeapSize / 1048576 : 0,
            drawCalls: 1 // À implémenter avec compteur réel
        };
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
