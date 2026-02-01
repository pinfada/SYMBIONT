/**
 * ThermalThrottlingController - CPU Temperature Management
 *
 * Monitors system thermal state and throttles processing to prevent
 * overheating during intensive dream phase computations.
 *
 * @module ThermalThrottlingController
 */

import { logger } from '@/shared/utils/secureLogger';

export type ThermalState = 'nominal' | 'fair' | 'high' | 'critical';

export interface ThermalStatus {
  temperature: ThermalState;
  cpuUtilization: number;
  throttlingActive: boolean;
  coolingDelay: number; // Milliseconds to wait
  timestamp: number;
}

/**
 * Advanced thermal management using multiple heuristics
 */
export class ThermalThrottlingController {
  // Thermal thresholds
  private readonly CPU_THRESHOLD_FAIR = 0.4;    // 40% CPU
  private readonly CPU_THRESHOLD_HIGH = 0.6;    // 60% CPU
  private readonly CPU_THRESHOLD_CRITICAL = 0.8; // 80% CPU

  // Memory thresholds (MB)
  private readonly MEMORY_THRESHOLD_FAIR = 100;
  private readonly MEMORY_THRESHOLD_HIGH = 200;
  private readonly MEMORY_THRESHOLD_CRITICAL = 300;

  // Timing thresholds
  private readonly TASK_DURATION_THRESHOLD = 100; // ms per task
  private readonly COOLING_PERIOD_BASE = 1000;    // Base cooling period ms

  // State tracking
  private currentState: ThermalState = 'nominal';
  private cpuMeasurements: number[] = [];
  private memoryMeasurements: number[] = [];
  private lastMeasurement = 0;
  private throttlingActive = false;
  private performanceObserver: PerformanceObserver | null = null;

  // Abort support for critical thermal events
  private abortController: AbortController | null = null;

  // Cooling strategy
  private coolingMultiplier = 1;
  private consecutiveHighReadings = 0;

  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Gets current thermal status with recommendations
   */
  public async getThermalStatus(): Promise<ThermalStatus> {
    const now = Date.now();

    // Throttle measurements (max once per 100ms)
    if (now - this.lastMeasurement < 100) {
      return this.getCachedStatus();
    }

    this.lastMeasurement = now;

    // Collect metrics
    const cpuUtilization = await this.measureCPUUtilization();
    const memoryUsage = await this.measureMemoryUsage();
    const taskLatency = this.measureTaskLatency();

    // Update measurements history
    this.cpuMeasurements.push(cpuUtilization);
    this.memoryMeasurements.push(memoryUsage);

    // Keep only recent measurements (last 10)
    if (this.cpuMeasurements.length > 10) {
      this.cpuMeasurements.shift();
    }
    if (this.memoryMeasurements.length > 10) {
      this.memoryMeasurements.shift();
    }

    // Calculate thermal state
    this.currentState = this.calculateThermalState(
      cpuUtilization,
      memoryUsage,
      taskLatency
    );

    // Update throttling strategy
    this.updateThrottlingStrategy();

    const status: ThermalStatus = {
      temperature: this.currentState,
      cpuUtilization,
      throttlingActive: this.throttlingActive,
      coolingDelay: this.calculateCoolingDelay(),
      timestamp: now
    };

    // Log significant state changes
    if (this.currentState === 'high' || this.currentState === 'critical') {
      logger.warn('[ThermalController] Elevated thermal state detected', {
        state: this.currentState,
        cpu: cpuUtilization,
        memory: memoryUsage,
        throttling: this.throttlingActive
      });
    }

    return status;
  }

  /**
   * Measures current CPU utilization
   */
  private async measureCPUUtilization(): Promise<number> {
    // Method 1: Use Performance API task timing
    if ('PerformanceObserver' in self) {
      try {
        const measures = performance.getEntriesByType('measure')
          .filter(m => m.startTime > performance.now() - 1000); // Last second

        if (measures.length > 0) {
          const totalDuration = measures.reduce((sum, m) => sum + m.duration, 0);
          return Math.min(1, totalDuration / 1000); // Duration / time window
        }
      } catch (error) {
        logger.debug('[ThermalController] Could not measure via Performance API');
      }
    }

    // Method 2: Use requestIdleCallback deadline
    if ('requestIdleCallback' in self) {
      return new Promise<number>((resolve) => {
        requestIdleCallback((deadline) => {
          const idleTime = deadline.timeRemaining();
          const utilization = 1 - (idleTime / 50); // 50ms frame budget
          resolve(Math.max(0, Math.min(1, utilization)));
        });
      });
    }

    // Method 3: Heuristic based on event loop lag
    return this.measureEventLoopUtilization();
  }

  /**
   * Measures event loop utilization as CPU proxy
   */
  private async measureEventLoopUtilization(): Promise<number> {
    const iterations = 5;
    const delays: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 0);
      });

      const delay = performance.now() - start;
      delays.push(delay);
    }

    // Higher delays indicate higher CPU usage
    const avgDelay = delays.reduce((sum, d) => sum + d, 0) / delays.length;

    // Normalize: 0ms = 0% CPU, 50ms+ = 100% CPU
    return Math.min(1, avgDelay / 50);
  }

  /**
   * Measures current memory usage
   */
  private async measureMemoryUsage(): Promise<number> {
    // Use Memory API if available (Chrome only)
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      return Math.round(usedMB);
    }

    // Fallback: estimate based on object count
    return this.estimateMemoryUsage();
  }

  /**
   * Estimates memory usage via object counting
   */
  private estimateMemoryUsage(): number {
    try {
      // Count global objects as rough proxy
      const globalKeys = Object.keys(globalThis).length;
      // Rough estimate: each key ~1KB average
      return Math.min(500, globalKeys * 0.001 * 1024);
    } catch {
      return 50; // Conservative estimate
    }
  }

  /**
   * Measures average task latency
   */
  private measureTaskLatency(): number {
    const recentMeasures = performance.getEntriesByType('measure')
      .filter(m => m.startTime > performance.now() - 5000) // Last 5 seconds
      .slice(-10); // Last 10 measures

    if (recentMeasures.length === 0) {
      return 0;
    }

    const avgDuration = recentMeasures.reduce((sum, m) => sum + m.duration, 0) /
                       recentMeasures.length;

    return avgDuration;
  }

  /**
   * Calculates thermal state from metrics
   */
  private calculateThermalState(
    cpu: number,
    memoryMB: number,
    taskLatency: number
  ): ThermalState {
    // Critical state checks (any condition triggers)
    if (cpu >= this.CPU_THRESHOLD_CRITICAL ||
        memoryMB >= this.MEMORY_THRESHOLD_CRITICAL ||
        taskLatency > this.TASK_DURATION_THRESHOLD * 3) {
      return 'critical';
    }

    // High state checks
    if (cpu >= this.CPU_THRESHOLD_HIGH ||
        memoryMB >= this.MEMORY_THRESHOLD_HIGH ||
        taskLatency > this.TASK_DURATION_THRESHOLD * 2) {
      return 'high';
    }

    // Fair state checks
    if (cpu >= this.CPU_THRESHOLD_FAIR ||
        memoryMB >= this.MEMORY_THRESHOLD_FAIR ||
        taskLatency > this.TASK_DURATION_THRESHOLD) {
      return 'fair';
    }

    return 'nominal';
  }

  /**
   * Updates throttling strategy based on thermal trends
   */
  private updateThrottlingStrategy(): void {
    const previouslyThrottled = this.throttlingActive;

    switch (this.currentState) {
      case 'critical':
        this.throttlingActive = true;
        this.coolingMultiplier = 4; // 4x cooling period
        this.consecutiveHighReadings++;
        break;

      case 'high':
        this.throttlingActive = true;
        this.coolingMultiplier = 2; // 2x cooling period
        this.consecutiveHighReadings++;
        break;

      case 'fair':
        this.throttlingActive = false;
        this.coolingMultiplier = 1.5; // 1.5x cooling period
        this.consecutiveHighReadings = Math.max(0, this.consecutiveHighReadings - 1);
        break;

      case 'nominal':
        this.throttlingActive = false;
        this.coolingMultiplier = 1; // Normal operation
        this.consecutiveHighReadings = 0;
        break;
    }

    // Log state transitions
    if (this.throttlingActive !== previouslyThrottled) {
      logger.info('[ThermalController] Throttling state changed', {
        active: this.throttlingActive,
        state: this.currentState,
        coolingMultiplier: this.coolingMultiplier
      });
    }

    // Emergency brake: if too many consecutive high readings
    if (this.consecutiveHighReadings > 10) {
      logger.error('[ThermalController] Emergency thermal shutdown triggered');
      this.coolingMultiplier = 10; // Maximum cooling
      this.throttlingActive = true;

      // Trigger abort for critical thermal events
      if (this.abortController) {
        this.abortController.abort('Critical thermal state - emergency shutdown');
      }
    }
  }

  /**
   * Calculates cooling delay based on current state
   */
  private calculateCoolingDelay(): number {
    if (!this.throttlingActive) {
      return 0;
    }

    // Progressive cooling based on thermal state
    let baseDelay = this.COOLING_PERIOD_BASE;

    // Add jitter to prevent synchronization
    const jitter = SecureRandom.random() * 200 - 100; // ±100ms

    return Math.round(baseDelay * this.coolingMultiplier + jitter);
  }

  /**
   * Returns cached status for rapid queries
   */
  private getCachedStatus(): ThermalStatus {
    return {
      temperature: this.currentState,
      cpuUtilization: this.cpuMeasurements[this.cpuMeasurements.length - 1] || 0,
      throttlingActive: this.throttlingActive,
      coolingDelay: this.calculateCoolingDelay(),
      timestamp: this.lastMeasurement
    };
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    if ('PerformanceObserver' in self) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          // Track long tasks for thermal monitoring
          for (const entry of list.getEntries()) {
            if (entry.duration > this.TASK_DURATION_THRESHOLD) {
              logger.debug('[ThermalController] Long task detected', {
                name: entry.name,
                duration: entry.duration
              });
            }
          }
        });

        // Observe measures and marks
        this.performanceObserver.observe({
          entryTypes: ['measure', 'mark']
        });

      } catch (error) {
        logger.debug('[ThermalController] Could not initialize PerformanceObserver');
      }
    }
  }

  /**
   * Apply cooling delay if needed
   */
  public async applyCooling(): Promise<void> {
    const status = await this.getThermalStatus();

    if (status.coolingDelay > 0) {
      logger.debug('[ThermalController] Applying cooling delay', {
        delay: status.coolingDelay,
        state: status.temperature
      });

      await new Promise(resolve => setTimeout(resolve, status.coolingDelay));
    }
  }

  /**
   * Get thermal statistics
   */
  public getStatistics(): {
    currentState: ThermalState;
    avgCPU: number;
    avgMemory: number;
    throttlingActive: boolean;
    highReadings: number;
  } {
    const avgCPU = this.cpuMeasurements.length > 0 ?
      this.cpuMeasurements.reduce((sum, v) => sum + v, 0) / this.cpuMeasurements.length : 0;

    const avgMemory = this.memoryMeasurements.length > 0 ?
      this.memoryMeasurements.reduce((sum, v) => sum + v, 0) / this.memoryMeasurements.length : 0;

    return {
      currentState: this.currentState,
      avgCPU,
      avgMemory,
      throttlingActive: this.throttlingActive,
      highReadings: this.consecutiveHighReadings
    };
  }

  /**
   * Register an abort controller for critical thermal events
   */
  public registerAbortController(controller: AbortController): void {
    this.abortController = controller;
    logger.debug('[ThermalController] Abort controller registered');
  }

  /**
   * Unregister the abort controller
   */
  public unregisterAbortController(): void {
    this.abortController = null;
    logger.debug('[ThermalController] Abort controller unregistered');
  }

  /**
   * Check if system should abort due to thermal state
   */
  public shouldAbort(): boolean {
    return this.currentState === 'critical' && this.consecutiveHighReadings > 5;
  }

  /**
   * Cleanup and disposal
   */
  public dispose(): void {
    this.performanceObserver?.disconnect();
    this.performanceObserver = null;
    this.cpuMeasurements = [];
    this.memoryMeasurements = [];
    this.abortController = null;
  }
}

// Import SecureRandom for jitter
import { SecureRandom } from '@/shared/utils/secureRandom';