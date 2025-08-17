/**
 * RealMetricsService - Service central pour collecte de vraies métriques
 * Remplace Math.random() par des données de performance réelles
 */
export interface PerformanceMetrics {
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    timing: {
        loadTime: number;
        domReady: number;
        firstPaint: number;
        firstContentfulPaint: number;
    };
    network: {
        latency: number;
        bandwidth: number;
        connectionType: string;
    };
    cpu: {
        usage: number;
        cores: number;
    };
    timestamp: number;
}
export interface WebVitalsMetrics {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
}
export interface SystemMetrics {
    cpu: number;
    memory: number;
    latency: number;
    frameRate: number;
    timestamp: number;
}
declare class RealMetricsService {
    private static instance;
    private isProduction;
    private metricsCache;
    private constructor();
    static getInstance(): RealMetricsService;
    /**
     * Collecte des métriques mémoire réelles
     */
    getMemoryMetrics(): Promise<{
        used: number;
        total: number;
        percentage: number;
    }>;
    /**
     * Collecte des métriques de timing réelles
     */
    getTimingMetrics(): Promise<{
        loadTime: number;
        domReady: number;
        firstPaint: number;
        firstContentfulPaint: number;
    }>;
    /**
     * Collecte des métriques réseau réelles
     */
    getNetworkMetrics(): Promise<{
        latency: number;
        bandwidth: number;
        connectionType: string;
    }>;
    /**
     * Collecte des métriques CPU réelles (estimation)
     */
    getCPUMetrics(): Promise<{
        usage: number;
        cores: number;
    }>;
    /**
     * Interface principale pour les métriques système (remplace Math.random())
     */
    getSystemMetrics(): Promise<SystemMetrics>;
    /**
     * Collecte Web Vitals pour performance UX
     */
    getWebVitals(): Promise<WebVitalsMetrics>;
    private measureNetworkLatency;
    private estimateCPUUsage;
    private measureFrameRate;
    private estimateMemoryUsage;
    private measureLCP;
    private measureFID;
    private measureCLS;
    private measureFCP;
    private measureTTFB;
    private getFallbackMemoryMetrics;
    private getFallbackTimingMetrics;
    private getFallbackNetworkMetrics;
    private getFallbackCPUMetrics;
    private getFallbackSystemMetrics;
    private getFallbackWebVitals;
    /**
     * Utilitaire pour remplacer Math.random() par vraies données
     */
    getRandomReplacementValue(type?: 'cpu' | 'memory' | 'latency' | 'generic'): Promise<number>;
    /**
     * Force refresh du cache des métriques
     */
    refreshMetrics(): void;
    /**
     * Obtient des métriques en mode développement avec warnings
     */
    getDevMetrics(): Promise<SystemMetrics>;
    /**
     * Get CPU usage as a normalized value (0-1)
     */
    getCPUUsage(): Promise<number>;
    /**
     * Get memory usage as a normalized value (0-1)
     */
    getMemoryUsage(): Promise<number>;
}
export default RealMetricsService;
//# sourceMappingURL=RealMetricsService.d.ts.map