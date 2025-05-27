import { PerformanceMetrics } from '../types';
export declare class PerformanceMonitor {
    private gpuLimit;
    private samples;
    private sampleSize;
    private lastFrameTime;
    constructor(gpuLimit?: number);
    startFrame(): void;
    endFrame(): void;
    getCurrentLoad(): number;
    isOverloaded(): boolean;
    getMetrics(): PerformanceMetrics;
}
