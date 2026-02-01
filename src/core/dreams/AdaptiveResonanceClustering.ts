/**
 * AdaptiveResonanceClustering - ART-inspired Clustering Algorithm
 *
 * Implements Adaptive Resonance Theory (ART) for unsupervised clustering
 * of cross-domain signatures. Detects hidden surveillance infrastructures
 * through pattern resonance.
 *
 * @module AdaptiveResonanceClustering
 */

import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';

export interface ClusterOptions {
  vigilance: number;           // Similarity threshold (0-1)
  learningRate: number;        // Adaptation rate (0-1)
  maxIterations: number;       // Maximum iterations
  signal?: AbortSignal;        // Abort signal for cancellation
}

export interface Cluster {
  id: string;
  domains: string[];
  centroid: Float32Array;
  confidence: number;
  resonanceScore: number;
  lastUpdated: number;
}

/**
 * Adaptive Resonance Theory based clustering
 * Inspired by biological neural networks
 */
export class AdaptiveResonanceClustering {
  private clusters: Map<string, Cluster> = new Map();
  private readonly MIN_CLUSTER_SIZE = 2;
  private readonly MAX_CLUSTERS = 100;

  // Performance metrics
  private iterationCount = 0;
  private resonanceEvents = 0;

  /**
   * Performs adaptive resonance clustering on signature vectors
   */
  public async cluster(
    signatures: Map<string, Float32Array>,
    options: ClusterOptions
  ): Promise<Array<{ domains: string[]; centroid: Float32Array; confidence: number }>> {
    this.resetState();

    const {
      vigilance = 0.85,
      learningRate = 0.1,
      maxIterations = 100,
      signal
    } = options;

    logger.info('[ARC] Starting adaptive resonance clustering', {
      signatureCount: signatures.size,
      vigilance,
      learningRate,
      maxIterations
    });

    // Convert signatures to array for processing
    const domains = Array.from(signatures.keys());
    const vectors = Array.from(signatures.values());

    // Initialize with first signature as seed cluster
    if (vectors.length > 0) {
      this.createCluster(domains[0], vectors[0]);
    }

    // Main clustering loop
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      this.iterationCount = iteration;

      // Check abort signal
      if (signal?.aborted) {
        logger.info('[ARC] Clustering aborted by signal');
        break;
      }

      let changed = false;

      // Process each signature
      for (let i = 0; i < domains.length; i++) {
        const domain = domains[i];
        const vector = vectors[i];

        // Find best matching cluster (winner-take-all)
        const bestMatch = this.findBestMatch(vector, vigilance);

        if (bestMatch) {
          // Resonance: Update existing cluster
          if (this.updateCluster(bestMatch, domain, vector, learningRate)) {
            changed = true;
            this.resonanceEvents++;
          }
        } else {
          // No resonance: Create new cluster if under limit
          if (this.clusters.size < this.MAX_CLUSTERS) {
            this.createCluster(domain, vector);
            changed = true;
          }
        }
      }

      // Convergence check
      if (!changed) {
        logger.info('[ARC] Clustering converged', {
          iteration,
          clusterCount: this.clusters.size
        });
        break;
      }

      // Periodic pruning of weak clusters
      if (iteration % 10 === 0) {
        this.pruneWeakClusters();
      }
    }

    // Final cluster refinement
    this.refineClusterst(vigilance);

    // Convert to output format
    const results = this.extractClusters();

    logger.info('[ARC] Clustering complete', {
      iterations: this.iterationCount,
      resonanceEvents: this.resonanceEvents,
      finalClusters: results.length,
      multiDomainClusters: results.filter(c => c.domains.length > 1).length
    });

    return results;
  }

  /**
   * Finds best matching cluster for a vector
   */
  private findBestMatch(
    vector: Float32Array,
    vigilance: number
  ): Cluster | null {
    let bestCluster: Cluster | null = null;
    let bestSimilarity = -1;

    for (const cluster of this.clusters.values()) {
      const similarity = this.calculateSimilarity(vector, cluster.centroid);

      // Check vigilance threshold
      if (similarity >= vigilance && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestCluster = cluster;
      }
    }

    return bestCluster;
  }

  /**
   * Updates cluster with new member
   */
  private updateCluster(
    cluster: Cluster,
    domain: string,
    vector: Float32Array,
    learningRate: number
  ): boolean {
    // Check if domain already in cluster
    if (cluster.domains.includes(domain)) {
      return false;
    }

    // Add domain to cluster
    cluster.domains.push(domain);

    // Update centroid using learning rate
    for (let i = 0; i < cluster.centroid.length; i++) {
      cluster.centroid[i] = cluster.centroid[i] * (1 - learningRate) +
                           vector[i] * learningRate;
    }

    // Normalize centroid
    this.normalizeCentroid(cluster.centroid);

    // Update confidence based on cluster cohesion
    cluster.confidence = this.calculateClusterConfidence(cluster);
    cluster.lastUpdated = Date.now();

    return true;
  }

  /**
   * Creates new cluster
   */
  private createCluster(domain: string, vector: Float32Array): void {
    const clusterId = `cluster_${Date.now()}_${SecureRandom.randomInt(0, 9999)}`;

    const cluster: Cluster = {
      id: clusterId,
      domains: [domain],
      centroid: new Float32Array(vector), // Copy vector
      confidence: 1.0, // Initial confidence
      resonanceScore: 0,
      lastUpdated: Date.now()
    };

    this.clusters.set(clusterId, cluster);
  }

  /**
   * Calculates similarity between vectors using cosine similarity
   */
  private calculateSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Calculates cluster confidence based on internal cohesion
   */
  private calculateClusterConfidence(cluster: Cluster): number {
    // Single domain clusters have low confidence
    if (cluster.domains.length < 2) {
      return 0.1;
    }

    // Calculate based on cluster size and age
    const sizeFactor = Math.min(1.0, cluster.domains.length / 10);
    const ageFactor = Math.min(1.0,
      (Date.now() - cluster.lastUpdated) / (3600 * 1000) // Hours old
    );

    // Resonance score contribution
    const resonanceFactor = Math.min(1.0, cluster.resonanceScore / 10);

    // Weighted combination
    return sizeFactor * 0.5 + (1 - ageFactor) * 0.3 + resonanceFactor * 0.2;
  }

  /**
   * Normalizes centroid to unit length
   */
  private normalizeCentroid(centroid: Float32Array): void {
    let sum = 0;
    for (let i = 0; i < centroid.length; i++) {
      sum += centroid[i] * centroid[i];
    }

    const norm = Math.sqrt(sum);
    if (norm > 0) {
      for (let i = 0; i < centroid.length; i++) {
        centroid[i] /= norm;
      }
    }
  }

  /**
   * Prunes weak clusters with low confidence
   */
  private pruneWeakClusters(): void {
    const toRemove: string[] = [];

    for (const [id, cluster] of this.clusters) {
      // Remove single-domain clusters after initial iterations
      if (this.iterationCount > 20 &&
          cluster.domains.length < this.MIN_CLUSTER_SIZE) {
        toRemove.push(id);
      }

      // Remove low confidence clusters
      if (cluster.confidence < 0.2) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.clusters.delete(id);
    }

    if (toRemove.length > 0) {
      logger.debug('[ARC] Pruned weak clusters', {
        removed: toRemove.length,
        remaining: this.clusters.size
      });
    }
  }

  /**
   * Final cluster refinement and merging
   */
  private refineClusterst(vigilance: number): void {
    const merged = new Set<string>();

    // Try to merge similar clusters
    for (const [id1, cluster1] of this.clusters) {
      if (merged.has(id1)) continue;

      for (const [id2, cluster2] of this.clusters) {
        if (id1 === id2 || merged.has(id2)) continue;

        const similarity = this.calculateSimilarity(
          cluster1.centroid,
          cluster2.centroid
        );

        // Merge if very similar
        if (similarity > vigilance + 0.1) { // Stricter threshold for merging
          // Merge cluster2 into cluster1
          cluster1.domains.push(...cluster2.domains);

          // Update centroid as weighted average
          const weight1 = cluster1.domains.length;
          const weight2 = cluster2.domains.length;
          const totalWeight = weight1 + weight2;

          for (let i = 0; i < cluster1.centroid.length; i++) {
            cluster1.centroid[i] = (
              cluster1.centroid[i] * weight1 +
              cluster2.centroid[i] * weight2
            ) / totalWeight;
          }

          this.normalizeCentroid(cluster1.centroid);
          cluster1.confidence = this.calculateClusterConfidence(cluster1);

          // Mark cluster2 for removal
          merged.add(id2);
        }
      }
    }

    // Remove merged clusters
    for (const id of merged) {
      this.clusters.delete(id);
    }

    if (merged.size > 0) {
      logger.debug('[ARC] Merged similar clusters', {
        mergedCount: merged.size,
        finalCount: this.clusters.size
      });
    }
  }

  /**
   * Extracts final clusters for output
   */
  private extractClusters(): Array<{
    domains: string[];
    centroid: Float32Array;
    confidence: number;
  }> {
    const results = [];

    for (const cluster of this.clusters.values()) {
      // Only include multi-domain clusters with sufficient confidence
      if (cluster.domains.length >= this.MIN_CLUSTER_SIZE &&
          cluster.confidence >= 0.5) {
        results.push({
          domains: [...cluster.domains], // Copy array
          centroid: new Float32Array(cluster.centroid), // Copy vector
          confidence: cluster.confidence
        });
      }
    }

    // Sort by confidence descending
    results.sort((a, b) => b.confidence - a.confidence);

    return results;
  }

  /**
   * Resets internal state
   */
  private resetState(): void {
    this.clusters.clear();
    this.iterationCount = 0;
    this.resonanceEvents = 0;
  }

  /**
   * Calculates inter-cluster distance matrix
   */
  public getDistanceMatrix(): number[][] {
    const clusterArray = Array.from(this.clusters.values());
    const n = clusterArray.length;
    const matrix: number[][] = [];

    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          matrix[i][j] = 1 - this.calculateSimilarity(
            clusterArray[i].centroid,
            clusterArray[j].centroid
          );
        }
      }
    }

    return matrix;
  }

  /**
   * Get clustering statistics
   */
  public getStatistics(): {
    clusterCount: number;
    totalDomains: number;
    avgClusterSize: number;
    avgConfidence: number;
    resonanceRate: number;
  } {
    const clusters = Array.from(this.clusters.values());
    const totalDomains = clusters.reduce((sum, c) => sum + c.domains.length, 0);
    const avgConfidence = clusters.reduce((sum, c) => sum + c.confidence, 0) /
                         (clusters.length || 1);

    return {
      clusterCount: clusters.length,
      totalDomains,
      avgClusterSize: totalDomains / (clusters.length || 1),
      avgConfidence,
      resonanceRate: this.resonanceEvents / (this.iterationCount + 1)
    };
  }
}