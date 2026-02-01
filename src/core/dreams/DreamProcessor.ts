/**
 * DreamProcessor - Nocturnal Synthesis Engine
 *
 * Performs cross-domain correlation analysis during organism's dream phase
 * to detect hidden surveillance infrastructures through semantic clustering.
 *
 * @module DreamProcessor
 * @version 2.0.0
 */

import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';
import { generateSecureUUID } from '@/shared/utils/uuid';
import { ThermalThrottlingController } from './ThermalThrottlingController';
import { SignatureVectorizer } from './SignatureVectorizer';
import { AdaptiveResonanceClustering, type ClusterOptions } from './AdaptiveResonanceClustering';
import { CDNWhitelist } from './CDNWhitelist';
import { DreamStorage } from './DreamStorage';

export interface MemoryFragment {
  domain: string;
  timestamp: number;
  friction: number;        // DOM jitter metric
  latency: number;         // Network latency
  trackers: string[];      // Detected tracker fingerprints
  hiddenElements: any[];   // Hidden DOM elements
  protocolSignature: string; // HTTP/2, HTTP/3, etc.
  resourceTimings: Array<{
    name: string;
    duration: number;
    nextHopProtocol?: string;
  }>;
}

export interface SurveillanceSignature {
  id: string;
  domains: string[];
  confidence: number;
  infrastructure: {
    cdnPattern?: string;
    trackerFingerprint: string;
    protocolConsistency: number;
  };
  impact: number;
  discoveredAt: number;
  lastSeen: number;
}

export interface DreamReport {
  synthesisId: string;
  startTime: number;
  endTime: number;
  fragmentsAnalyzed: number;
  clustersIdentified: number;
  shadowEntities: SurveillanceSignature[];
  cpuUtilization: number;
  memoryPeak: number;
  thermalEvents: number;
}

export class DreamProcessor {
  private static instance: DreamProcessor;

  private readonly thermalController: ThermalThrottlingController;
  private readonly vectorizer: SignatureVectorizer;
  private readonly clustering: AdaptiveResonanceClustering;
  private readonly cdnWhitelist: CDNWhitelist;
  private readonly storage: DreamStorage;

  private isProcessing = false;
  private currentSynthesisId: string | null = null;
  private abortController: AbortController | null = null;

  // Performance metrics
  private readonly MAX_CPU_UTILIZATION = 0.3; // 30% max during dream
  private readonly MAX_MEMORY_MB = 50; // 50MB max for analysis
  private readonly SYNTHESIS_INTERVAL = 60000; // 1 minute minimum (adapté à la phase dream)

  private lastSynthesisTime = 0;
  private thermalEventCount = 0;

  constructor() {
    this.thermalController = new ThermalThrottlingController();
    this.vectorizer = new SignatureVectorizer();
    this.clustering = new AdaptiveResonanceClustering();
    this.cdnWhitelist = new CDNWhitelist();
    this.storage = new DreamStorage();

    this.initializeMonitoring();
  }

  public static getInstance(): DreamProcessor {
    if (!DreamProcessor.instance) {
      DreamProcessor.instance = new DreamProcessor();
    }
    return DreamProcessor.instance;
  }

  /**
   * Performs nocturnal synthesis of memory fragments
   * Detects cross-domain surveillance patterns through clustering
   */
  public async performNocturnalSynthesis(
    memoryFragments: MemoryFragment[]
  ): Promise<DreamReport> {
    if (this.isProcessing) {
      logger.warn('[DreamProcessor] Synthesis already in progress');
      throw new Error('Synthesis already in progress');
    }

    // Check minimum interval between syntheses
    const timeSinceLastSynthesis = Date.now() - this.lastSynthesisTime;
    if (timeSinceLastSynthesis < this.SYNTHESIS_INTERVAL) {
      logger.info('[DreamProcessor] Too soon for next synthesis', {
        timeSinceLastMs: timeSinceLastSynthesis,
        requiredIntervalMs: this.SYNTHESIS_INTERVAL
      });
      throw new Error('Synthesis interval not met');
    }

    this.isProcessing = true;
    this.currentSynthesisId = generateSecureUUID();
    this.abortController = new AbortController();
    this.thermalEventCount = 0;

    // Register abort controller with thermal controller
    this.thermalController.registerAbortController(this.abortController);

    const startTime = Date.now();
    const report: DreamReport = {
      synthesisId: this.currentSynthesisId,
      startTime,
      endTime: 0,
      fragmentsAnalyzed: 0,
      clustersIdentified: 0,
      shadowEntities: [],
      cpuUtilization: 0,
      memoryPeak: 0,
      thermalEvents: 0
    };

    try {
      logger.info('[DreamProcessor] Beginning nocturnal synthesis');

      // Phase 1: Thermal check and resource allocation
      await this.checkThermalStatus();

      // Phase 2: Filter and validate fragments
      const validFragments = await this.validateFragments(memoryFragments);
      report.fragmentsAnalyzed = validFragments.length;

      // Phase 3: Vectorize domain signatures
      const signatures = await this.vectorizeSignatures(validFragments);

      // Phase 4: Perform adaptive resonance clustering
      const clusters = await this.performClustering(signatures);
      report.clustersIdentified = clusters.length;

      // Phase 5: Identify shadow entities
      const shadowEntities = await this.identifyShadowEntities(clusters);
      report.shadowEntities = shadowEntities;

      // Phase 6: Trigger organism mutations for discoveries
      await this.triggerCognitiveMutations(shadowEntities);

      // Phase 7: Store synthesis results
      await this.storage.storeSynthesisReport(report);

      // Record performance metrics
      report.endTime = Date.now();
      report.cpuUtilization = await this.calculateCPUUtilization();
      report.memoryPeak = await this.getMemoryPeak();
      report.thermalEvents = this.thermalEventCount;

      this.lastSynthesisTime = Date.now();

      logger.info('[DreamProcessor] Synthesis complete');

      return report;

    } catch (error) {
      logger.error('[DreamProcessor] Synthesis failed', error);
      throw error;

    } finally {
      this.isProcessing = false;
      this.currentSynthesisId = null;

      // Unregister abort controller from thermal controller
      this.thermalController.unregisterAbortController();
      this.abortController = null;
    }
  }

  /**
   * Validates and filters memory fragments
   */
  private async validateFragments(
    fragments: MemoryFragment[]
  ): Promise<MemoryFragment[]> {
    const validated: MemoryFragment[] = [];

    for (const fragment of fragments) {
      // Check abort signal
      if (this.abortController?.signal.aborted) {
        throw new Error('Synthesis aborted');
      }

      // Validate required fields
      if (!fragment.domain || !fragment.timestamp) {
        continue;
      }

      // Filter out CDN domains to reduce false positives
      if (this.cdnWhitelist.isCDN(fragment.domain)) {
        logger.debug('[DreamProcessor] Filtering CDN domain', {
          domain: fragment.domain
        });
        continue;
      }

      // Ensure data integrity
      if (fragment.friction < 0 || fragment.latency < 0) {
        logger.warn('[DreamProcessor] Invalid metrics in fragment', {
          domain: fragment.domain,
          friction: fragment.friction,
          latency: fragment.latency
        });
        continue;
      }

      validated.push(fragment);

      // Thermal throttling checkpoint
      if (validated.length % 100 === 0) {
        await this.checkThermalStatus();
      }
    }

    return validated;
  }

  /**
   * Vectorizes domain signatures for clustering
   */
  private async vectorizeSignatures(
    fragments: MemoryFragment[]
  ): Promise<Map<string, Float32Array>> {
    const signatures = new Map<string, Float32Array>();

    for (const fragment of fragments) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Synthesis aborted');
      }

      const vector = await this.vectorizer.createSignatureVector(fragment);
      signatures.set(fragment.domain, vector);
    }

    return signatures;
  }

  /**
   * Performs adaptive resonance clustering
   */
  private async performClustering(
    signatures: Map<string, Float32Array>
  ): Promise<Array<{ domains: string[]; centroid: Float32Array; confidence: number }>> {
    const options: ClusterOptions = {
      vigilance: 0.85, // High similarity threshold
      learningRate: 0.1,
      maxIterations: 100
    };

    // Only add signal if defined
    if (this.abortController?.signal) {
      options.signal = this.abortController.signal;
    }

    return this.clustering.cluster(signatures, options);
  }

  /**
   * Identifies shadow surveillance entities from clusters
   */
  private async identifyShadowEntities(
    clusters: Array<{ domains: string[]; centroid: Float32Array; confidence: number }>
  ): Promise<SurveillanceSignature[]> {
    const shadowEntities: SurveillanceSignature[] = [];

    for (const cluster of clusters) {
      // Skip single-domain clusters
      if (cluster.domains.length < 2) {
        continue;
      }

      // High confidence threshold for shadow entity classification
      if (cluster.confidence < 0.85) {
        continue;
      }

      // Create surveillance signature
      const signature: SurveillanceSignature = {
        id: generateSecureUUID(),
        domains: cluster.domains,
        confidence: cluster.confidence,
        infrastructure: {
          trackerFingerprint: await this.extractTrackerFingerprint(cluster),
          protocolConsistency: await this.calculateProtocolConsistency(cluster)
        },
        impact: this.calculateImpact(cluster),
        discoveredAt: Date.now(),
        lastSeen: Date.now()
      };

      // Additional validation: must have common trackers
      if (!signature.infrastructure.trackerFingerprint) {
        continue;
      }

      shadowEntities.push(signature);

      logger.warn('[DreamProcessor] Shadow entity detected', {
        id: signature.id,
        domains: signature.domains.slice(0, 3), // Log first 3 domains only
        confidence: signature.confidence,
        impact: signature.impact
      });
    }

    return shadowEntities;
  }

  /**
   * Triggers cognitive mutations based on discoveries
   */
  private async triggerCognitiveMutations(
    shadowEntities: SurveillanceSignature[]
  ): Promise<void> {
    for (const entity of shadowEntities) {
      try {
        await chrome.runtime.sendMessage({
          type: 'ORGANISM_MUTATE',
          payload: {
            type: 'cognitive',
            trigger: 'cross_domain_synthesis',
            magnitude: entity.impact,
            traits: {
              intuition: 0.15 * entity.confidence,
              memory: 0.10 * entity.confidence,
              paranoia: 0.05 * entity.impact // New trait for surveillance awareness
            },
            metadata: {
              shadowEntityId: entity.id,
              domainsAffected: entity.domains.length,
              confidence: entity.confidence
            }
          }
        });

        // Murmur discovery notification
        await this.murmurDiscovery(entity);

      } catch (error) {
        logger.error('[DreamProcessor] Failed to trigger mutation', error);
      }
    }
  }

  /**
   * Sends subtle notification about discovery
   */
  private async murmurDiscovery(entity: SurveillanceSignature): Promise<void> {
    await chrome.runtime.sendMessage({
      type: 'DREAM_DISCOVERY',
      payload: {
        id: entity.id,
        level: 'murmur',
        message: `Hidden connection detected across ${entity.domains.length} domains`,
        confidence: entity.confidence,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Monitors thermal status and throttles if needed
   */
  private async checkThermalStatus(): Promise<void> {
    const status = await this.thermalController.getThermalStatus();

    if (status.temperature === 'critical') {
      this.thermalEventCount++;
      logger.warn('[DreamProcessor] Critical thermal state, aborting synthesis');
      this.abortController?.abort();
      throw new Error('Thermal limit exceeded');
    }

    if (status.temperature === 'high') {
      this.thermalEventCount++;
      logger.info('[DreamProcessor] High temperature, throttling synthesis');
      await this.sleep(5000); // 5 second cooldown
    }
  }

  /**
   * Calculates CPU utilization during synthesis
   */
  private async calculateCPUUtilization(): Promise<number> {
    // Use Performance Observer API if available
    if ('PerformanceObserver' in self) {
      try {
        const measures = performance.getEntriesByType('measure')
          .filter(m => m.name.startsWith('dream-synthesis'));

        if (measures.length > 0) {
          const totalDuration = measures.reduce((sum, m) => sum + m.duration, 0);
          const wallTime = Date.now() - (this.lastSynthesisTime || Date.now());
          return Math.min(1, totalDuration / wallTime);
        }
      } catch (error) {
        logger.debug('[DreamProcessor] Could not calculate CPU utilization', error);
      }
    }

    // Fallback: estimate based on processing time
    return 0.25; // Conservative estimate
  }

  /**
   * Gets peak memory usage during synthesis
   */
  private async getMemoryPeak(): Promise<number> {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // Convert to MB
    }
    return 0; // Unable to measure
  }

  /**
   * Extracts common tracker fingerprint from cluster
   */
  private async extractTrackerFingerprint(
    cluster: { domains: string[]; centroid: Float32Array; confidence: number }
  ): Promise<string> {
    // This would analyze common tracking scripts across domains
    // Simplified for now
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(cluster.domains.join('|'))
    );
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16);
  }

  /**
   * Calculates protocol consistency across cluster
   */
  private async calculateProtocolConsistency(
    cluster: { domains: string[]; centroid: Float32Array; confidence: number }
  ): Promise<number> {
    // Analyze if all domains use same protocol patterns
    // Simplified: return confidence as proxy
    return cluster.confidence;
  }

  /**
   * Calculates impact score for shadow entity
   */
  private calculateImpact(
    cluster: { domains: string[]; centroid: Float32Array; confidence: number }
  ): number {
    // Impact based on: number of domains, confidence, and centroid magnitude
    const domainScore = Math.min(1, cluster.domains.length / 10);
    const confidenceScore = cluster.confidence;
    const magnitudeScore = Math.min(1,
      Math.sqrt(cluster.centroid.reduce((sum, v) => sum + v * v, 0)) / 10
    );

    return (domainScore * 0.3 + confidenceScore * 0.5 + magnitudeScore * 0.2);
  }

  /**
   * Sleep utility for thermal throttling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    if ('PerformanceObserver' in self) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' &&
                entry.name.startsWith('dream-synthesis')) {
              logger.debug('[DreamProcessor] Performance measure', {
                name: entry.name,
                duration: entry.duration
              });
            }
          }
        });
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        logger.debug('[DreamProcessor] Could not initialize performance monitoring');
      }
    }
  }

  /**
   * Cleanup and resource disposal
   */
  public dispose(): void {
    this.abortController?.abort();
    this.thermalController.dispose();
    this.storage.dispose();
    this.isProcessing = false;
    this.currentSynthesisId = null;
  }
}