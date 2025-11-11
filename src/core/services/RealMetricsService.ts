import { logger } from '@shared/utils/secureLogger';
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
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time To First Byte
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  latency: number;
  frameRate: number;
  timestamp: number;
}

class RealMetricsService {
  private static instance: RealMetricsService;
  private isProduction: boolean;
  private metricsCache: Map<string, { value: unknown; timestamp: number }> = new Map();
  
  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  static getInstance(): RealMetricsService {
    if (!RealMetricsService.instance) {
      RealMetricsService.instance = new RealMetricsService();
    }
    return RealMetricsService.instance;
  }

  /**
   * Collecte des métriques mémoire réelles
   */
  async getMemoryMetrics(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      // Try Performance Memory API (Chrome)
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        return {
          used: memInfo.usedJSHeapSize,
          total: memInfo.totalJSHeapSize,
          percentage: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100
        };
      }

      // Fallback: Estimate via DOM elements count
      const estimate = this.estimateMemoryUsage();
      return {
        used: estimate,
        total: estimate * 2,
        percentage: 50
      };
    } catch (_error) {
      logger.warn('Erreur collecte mémoire, fallback estimation:', _error);
      return this.getFallbackMemoryMetrics();
    }
  }

  /**
   * Collecte des métriques de timing réelles
   */
  async getTimingMetrics(): Promise<{ loadTime: number; domReady: number; firstPaint: number; firstContentfulPaint: number }> {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      const firstPaint = paint.find(p => p.name === 'first-paint')?.startTime || 0;
      const firstContentfulPaint = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0;

      return {
        loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
        domReady: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
        firstPaint,
        firstContentfulPaint
      };
    } catch (_error) {
      logger.warn('Erreur collecte timing, fallback estimation:', _error);
      return this.getFallbackTimingMetrics();
    }
  }

  /**
   * Collecte des métriques réseau réelles
   */
  async getNetworkMetrics(): Promise<{ latency: number; bandwidth: number; connectionType: string }> {
    try {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      // Mesure latency via HEAD request vers favicon
      const latency = await this.measureNetworkLatency();
      
      return {
        latency,
        bandwidth: connection?.downlink || 0,
        connectionType: connection?.effectiveType || 'unknown'
      };
    } catch (_error) {
      logger.warn('Erreur collecte réseau, fallback estimation:', _error);
      return this.getFallbackNetworkMetrics();
    }
  }

  /**
   * Collecte des métriques CPU réelles (estimation)
   */
  async getCPUMetrics(): Promise<{ usage: number; cores: number }> {
    try {
      const usage = await this.estimateCPUUsage();
      const cores = navigator.hardwareConcurrency || 4;
      
      return { usage, cores };
    } catch (_error) {
      logger.warn('Erreur collecte CPU, fallback estimation:', _error);
      return this.getFallbackCPUMetrics();
    }
  }

  /**
   * Interface principale pour les métriques système (remplace Math.random())
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const cacheKey = 'system_metrics';
    const cached = this.metricsCache.get(cacheKey);
    
    // Cache 30 secondes pour éviter overhead
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.value as SystemMetrics;
    }

    try {
      const [memory, network, cpu] = await Promise.all([
        this.getMemoryMetrics(),
        this.getNetworkMetrics(),
        this.getCPUMetrics()
      ]);

      const frameRate = this.measureFrameRate();

      const metrics: SystemMetrics = {
        cpu: cpu.usage,
        memory: memory.percentage,
        latency: network.latency,
        frameRate: await frameRate,
        timestamp: Date.now()
      };

      this.metricsCache.set(cacheKey, { value: metrics, timestamp: Date.now() });
      return metrics;
    } catch (_error) {
      logger.error('Erreur collecte métriques système:', _error);
      return this.getFallbackSystemMetrics();
    }
  }

  /**
   * Collecte Web Vitals pour performance UX
   */
  async getWebVitals(): Promise<WebVitalsMetrics> {
    try {
      const [lcp, fid, cls, fcp, ttfb] = await Promise.all([
        this.measureLCP(),
        this.measureFID(),
        this.measureCLS(),
        this.measureFCP(),
        this.measureTTFB()
      ]);

      return { lcp, fid, cls, fcp, ttfb };
    } catch (_error) {
      logger.warn('Erreur Web Vitals, fallback defaults:', _error);
      return this.getFallbackWebVitals();
    }
  }

  // === MÉTHODES PRIVÉES DE MESURE ===

  private async measureNetworkLatency(): Promise<number> {
    try {
      const start = performance.now();
      await fetch('/favicon.ico', { method: 'HEAD' });
      return performance.now() - start;
    } catch {
      return 50; // Fallback 50ms
    }
  }

  private async estimateCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      const totalIterations = 50000;
      const chunkSize = 1000; // Process in smaller chunks
      let currentIteration = 0;
      let result = 0;

      // Break work into chunks to avoid blocking the event loop
      const processChunk = () => {
        const endIteration = Math.min(currentIteration + chunkSize, totalIterations);

        // Process one chunk
        for (let i = currentIteration; i < endIteration; i++) {
          result += Math.sqrt(i) * Math.sin(i);
        }

        currentIteration = endIteration;

        if (currentIteration < totalIterations) {
          // Yield to event loop before processing next chunk
          setTimeout(processChunk, 0);
        } else {
          // All chunks processed, calculate result
          const duration = performance.now() - start;
          // Normaliser entre 0 et 1 (plus de 20ms = usage élevé)
          const usage = Math.min(duration / 20, 1);
          resolve(usage);
        }
      };

      // Start processing
      processChunk();
    });
  }

  private async measureFrameRate(): Promise<number> {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      
      const countFrame = () => {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(countFrame);
        } else {
          resolve(frames);
        }
      };
      
      requestAnimationFrame(countFrame);
    });
  }

  private estimateMemoryUsage(): number {
    // Estimation basée sur le nombre d'éléments DOM
    const domElements = document.querySelectorAll('*').length;
    const estimateBytes = domElements * 1000; // ~1KB par élément
    return estimateBytes;
  }

  // Web Vitals measurements
  private async measureLCP(): Promise<number> {
    try {
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint') as any[];
      return lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;
    } catch {
      return 2500; // Fallback LCP
    }
  }

  private async measureFID(): Promise<number> {
    try {
      const fidEntries = performance.getEntriesByType('first-input') as any[];
      return fidEntries.length > 0 ? fidEntries[0].processingStart - fidEntries[0].startTime : 0;
    } catch {
      return 100; // Fallback FID
    }
  }

  private async measureCLS(): Promise<number> {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
      
      // Wait 100ms to collect entries
      await new Promise(resolve => setTimeout(resolve, 100));
      observer.disconnect();
      
      return clsValue;
    } catch {
      return 0.1; // Fallback CLS
    }
  }

  private async measureFCP(): Promise<number> {
    try {
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      return fcpEntry ? fcpEntry.startTime : 0;
    } catch {
      return 1500; // Fallback FCP
    }
  }

  private async measureTTFB(): Promise<number> {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation ? navigation.responseStart - navigation.requestStart : 0;
    } catch {
      return 200; // Fallback TTFB
    }
  }

  // === FALLBACKS POUR DÉVELOPPEMENT ===

  private getFallbackMemoryMetrics() {
    return {
      used: 25 * 1024 * 1024, // 25MB
      total: 100 * 1024 * 1024, // 100MB
      percentage: 25
    };
  }

  private getFallbackTimingMetrics() {
    return {
      loadTime: 1500,
      domReady: 800,
      firstPaint: 1200,
      firstContentfulPaint: 1400
    };
  }

  private getFallbackNetworkMetrics() {
    return {
      latency: 50,
      bandwidth: 10,
      connectionType: '4g'
    };
  }

  private getFallbackCPUMetrics() {
    return {
      usage: 0.15, // 15%
      cores: 4
    };
  }

  private getFallbackSystemMetrics(): SystemMetrics {
    return {
      cpu: 0.15,
      memory: 25,
      latency: 50,
      frameRate: 60,
      timestamp: Date.now()
    };
  }

  private getFallbackWebVitals(): WebVitalsMetrics {
    return {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      fcp: 1500,
      ttfb: 200
    };
  }

  /**
   * Utilitaire pour remplacer Math.random() par vraies données
   */
  async getRandomReplacementValue(type: 'cpu' | 'memory' | 'latency' | 'generic' = 'generic'): Promise<number> {
    const metrics = await this.getSystemMetrics();
    
    switch (type) {
      case 'cpu':
        return metrics.cpu;
      case 'memory':
        return metrics.memory / 100; // Normaliser 0-1
      case 'latency':
        return metrics.latency / 1000; // Normaliser en secondes
      default:
        // Mélange normalisé pour usage générique
        return (metrics.cpu + metrics.memory / 100 + metrics.latency / 1000) / 3;
    }
  }

  /**
   * Force refresh du cache des métriques
   */
  refreshMetrics(): void {
    this.metricsCache.clear();
  }

  /**
   * Obtient des métriques en mode développement avec warnings
   */
  async getDevMetrics(): Promise<SystemMetrics> {
    if (this.isProduction) {
      return this.getSystemMetrics();
    }

    logger.warn('🚧 MODE DÉVELOPPEMENT: Utilisation métriques simulées pour les tests');
    return this.getFallbackSystemMetrics();
  }

  // =============================================================================
  // MÉTHODES AJOUTÉES POUR COMPATIBILITÉ ORGANISMCORE
  // =============================================================================

  /**
   * Get CPU usage as a normalized value (0-1)
   */
  async getCPUUsage(): Promise<number> {
    const metrics = await this.getSystemMetrics();
    return metrics.cpu;
  }

  /**
   * Get memory usage as a normalized value (0-1)
   */
  async getMemoryUsage(): Promise<number> {
    const metrics = await this.getSystemMetrics();
    return metrics.memory / 100; // Convert percentage to 0-1 range
  }
}

export default RealMetricsService;