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
  private lastAlerts: Map<string, number> = new Map()
  private alertCooldown = 30000 // 30 secondes de cooldown entre alertes similaires

  constructor(alertCallback?: (msg: string) => void) {
    if (alertCallback) this.alertCallback = alertCallback
    this.setupMonitoring()
  }

  private setupMonitoring(): void {
    setInterval(() => {
      this.collectMetrics()
      this.checkHealth()
    }, 30000) // Toutes les 30 secondes au lieu de 5
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
    
    // Seuils plus élevés pour éviter les fausses alertes
    if (cpuAvg > 0.5) this.alert('CPU élevé : ' + cpuAvg.toFixed(3))
    if (memAvg > 50) this.alert('Mémoire élevée : ' + memAvg.toFixed(2) + 'MB')
    if (latAvg > 10) this.alert('Latence élevée : ' + latAvg.toFixed(2) + 'ms')
    if (this.metrics.errors > 5) this.alert('Erreurs détectées : ' + this.metrics.errors)
  }

  public logError() {
    this.metrics.errors++
  }

  private alert(msg: string) {
    const alertKey = msg.split(':')[0]; // Utilise le type d'alerte comme clé
    const now = Date.now();
    const lastAlert = this.lastAlerts.get(alertKey);
    
    // Vérifie le cooldown
    if (!lastAlert || now - lastAlert > this.alertCooldown) {
      console.warn('🛑 [HealthMonitor]', msg)
      this.lastAlerts.set(alertKey, now);
      if (this.alertCallback) this.alertCallback(msg)
    }
  }
}

// TODO: Exporter/brancher sur le background principal 