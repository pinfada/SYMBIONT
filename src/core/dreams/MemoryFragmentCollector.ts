/**
 * MemoryFragmentCollector - Cross-Domain Memory Collection System
 *
 * Collects and aggregates memory fragments from various DOM observers
 * and network monitors for cross-domain analysis during dream phase.
 *
 * @module MemoryFragmentCollector
 */

import { logger } from '@/shared/utils/secureLogger';
import { generateSecureUUID } from '@/shared/utils/uuid';
import { DreamStorage } from './DreamStorage';
import type { MemoryFragment } from './DreamProcessor';

interface FragmentSource {
  domain: string;
  timestamp: number;
  data: any;
  type: 'dom_resonance' | 'network_latency' | 'tracker_detection' | 'protocol_analysis';
}

/**
 * Singleton collector for memory fragments across the extension
 */
export class MemoryFragmentCollector {
  private static instance: MemoryFragmentCollector;

  private fragments: Map<string, MemoryFragment> = new Map();
  private storage: DreamStorage;
  private collectionStartTime: number = Date.now();

  // Limits
  private readonly MAX_FRAGMENTS_IN_MEMORY = 1000;
  private readonly MAX_FRAGMENT_AGE = 3600000; // 1 hour
  private readonly BATCH_PERSIST_SIZE = 100;

  // Metrics
  private totalCollected = 0;
  private totalProcessed = 0;
  private domainStats = new Map<string, number>();

  constructor() {
    this.storage = new DreamStorage();
    this.startPeriodicCleanup();
  }

  public static getInstance(): MemoryFragmentCollector {
    if (!MemoryFragmentCollector.instance) {
      MemoryFragmentCollector.instance = new MemoryFragmentCollector();
    }
    return MemoryFragmentCollector.instance;
  }

  /**
   * Collects a DOM resonance event as a memory fragment
   */
  public collectDOMResonance(data: {
    domain: string;
    friction: number;
    mutations: Array<{ type: string; target: string }>;
    hiddenElements: any[];
    timestamps: { detected: number; emitted: number };
  }): void {
    const fragment: MemoryFragment = {
      domain: data.domain,
      timestamp: data.timestamps.detected,
      friction: data.friction,
      latency: data.timestamps.emitted - data.timestamps.detected,
      trackers: this.extractTrackersFromMutations(data.mutations),
      hiddenElements: data.hiddenElements,
      protocolSignature: 'unknown',
      resourceTimings: []
    };

    this.addFragment(fragment);
  }

  /**
   * Collects network latency measurements as a memory fragment
   */
  public collectNetworkLatency(data: {
    domain: string;
    latency: number;
    protocol: string;
    resourceTimings: Array<{ name: string; duration: number; nextHopProtocol?: string }>;
    udpTrackers?: string[];
  }): void {
    const existingFragment = this.getFragmentForDomain(data.domain);

    if (existingFragment) {
      // Update existing fragment with network data
      existingFragment.latency = data.latency;
      existingFragment.protocolSignature = data.protocol;
      existingFragment.resourceTimings = data.resourceTimings;

      if (data.udpTrackers) {
        existingFragment.trackers = [
          ...new Set([...existingFragment.trackers, ...data.udpTrackers])
        ];
      }
    } else {
      // Create new fragment
      const fragment: MemoryFragment = {
        domain: data.domain,
        timestamp: Date.now(),
        friction: 0,
        latency: data.latency,
        trackers: data.udpTrackers || [],
        hiddenElements: [],
        protocolSignature: data.protocol,
        resourceTimings: data.resourceTimings
      };

      this.addFragment(fragment);
    }
  }

  /**
   * Collects tracker detection events
   */
  public collectTrackerDetection(data: {
    domain: string;
    trackers: string[];
    fingerprints: string[];
  }): void {
    const existingFragment = this.getFragmentForDomain(data.domain);

    if (existingFragment) {
      // Merge tracker information
      const allTrackers = new Set([
        ...existingFragment.trackers,
        ...data.trackers,
        ...data.fingerprints
      ]);
      existingFragment.trackers = Array.from(allTrackers);
    } else {
      // Create minimal fragment with tracker info
      const fragment: MemoryFragment = {
        domain: data.domain,
        timestamp: Date.now(),
        friction: 0,
        latency: 0,
        trackers: [...data.trackers, ...data.fingerprints],
        hiddenElements: [],
        protocolSignature: 'unknown',
        resourceTimings: []
      };

      this.addFragment(fragment);
    }
  }

  /**
   * Adds a fragment to the collection
   */
  private addFragment(fragment: MemoryFragment): void {
    const key = `${fragment.domain}_${fragment.timestamp}`;

    // Check memory limits
    if (this.fragments.size >= this.MAX_FRAGMENTS_IN_MEMORY) {
      this.evictOldestFragments();
    }

    this.fragments.set(key, fragment);
    this.totalCollected++;

    // Update domain statistics
    const count = this.domainStats.get(fragment.domain) || 0;
    this.domainStats.set(fragment.domain, count + 1);

    logger.debug('[FragmentCollector] Fragment added', {
      domain: fragment.domain,
      totalFragments: this.fragments.size,
      friction: fragment.friction,
      latency: fragment.latency,
      trackers: fragment.trackers.length
    });

    // Persist to storage in batches
    if (this.fragments.size % this.BATCH_PERSIST_SIZE === 0) {
      this.persistFragmentBatch();
    }
  }

  /**
   * Gets existing fragment for a domain (within time window)
   */
  private getFragmentForDomain(domain: string): MemoryFragment | null {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute window for aggregation

    for (const [key, fragment] of this.fragments) {
      if (fragment.domain === domain &&
          now - fragment.timestamp < timeWindow) {
        return fragment;
      }
    }

    return null;
  }

  /**
   * Extracts tracker signatures from DOM mutations
   */
  private extractTrackersFromMutations(
    mutations: Array<{ type: string; target: string }>
  ): string[] {
    const trackers: string[] = [];

    for (const mutation of mutations) {
      // Look for known tracker patterns
      if (mutation.target.includes('analytics') ||
          mutation.target.includes('tracking') ||
          mutation.target.includes('gtag') ||
          mutation.target.includes('pixel')) {
        trackers.push(mutation.target);
      }
    }

    return trackers;
  }

  /**
   * Retrieves recent fragments for analysis
   */
  public async getRecentFragments(limit = 500): Promise<MemoryFragment[]> {
    const now = Date.now();
    const fragments: MemoryFragment[] = [];

    // Get from memory first
    for (const [key, fragment] of this.fragments) {
      if (now - fragment.timestamp < this.MAX_FRAGMENT_AGE) {
        fragments.push(fragment);
        if (fragments.length >= limit) break;
      }
    }

    // If not enough, load from storage
    if (fragments.length < limit) {
      try {
        const storedFragments = await this.storage.getFragmentsForDomain(
          '', // All domains
          limit - fragments.length
        );
        fragments.push(...storedFragments);
      } catch (error) {
        logger.error('[FragmentCollector] Failed to load fragments from storage', error);
      }
    }

    logger.info('[FragmentCollector] Retrieved fragments', {
      count: fragments.length,
      fromMemory: this.fragments.size,
      uniqueDomains: new Set(fragments.map(f => f.domain)).size
    });

    return fragments;
  }

  /**
   * Clears processed fragments
   */
  public async clearProcessedFragments(
    fragments: MemoryFragment[]
  ): Promise<void> {
    const keysToRemove: string[] = [];

    for (const fragment of fragments) {
      const key = `${fragment.domain}_${fragment.timestamp}`;
      if (this.fragments.has(key)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.fragments.delete(key);
    }

    this.totalProcessed += keysToRemove.length;

    logger.info('[FragmentCollector] Cleared processed fragments', {
      cleared: keysToRemove.length,
      remaining: this.fragments.size,
      totalProcessed: this.totalProcessed
    });
  }

  /**
   * Evicts oldest fragments when memory limit reached
   */
  private evictOldestFragments(): void {
    const toEvict = Math.floor(this.fragments.size * 0.2); // Evict 20%
    const sortedKeys = Array.from(this.fragments.keys()).sort((a, b) => {
      const fragmentA = this.fragments.get(a)!;
      const fragmentB = this.fragments.get(b)!;
      return fragmentA.timestamp - fragmentB.timestamp;
    });

    for (let i = 0; i < toEvict && i < sortedKeys.length; i++) {
      this.fragments.delete(sortedKeys[i]);
    }

    logger.debug('[FragmentCollector] Evicted old fragments', {
      evicted: toEvict,
      remaining: this.fragments.size
    });
  }

  /**
   * Persists fragment batch to storage
   */
  private async persistFragmentBatch(): Promise<void> {
    const fragmentsToStore = Array.from(this.fragments.values())
      .slice(0, this.BATCH_PERSIST_SIZE);

    if (fragmentsToStore.length === 0) return;

    try {
      await this.storage.storeFragments(fragmentsToStore);
      logger.debug('[FragmentCollector] Persisted fragment batch', {
        count: fragmentsToStore.length
      });
    } catch (error) {
      logger.error('[FragmentCollector] Failed to persist fragments', error);
    }
  }

  /**
   * Starts periodic cleanup of old fragments
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldFragments();
    }, 300000); // Every 5 minutes
  }

  /**
   * Removes old fragments from memory
   */
  private cleanupOldFragments(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const [key, fragment] of this.fragments) {
      if (now - fragment.timestamp > this.MAX_FRAGMENT_AGE) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.fragments.delete(key);
    }

    if (keysToRemove.length > 0) {
      logger.info('[FragmentCollector] Cleaned old fragments', {
        removed: keysToRemove.length,
        remaining: this.fragments.size
      });
    }
  }

  /**
   * Gets collector statistics
   */
  public getStatistics(): {
    fragmentsInMemory: number;
    totalCollected: number;
    totalProcessed: number;
    uniqueDomains: number;
    topDomains: Array<{ domain: string; count: number }>;
    memoryUsageBytes: number;
  } {
    // Estimate memory usage (rough)
    const avgFragmentSize = 500; // bytes estimate
    const memoryUsageBytes = this.fragments.size * avgFragmentSize;

    // Get top domains
    const topDomains = Array.from(this.domainStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    return {
      fragmentsInMemory: this.fragments.size,
      totalCollected: this.totalCollected,
      totalProcessed: this.totalProcessed,
      uniqueDomains: this.domainStats.size,
      topDomains,
      memoryUsageBytes
    };
  }

  /**
   * Resets the collector (for testing)
   */
  public reset(): void {
    this.fragments.clear();
    this.domainStats.clear();
    this.totalCollected = 0;
    this.totalProcessed = 0;
    this.collectionStartTime = Date.now();

    logger.info('[FragmentCollector] Reset complete');
  }

  /**
   * Exports current fragments for analysis
   */
  public exportFragments(): MemoryFragment[] {
    return Array.from(this.fragments.values());
  }

  /**
   * Imports fragments (for testing)
   */
  public importFragments(fragments: MemoryFragment[]): void {
    for (const fragment of fragments) {
      this.addFragment(fragment);
    }
  }
}