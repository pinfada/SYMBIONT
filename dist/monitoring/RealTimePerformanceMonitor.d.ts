/**
 * RealTimePerformanceMonitor - Monitoring de performance en temps réel
 * Remplace les simulations par des métriques réelles
 */
interface WebVitalsMetrics {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
    timestamp: number;
}
interface PerformanceMetrics {
    memory: {
        used: number;
        total: number;
        limit: number;
    };
    cpu: {
        usage: number;
        loadAverage: number[];
    };
    network: {
        latency: number;
        bandwidth: number;
    };
    webgl: {
        frameRate: number;
        frameTime: number;
        droppedFrames: number;
    };
    timing: {
        domContentLoaded: number;
        loadComplete: number;
        navigationStart: number;
    };
    vitals: WebVitalsMetrics;
}
interface PerformanceBudget {
    maxMemoryUsage: number;
    maxCPUUsage: number;
    maxFrameTime: number;
    maxNetworkLatency: number;
    minFrameRate: number;
}
export declare class RealTimePerformanceMonitor {
    private performanceObserver;
    private metrics;
    private budget;
    private isMonitoring;
    private frameRateTracker;
    constructor();
    private initializeMetrics;
    /**
     * Configuration de l'observateur de performance
     */
    private setupPerformanceObserver;
    /**
     * Traitement des entrées de performance
     */
    private processPerformanceEntry;
    /**
     * Mise à jour des métriques de navigation
     */
    private updateNavigationMetrics;
    /**
     * Mise à jour des métriques de paint
     */
    private updatePaintMetrics;
    /**
     * Collecte des métriques mémoire réelles
     */
    private collectMemoryMetrics;
    /**
     * Estimation de l'utilisation mémoire
     */
    private estimateMemoryUsage;
    /**
     * Mesure de l'utilisation CPU (approximative)
     */
    private measureCPUUsage;
    /**
     * Mesure de la latence réseau
     */
    private measureNetworkLatency;
    /**
     * Collecte complète des métriques
     */
    collectMetrics(): Promise<PerformanceMetrics>;
    /**
     * Vérification du budget de performance
     */
    checkPerformanceBudget(): {
        passed: boolean;
        violations: string[];
    };
    /**
     * Démarrage du monitoring continu
     */
    startMonitoring(): void;
    /**
     * Arrêt du monitoring
     */
    stopMonitoring(): void;
    /**
     * Obtient les métriques actuelles
     */
    getCurrentMetrics(): PerformanceMetrics;
    /**
     * Obtient les Web Vitals
     */
    getWebVitals(): WebVitalsMetrics;
}
export type { PerformanceMetrics, WebVitalsMetrics, PerformanceBudget };
//# sourceMappingURL=RealTimePerformanceMonitor.d.ts.map