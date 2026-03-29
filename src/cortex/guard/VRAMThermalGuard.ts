/**
 * VRAMThermalGuard — Protection des ressources matérielles (F-08)
 *
 * Surveille en continu les ressources (CPU, mémoire, frame rate, backpressure)
 * et délivre les budgets d'exécution pour les analyses cognitives.
 */

import { ResourceBudget, ThermalState } from '../CortexTypes';

const CACHE_DURATION_MS = 2000;
const DEEP_BUDGET_DEFAULT_MS = 3000;
const DEEP_BUDGET_WARM_MS = 1500;
const MIN_FRAME_RATE_FOR_DEEP = 20;

interface MetricsProvider {
  getCPUUsage(): Promise<number>;
  getMemoryUsage(): Promise<number>;
}

interface BackpressureProvider {
  getLevel(): string;
}

export class VRAMThermalGuard {
  private metricsProvider: MetricsProvider;
  private backpressure: BackpressureProvider;
  private lastBudget: ResourceBudget | null = null;
  private lastMeasureTime = 0;
  private currentFrameRate = 60;
  private frameRafId: number | null = null;
  private lastFrameTime = 0;
  private frameSamples: number[] = [];

  constructor(
    metricsProvider: MetricsProvider,
    backpressure: BackpressureProvider,
  ) {
    this.metricsProvider = metricsProvider;
    this.backpressure = backpressure;
    this.startFrameRateMonitoring();
  }

  checkBudget(): ResourceBudget {
    const now = Date.now();

    // Utiliser le cache si les données sont récentes
    if (this.lastBudget && now - this.lastMeasureTime < CACHE_DURATION_MS) {
      return this.lastBudget;
    }

    // Mesure synchrone rapide (les mesures async sont faites en background)
    const bpLevel = this.backpressure.getLevel();
    const thermalState = this.computeThermalStateSync(bpLevel);

    const budget: ResourceBudget = {
      available: thermalState !== 'critical',
      vramEstimatePercent: 0, // Pas d'accès direct VRAM dans le navigateur
      cpuLoadPercent: this.lastCpuLoad,
      memoryPressure: this.lastMemoryPressure,
      thermalState,
      backpressureLevel: bpLevel,
      maxAllowedDurationMs: thermalState === 'warm' ? DEEP_BUDGET_WARM_MS : DEEP_BUDGET_DEFAULT_MS,
      frameRate: this.currentFrameRate,
    };

    this.lastBudget = budget;
    this.lastMeasureTime = now;

    // Lancer une mise à jour async des métriques pour le prochain appel
    this.refreshMetricsAsync();

    return budget;
  }

  requestDeepBudget(): ResourceBudget {
    const budget = this.checkBudget();

    if (budget.thermalState === 'critical' || budget.thermalState === 'hot') {
      return {
        ...budget,
        available: false,
        reason: 'thermal_pressure_too_high',
      };
    }

    if (
      budget.backpressureLevel === 'critical' ||
      budget.backpressureLevel === 'emergency'
    ) {
      return {
        ...budget,
        available: false,
        reason: 'backpressure_critical',
      };
    }

    if (budget.frameRate < MIN_FRAME_RATE_FOR_DEEP) {
      return {
        ...budget,
        available: false,
        reason: 'frame_rate_too_low',
      };
    }

    const maxDuration =
      budget.thermalState === 'warm' ? DEEP_BUDGET_WARM_MS : DEEP_BUDGET_DEFAULT_MS;

    return {
      ...budget,
      available: true,
      maxAllowedDurationMs: maxDuration,
    };
  }

  getSystemLoad(): number {
    // Charge système agrégée 0-1
    const cpuFactor = this.lastCpuLoad / 100;
    const memFactor = this.lastMemoryPressure;
    const fpsFactor = Math.max(0, (60 - this.currentFrameRate) / 60);

    return Math.min(1, cpuFactor * 0.4 + memFactor * 0.35 + fpsFactor * 0.25);
  }

  getThermalPressure(): number {
    const state = this.getThermalState();
    switch (state) {
      case 'nominal':
        return 0.1;
      case 'warm':
        return 0.4;
      case 'hot':
        return 0.7;
      case 'critical':
        return 1.0;
    }
  }

  getThermalState(): ThermalState {
    return this.computeThermalStateSync(this.backpressure.getLevel());
  }

  notifyResourceFreed(): void {
    // Invalider le cache pour forcer une re-mesure
    this.lastMeasureTime = 0;
    this.lastBudget = null;
  }

  destroy(): void {
    if (this.frameRafId !== null) {
      cancelAnimationFrame(this.frameRafId);
      this.frameRafId = null;
    }
  }

  // ─── Internal ─────────────────────────────────────────────────────

  private lastCpuLoad = 0;
  private lastMemoryPressure = 0;

  private computeThermalStateSync(bpLevel: string): ThermalState {
    const bpScore = this.bpLevelToScore(bpLevel);
    const cpuScore = this.lastCpuLoad / 100;
    const memScore = this.lastMemoryPressure;
    const fpsScore = Math.max(0, (60 - Math.min(60, this.currentFrameRate)) / 60);

    const thermalScore =
      cpuScore * 0.35 + memScore * 0.30 + fpsScore * 0.20 + bpScore * 0.15;

    if (thermalScore < 0.40) return 'nominal';
    if (thermalScore < 0.60) return 'warm';
    if (thermalScore < 0.80) return 'hot';
    return 'critical';
  }

  private bpLevelToScore(level: string): number {
    switch (level) {
      case 'nominal':
        return 0;
      case 'elevated':
        return 0.4;
      case 'critical':
        return 0.7;
      case 'emergency':
        return 1.0;
      default:
        return 0;
    }
  }

  private async refreshMetricsAsync(): Promise<void> {
    try {
      const [cpu, memory] = await Promise.all([
        this.metricsProvider.getCPUUsage(),
        this.metricsProvider.getMemoryUsage(),
      ]);
      this.lastCpuLoad = cpu;
      this.lastMemoryPressure = memory / 100;
    } catch {
      // Silencieux — les anciennes valeurs restent valides
    }
  }

  private startFrameRateMonitoring(): void {
    if (typeof requestAnimationFrame === 'undefined') return;

    const measure = (timestamp: number) => {
      if (this.lastFrameTime > 0) {
        const delta = timestamp - this.lastFrameTime;
        if (delta > 0) {
          this.frameSamples.push(1000 / delta);
          if (this.frameSamples.length > 30) {
            this.frameSamples.shift();
          }
          this.currentFrameRate =
            this.frameSamples.reduce((s, v) => s + v, 0) /
            this.frameSamples.length;
        }
      }
      this.lastFrameTime = timestamp;
      this.frameRafId = requestAnimationFrame(measure);
    };

    this.frameRafId = requestAnimationFrame(measure);
  }
}
