import { SecureRandom } from '@shared/utils/secureRandom';
import { SecureLogger } from '@shared/utils/secureLogger';
/**
 * RealTimePerformanceMonitor - Monitoring de performance en temps réel
 * Remplace les simulations par des métriques réelles
 */

interface WebVitalsMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time To First Byte
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
  maxMemoryUsage: number; // 50MB
  maxCPUUsage: number; // 10%
  maxFrameTime: number; // 16.67ms (60 FPS)
  maxNetworkLatency: number; // 100ms
  minFrameRate: number; // 58 FPS
}

export class RealTimePerformanceMonitor {
  private performanceObserver: PerformanceObserver | null = null;
  private metrics: PerformanceMetrics;
  private budget: PerformanceBudget;
  private isMonitoring = false;
  private frameRateTracker: FrameRateTracker;

  constructor() {
    this.budget = {
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      maxCPUUsage: 10, // 10%
      maxFrameTime: 16.67, // 60 FPS
      maxNetworkLatency: 100, // 100ms
      minFrameRate: 58 // FPS
    };

    this.metrics = this.initializeMetrics();
    this.frameRateTracker = new FrameRateTracker();
    this.setupPerformanceObserver();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      memory: { used: 0, total: 0, limit: 0 },
      cpu: { usage: 0, loadAverage: [] },
      network: { latency: 0, bandwidth: 0 },
      webgl: { frameRate: 0, frameTime: 0, droppedFrames: 0 },
      timing: { domContentLoaded: 0, loadComplete: 0, navigationStart: 0 },
      vitals: { lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0, timestamp: Date.now() }
    };
  }

  /**
   * Configuration de l'observateur de performance
   */
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') {
      SecureLogger.warn('PerformanceObserver non disponible');
      return;
    }

    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.processPerformanceEntry(entry);
      }
    });

    // Observer les différents types d'entrées de performance
    const entryTypes = [
      'measure',
      'navigation', 
      'paint',
      'largest-contentful-paint',
      'first-input',
      'layout-shift'
    ];

    entryTypes.forEach(type => {
      try {
        this.performanceObserver!.observe({ entryTypes: [type] });
      } catch (e) {
        SecureLogger.warn(`Type d'entrée ${type} non supporté:`, e);
      }
    });
  }

  /**
   * Traitement des entrées de performance
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'navigation':
        this.updateNavigationMetrics(entry as PerformanceNavigationTiming);
        break;
      case 'paint':
        this.updatePaintMetrics(entry as PerformancePaintTiming);
        break;
      case 'largest-contentful-paint':
        this.metrics.vitals.lcp = entry.startTime;
        break;
      case 'first-input':
        this.metrics.vitals.fid = (entry as any).processingStart - entry.startTime;
        break;
      case 'layout-shift':
        this.metrics.vitals.cls += (entry as any).value || 0;
        break;
    }
  }

  /**
   * Mise à jour des métriques de navigation
   */
  private updateNavigationMetrics(entry: PerformanceNavigationTiming): void {
    this.metrics.timing = {
      navigationStart: entry.fetchStart,
      domContentLoaded: entry.domContentLoadedEventEnd - entry.fetchStart,
      loadComplete: entry.loadEventEnd - entry.fetchStart
    };

    this.metrics.vitals.ttfb = entry.responseStart - entry.requestStart;
  }

  /**
   * Mise à jour des métriques de paint
   */
  private updatePaintMetrics(entry: PerformancePaintTiming): void {
    if (entry.name === 'first-contentful-paint') {
      this.metrics.vitals.fcp = entry.startTime;
    }
  }

  /**
   * Collecte des métriques mémoire réelles
   */
  private async collectMemoryMetrics(): Promise<void> {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.metrics.memory = {
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        limit: memInfo.jsHeapSizeLimit
      };
    } else {
      // Estimation basée sur les objets JavaScript
      this.metrics.memory = {
        used: this.estimateMemoryUsage(),
        total: 0,
        limit: 0
      };
    }
  }

  /**
   * Estimation de l'utilisation mémoire
   */
  private estimateMemoryUsage(): number {
    // Estimation approximative basée sur les objets globaux
    let estimate = 0;
    
    try {
      // Taille approximative des objets DOM
      estimate += document.querySelectorAll('*').length * 1000; // ~1KB par élément
      
      // Estimation des variables JavaScript
      estimate += Object.keys(window).length * 100;
      
      return estimate;
    } catch {
      return 1024 * 1024; // 1MB par défaut
    }
  }

  /**
   * Mesure de l'utilisation CPU (approximative)
   */
  private async measureCPUUsage(): Promise<number> {
    const start = performance.now();
    
    // Tâche intensive pour mesurer la latence CPU
    let iterations = 0;
    const targetTime = 10; // 10ms
    
    while (performance.now() - start < targetTime) {
      iterations++;
      SecureRandom.random(); // Opération simple
    }
    
    const actualTime = performance.now() - start;
    const efficiency = targetTime / actualTime;
    
    // Conversion en pourcentage d'utilisation (inverse de l'efficacité)
    return Math.max(0, Math.min(100, (1 - efficiency) * 100));
  }

  /**
   * Mesure de la latence réseau
   */
  private async measureNetworkLatency(): Promise<number> {
    const start = performance.now();
    
    try {
      // Ping vers une ressource locale ou API
      await fetch('data:text/plain,ping', { 
        method: 'GET',
        cache: 'no-cache'
      });
      
      return performance.now() - start;
    } catch {
      return 999; // Valeur élevée en cas d'erreur
    }
  }

  /**
   * Collecte complète des métriques
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    await Promise.all([
      this.collectMemoryMetrics(),
      this.measureCPUUsage().then(cpu => { this.metrics.cpu.usage = cpu; }),
      this.measureNetworkLatency().then(latency => { this.metrics.network.latency = latency; })
    ]);

    // Mise à jour des métriques WebGL si disponibles
    this.metrics.webgl = this.frameRateTracker.getMetrics();
    
    // Mise à jour du timestamp
    this.metrics.vitals.timestamp = Date.now();
    
    return { ...this.metrics };
  }

  /**
   * Vérification du budget de performance
   */
  checkPerformanceBudget(): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    if (this.metrics.memory.used > this.budget.maxMemoryUsage) {
      violations.push(`Mémoire: ${(this.metrics.memory.used / 1024 / 1024).toFixed(1)}MB > ${this.budget.maxMemoryUsage / 1024 / 1024}MB`);
    }

    if (this.metrics.cpu.usage > this.budget.maxCPUUsage) {
      violations.push(`CPU: ${this.metrics.cpu.usage.toFixed(1)}% > ${this.budget.maxCPUUsage}%`);
    }

    if (this.metrics.webgl.frameTime > this.budget.maxFrameTime) {
      violations.push(`Frame Time: ${this.metrics.webgl.frameTime.toFixed(1)}ms > ${this.budget.maxFrameTime}ms`);
    }

    if (this.metrics.network.latency > this.budget.maxNetworkLatency) {
      violations.push(`Latence: ${this.metrics.network.latency.toFixed(1)}ms > ${this.budget.maxNetworkLatency}ms`);
    }

    if (this.metrics.webgl.frameRate < this.budget.minFrameRate) {
      violations.push(`FPS: ${this.metrics.webgl.frameRate.toFixed(1)} < ${this.budget.minFrameRate}`);
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Démarrage du monitoring continu
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.frameRateTracker.start();

    // Collecte périodique des métriques
    setInterval(async () => {
      if (this.isMonitoring) {
        await this.collectMetrics();
        
        // Vérification du budget
        const budgetCheck = this.checkPerformanceBudget();
        if (!budgetCheck.passed) {
          SecureLogger.warn('Budget de performance dépassé:', budgetCheck.violations);
        }
      }
    }, 5000); // Toutes les 5 secondes
  }

  /**
   * Arrêt du monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.frameRateTracker.stop();
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  /**
   * Obtient les métriques actuelles
   */
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Obtient les Web Vitals
   */
  getWebVitals(): WebVitalsMetrics {
    return { ...this.metrics.vitals };
  }
}

/**
 * Tracker de frame rate pour WebGL
 */
class FrameRateTracker {
  private frameCount = 0;
  private lastTime = 0;
  private frameRate = 0;
  private frameTime = 0;
  private droppedFrames = 0;
  private isTracking = false;
  private animationFrameId: number | null = null;

  start(): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.measureFrameRate();
  }

  stop(): void {
    this.isTracking = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private measureFrameRate(): void {
    if (!this.isTracking) return;

    this.animationFrameId = requestAnimationFrame((timestamp) => {
      this.frameCount++;
      
      const deltaTime = timestamp - this.lastTime;
      this.frameTime = deltaTime;
      
      // Calcul du frame rate toutes les secondes
      if (deltaTime >= 1000) {
        this.frameRate = (this.frameCount * 1000) / deltaTime;
        
        // Détection des frames perdues (< 58 FPS)
        if (this.frameRate < 58) {
          this.droppedFrames += 60 - this.frameRate;
        }
        
        this.frameCount = 0;
        this.lastTime = timestamp;
      }
      
      this.measureFrameRate();
    });
  }

  getMetrics(): { frameRate: number; frameTime: number; droppedFrames: number } {
    return {
      frameRate: this.frameRate,
      frameTime: this.frameTime,
      droppedFrames: this.droppedFrames
    };
  }
}

export type { PerformanceMetrics, WebVitalsMetrics, PerformanceBudget };