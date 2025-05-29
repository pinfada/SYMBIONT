// monitoring/basic-health-monitor.ts
// Monitoring basique de la santé du système (Phase 1)

export class BasicHealthMonitor {
  private metrics: any = {
    cpu: [],
    memory: [],
    latency: [],
    errors: 0
  }
  private alertCallback: ((msg: string) => void) | null = null

  constructor(alertCallback?: (msg: string) => void) {
    if (alertCallback) this.alertCallback = alertCallback
    this.setupMonitoring()
  }

  private setupMonitoring(): void {
    setInterval(() => {
      this.collectMetrics()
      this.checkHealth()
    }, 5000) // Toutes les 5 secondes
  }

  private collectMetrics(): void {
    // Simule la collecte CPU/mémoire/latence
    const cpu = Math.random() * 0.2
    const memory = Math.random() * 20
    const latency = Math.random() * 5
    this.metrics.cpu.push(cpu)
    this.metrics.memory.push(memory)
    this.metrics.latency.push(latency)
    if (this.metrics.cpu.length > 20) this.metrics.cpu.shift()
    if (this.metrics.memory.length > 20) this.metrics.memory.shift()
    if (this.metrics.latency.length > 20) this.metrics.latency.shift()
  }

  private checkHealth(): void {
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1)
    const cpuAvg = avg(this.metrics.cpu)
    const memAvg = avg(this.metrics.memory)
    const latAvg = avg(this.metrics.latency)
    if (cpuAvg > 0.18) this.alert('CPU élevé : ' + cpuAvg.toFixed(3))
    if (memAvg > 18) this.alert('Mémoire élevée : ' + memAvg.toFixed(2) + 'MB')
    if (latAvg > 4) this.alert('Latence élevée : ' + latAvg.toFixed(2) + 'ms')
    if (this.metrics.errors > 0) this.alert('Erreurs détectées : ' + this.metrics.errors)
  }

  public logError() {
    this.metrics.errors++
  }

  private alert(msg: string) {
    console.warn('🛑 [HealthMonitor]', msg)
    if (this.alertCallback) this.alertCallback(msg)
  }
}

// TODO: Exporter/brancher sur le background principal 