import { SecureRandom } from '@shared/utils/secureRandom';
import { SecureLogger } from '@shared/utils/secureLogger';
// monitoring/predictive-health-monitor.ts
// Monitoring prédictif de la santé (Phase 2)

export class PredictiveHealthMonitor {
  private healthMetrics: { cpu: number[]; memory: number[]; latency: number[]; errors: number } = {
    cpu: [], memory: [], latency: [], errors: 0
  }
  private onAlert: ((msg: string) => void) | null = null
  private modeConservateur = false
  private modeOffline = false

  constructor(onAlert?: (msg: string) => void) {
    if (onAlert) this.onAlert = onAlert
    this.setupContinuousMonitoring()
  }

  // Monitoring prédictif en temps réel
  private setupContinuousMonitoring(): void {
    setInterval(() => {
      this.collectMetrics()
      this.detectAnomalies()
      this.predictIssues()
      this.takePreventiveActions()
    }, 1000) // Chaque seconde
  }

  private collectMetrics(): void {
    // Simule la collecte CPU/mémoire/latence
    const cpu = SecureRandom.random() * 0.2
    const memory = SecureRandom.random() * 20
    const latency = SecureRandom.random() * 5
    this.healthMetrics.cpu.push(cpu)
    this.healthMetrics.memory.push(memory)
    this.healthMetrics.latency.push(latency)
    if (this.healthMetrics.cpu.length > 100) this.healthMetrics.cpu.shift()
    if (this.healthMetrics.memory.length > 100) this.healthMetrics.memory.shift()
    if (this.healthMetrics.latency.length > 100) this.healthMetrics.latency.shift()
  }

  private detectAnomalies(): void {
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1)
    if (avg(this.healthMetrics.cpu) > 0.18) this.alert('CPU élevé (prédictif)')
    if (avg(this.healthMetrics.memory) > 18) this.alert('Mémoire élevée (prédictif)')
    if (avg(this.healthMetrics.latency) > 4) this.alert('Latence élevée (prédictif)')
    if (this.healthMetrics.errors > 0) this.alert('Erreurs détectées (prédictif)')
  }

  private async predictIssues(): Promise<void> {
    // Prédiction simple : si la moyenne CPU/mémoire/latence dépasse un seuil, on prédit un crash ou une dégradation
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1)
    const prediction = {
      crashProbability: avg(this.healthMetrics.cpu) > 0.19 ? 0.8 : 0.2,
      performanceDegradation: avg(this.healthMetrics.latency) > 4.5 ? 0.7 : 0.2,
      memoryIssue: avg(this.healthMetrics.memory) > 19 ? 0.7 : 0.2
    }
    if (prediction.crashProbability > 0.7) {
      this.alert('🚨 Crash imminent prédit')
      this.modeConservateur = true
    }
    if (prediction.performanceDegradation > 0.5) {
      this.alert('⚠️ Dégradation performance prédite')
      this.modeConservateur = true
    }
    if (prediction.memoryIssue > 0.6) {
      this.alert('💾 Problème mémoire prédit')
      this.modeOffline = true
    }
  }

  private async takePreventiveActions(): Promise<void> {
    // Actions préventives simulées
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1)
    if (avg(this.healthMetrics.cpu) > 0.18) {
      this.modeConservateur = true
      this.logAction('Activation du mode conservateur')
    }
    if (avg(this.healthMetrics.memory) > 18) {
      this.modeConservateur = true
      this.logAction('Optimisation mémoire déclenchée')
    }
    if (avg(this.healthMetrics.latency) > 4) {
      this.modeOffline = true
      this.logAction('Passage en mode offline')
    }
  }

  public getCurrentMode(): 'normal' | 'conservateur' | 'offline' {
    if (this.modeOffline) return 'offline'
    if (this.modeConservateur) return 'conservateur'
    return 'normal'
  }

  public logError() {
    this.healthMetrics.errors++
  }

  private alert(msg: string) {
    SecureLogger.warn('🛑 [PredictiveHealthMonitor]', msg)
    if (this.onAlert) this.onAlert(msg)
  }

  private logAction(msg: string) {
    SecureLogger.info('🟢 [Prévention]', msg)
  }
} 