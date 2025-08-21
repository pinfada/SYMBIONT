interface AnalyticsMetric {
    cpu: number;
    memory: number;
    latency: number;
    fps: number;
    frameTime: number;
    webVitals: {
        lcp: number;
        fid: number;
        cls: number;
        fcp: number;
        ttfb: number;
    };
    timestamp: number;
}
interface AnomalyDetection {
    type: 'cpu' | 'memory' | 'latency' | 'fps' | 'frameTime';
    severity: 'warning' | 'critical';
    value: number;
    threshold: number;
    timestamp: number;
}
export declare class PerformanceAnalytics {
    private metrics;
    private anomalies;
    private running;
    private interval;
    private performanceMonitor;
    private budget;
    constructor();
    start(): Promise<void>;
    stop(): void;
    private collect;
    private detectAnomalies;
    private recordAnomaly;
    private checkPerformanceBudget;
    log(): void;
    export(): AnalyticsMetric[];
    exportAnomalies(): AnomalyDetection[];
    /**
     * Obtient un rapport de performance complet
     */
    getPerformanceReport(): {
        summary: {
            avgCPU: number;
            avgMemory: number;
            avgLatency: number;
            avgFPS: number;
            anomalyCount: number;
        };
        webVitals: unknown;
        budgetStatus: unknown;
    };
    /**
     * Réinitialise les métriques et anomalies
     */
    reset(): void;
}
export {};
//# sourceMappingURL=performance-analytics.d.ts.map