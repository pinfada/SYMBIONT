// optimization/performance-analytics.ts
// Analytics et monitoring avancé des performances avec métriques réelles

import { RealTimePerformanceMonitor, PerformanceBudget } from '../monitoring/RealTimePerformanceMonitor'
import { logger } from '@shared/utils/secureLogger';

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

export class PerformanceAnalytics {
  private metrics: AnalyticsMetric[] = []
  private anomalies: AnomalyDetection[] = []
  private running = false
  private interval: number = 0
  private performanceMonitor: RealTimePerformanceMonitor
  private budget: PerformanceBudget

  constructor() {
    this.performanceMonitor = new RealTimePerformanceMonitor()
    this.budget = {
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      maxCPUUsage: 10, // 10%
      maxFrameTime: 16.67, // 60 FPS
      maxNetworkLatency: 100, // 100ms
      minFrameRate: 58 // FPS
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    
    this.running = true
    this.performanceMonitor.startMonitoring()
    
    // Collecte des métriques toutes les secondes
    this.interval = window.setInterval(async () => {
      await this.collect()
    }, 1000)
    
    logger.info('[PerfAnalytics] Démarrage du monitoring avec métriques réelles')
  }

  stop(): void {
    if (!this.running) return
    
    this.running = false
    this.performanceMonitor.stopMonitoring()
    clearInterval(this.interval)
    
    logger.info('[PerfAnalytics] Arrêt du monitoring')
  }

  private async collect(): Promise<void> {
    try {
      const perfMetrics = await this.performanceMonitor.collectMetrics()
      const webVitals = this.performanceMonitor.getWebVitals()
      
      const metric: AnalyticsMetric = {
        cpu: perfMetrics.cpu.usage,
        memory: perfMetrics.memory.used / (1024 * 1024), // Conversion en MB
        latency: perfMetrics.network.latency,
        fps: perfMetrics.webgl.frameRate,
        frameTime: perfMetrics.webgl.frameTime,
        webVitals: {
          lcp: webVitals.lcp,
          fid: webVitals.fid,
          cls: webVitals.cls,
          fcp: webVitals.fcp,
          ttfb: webVitals.ttfb
        },
        timestamp: Date.now()
      }
      
      this.metrics.push(metric)
      
      // Limite de rétention des métriques (dernières 1000 entrées)
      if (this.metrics.length > 1000) {
        this.metrics.shift()
      }
      
      // Détection d'anomalies
      this.detectAnomalies(metric)
      
      // Vérification du budget de performance
      this.checkPerformanceBudget()
      
    } catch (error) {
      logger.error('[PerfAnalytics] Erreur lors de la collecte:', error)
    }
  }

  private detectAnomalies(metric: AnalyticsMetric): void {
    const timestamp = Date.now()
    
    // Détection CPU élevé
    if (metric.cpu > this.budget.maxCPUUsage * 0.8) { // Warning à 80% du seuil
      this.recordAnomaly({
        type: 'cpu',
        severity: metric.cpu > this.budget.maxCPUUsage ? 'critical' : 'warning',
        value: metric.cpu,
        threshold: this.budget.maxCPUUsage,
        timestamp
      })
    }
    
    // Détection mémoire élevée
    const memoryThresholdMB = this.budget.maxMemoryUsage / (1024 * 1024)
    if (metric.memory > memoryThresholdMB * 0.8) {
      this.recordAnomaly({
        type: 'memory',
        severity: metric.memory > memoryThresholdMB ? 'critical' : 'warning',
        value: metric.memory,
        threshold: memoryThresholdMB,
        timestamp
      })
    }
    
    // Détection latence élevée
    if (metric.latency > this.budget.maxNetworkLatency * 0.8) {
      this.recordAnomaly({
        type: 'latency',
        severity: metric.latency > this.budget.maxNetworkLatency ? 'critical' : 'warning',
        value: metric.latency,
        threshold: this.budget.maxNetworkLatency,
        timestamp
      })
    }
    
    // Détection FPS bas
    if (metric.fps < this.budget.minFrameRate) {
      this.recordAnomaly({
        type: 'fps',
        severity: metric.fps < 45 ? 'critical' : 'warning',
        value: metric.fps,
        threshold: this.budget.minFrameRate,
        timestamp
      })
    }
    
    // Détection frame time élevé
    if (metric.frameTime > this.budget.maxFrameTime) {
      this.recordAnomaly({
        type: 'frameTime',
        severity: metric.frameTime > 33 ? 'critical' : 'warning', // 33ms = 30 FPS
        value: metric.frameTime,
        threshold: this.budget.maxFrameTime,
        timestamp
      })
    }
  }

  private recordAnomaly(anomaly: AnomalyDetection): void {
    this.anomalies.push(anomaly)
    
    // Limite de rétention des anomalies
    if (this.anomalies.length > 100) {
      this.anomalies.shift()
    }
    
    // Log d'alerte
    const message = `[PerfAnalytics] ${anomaly.severity.toUpperCase()}: ${anomaly.type} = ${anomaly.value.toFixed(2)} > ${anomaly.threshold}`
    
    if (anomaly.severity === 'critical') {
      logger.error(message)
    } else {
      logger.warn(message)
    }
  }

  private checkPerformanceBudget(): void {
    const budgetCheck = this.performanceMonitor.checkPerformanceBudget()
    
    if (!budgetCheck.passed) {
      logger.warn('[PerfAnalytics] Budget de performance dépassé:', budgetCheck.violations)
    }
  }

  log(): void {
    console.group('[PerfAnalytics] Métriques récentes')
    console.table(this.metrics.slice(-10)) // 10 dernières métriques
    
    if (this.anomalies.length > 0) {
      console.group('Anomalies détectées')
      console.table(this.anomalies.slice(-5)) // 5 dernières anomalies
      console.groupEnd()
    }
    
    console.groupEnd()
  }

  export(): AnalyticsMetric[] {
    return [...this.metrics]
  }

  exportAnomalies(): AnomalyDetection[] {
    return [...this.anomalies]
  }

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
    webVitals: any;
    budgetStatus: any;
  } {
    if (this.metrics.length === 0) {
      return {
        summary: { avgCPU: 0, avgMemory: 0, avgLatency: 0, avgFPS: 0, anomalyCount: 0 },
        webVitals: {},
        budgetStatus: {}
      }
    }

    const recent = this.metrics.slice(-60) // Dernière minute
    
    return {
      summary: {
        avgCPU: recent.reduce((sum, m) => sum + m.cpu, 0) / recent.length,
        avgMemory: recent.reduce((sum, m) => sum + m.memory, 0) / recent.length,
        avgLatency: recent.reduce((sum, m) => sum + m.latency, 0) / recent.length,
        avgFPS: recent.reduce((sum, m) => sum + m.fps, 0) / recent.length,
        anomalyCount: this.anomalies.filter(a => a.timestamp > Date.now() - 60000).length
      },
      webVitals: recent.length > 0 ? recent[recent.length - 1].webVitals : {},
      budgetStatus: this.performanceMonitor.checkPerformanceBudget()
    }
  }

  /**
   * Réinitialise les métriques et anomalies
   */
  reset(): void {
    this.metrics = []
    this.anomalies = []
    logger.info('[PerfAnalytics] Métriques réinitialisées')
  }
} 