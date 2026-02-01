/**
 * SignatureVectorizer - Cross-Domain Signature Extraction
 *
 * Converts memory fragments into high-dimensional vectors for clustering analysis.
 * Uses semantic hashing and structural fingerprinting techniques.
 *
 * @module SignatureVectorizer
 */

import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';
import type { MemoryFragment } from './DreamProcessor';

export class SignatureVectorizer {
  // OPTIMISATION MÉMOIRE: Réduction des dimensions (64 → 32)
  private static readonly FRICTION_DIM = 4;    // 8 → 4
  private static readonly LATENCY_DIM = 4;     // 8 → 4
  private static readonly TRACKER_DIM = 16;    // 32 → 16
  private static readonly PROTOCOL_DIM = 2;    // 4 → 2
  private static readonly TIMING_DIM = 6;      // 12 → 6
  private static readonly TOTAL_DIM = 32;      // 64 → 32 (50% réduction)

  // Normalization parameters learned from data
  private frictionStats = { mean: 100, std: 50 };
  private latencyStats = { mean: 200, std: 100 };

  // OPTIMISATION: Pool de vecteurs réutilisables
  private static readonly vectorPool: Float32Array[] = [];
  private static readonly MAX_POOL_SIZE = 50;

  /**
   * Creates a signature vector from a memory fragment
   */
  public async createSignatureVector(fragment: MemoryFragment): Promise<Float32Array> {
    // OPTIMISATION: Réutiliser les vecteurs du pool si disponibles
    const vector = this.getVectorFromPool();

    try {
      let offset = 0;

      // 1. Friction component (DOM jitter patterns)
      const frictionVector = this.encodeFriction(fragment.friction);
      vector.set(frictionVector, offset);
      offset += SignatureVectorizer.FRICTION_DIM;

      // 2. Latency component (Network timing patterns)
      const latencyVector = this.encodeLatency(fragment.latency, fragment.resourceTimings);
      vector.set(latencyVector, offset);
      offset += SignatureVectorizer.LATENCY_DIM;

      // 3. Tracker fingerprint component
      const trackerVector = await this.encodeTrackers(fragment.trackers);
      vector.set(trackerVector, offset);
      offset += SignatureVectorizer.TRACKER_DIM;

      // 4. Protocol signature component
      const protocolVector = this.encodeProtocol(fragment.protocolSignature);
      vector.set(protocolVector, offset);
      offset += SignatureVectorizer.PROTOCOL_DIM;

      // 5. Timing patterns component
      const timingVector = this.encodeTimingPatterns(fragment.resourceTimings);
      vector.set(timingVector, offset);

      // Normalize final vector
      this.normalizeVector(vector);

      return vector;

    } catch (error) {
      logger.error('[SignatureVectorizer] Failed to create signature', error);
      return vector; // Return zero vector on error
    }
  }

  /**
   * Encodes friction (DOM jitter) into vector components
   */
  private encodeFriction(friction: number): Float32Array {
    const vector = new Float32Array(SignatureVectorizer.FRICTION_DIM);

    // Normalize friction value
    const normalized = (friction - this.frictionStats.mean) / this.frictionStats.std;
    const clamped = Math.max(-3, Math.min(3, normalized)); // Clamp to ±3 std devs

    // Create Gaussian-like encoding
    for (let i = 0; i < SignatureVectorizer.FRICTION_DIM; i++) {
      const center = -3 + (6 * i / (SignatureVectorizer.FRICTION_DIM - 1));
      vector[i] = Math.exp(-0.5 * Math.pow((clamped - center) / 0.5, 2));
    }

    return vector;
  }

  /**
   * Encodes latency patterns into vector components
   */
  private encodeLatency(
    baseLatency: number,
    resourceTimings?: Array<{ name: string; duration: number; nextHopProtocol?: string }>
  ): Float32Array {
    const vector = new Float32Array(SignatureVectorizer.LATENCY_DIM);

    // Base latency encoding
    const normalized = (baseLatency - this.latencyStats.mean) / this.latencyStats.std;
    const clamped = Math.max(-3, Math.min(3, normalized));

    // First half: base latency encoding
    for (let i = 0; i < 4; i++) {
      const center = -3 + (6 * i / 3);
      vector[i] = Math.exp(-0.5 * Math.pow((clamped - center) / 0.5, 2));
    }

    // Second half: resource timing statistics
    if (resourceTimings && resourceTimings.length > 0) {
      const durations = resourceTimings.map(r => r.duration);

      // Statistical features
      vector[4] = this.sigmoid(Math.min(...durations) / 100); // Min duration
      vector[5] = this.sigmoid(Math.max(...durations) / 1000); // Max duration
      vector[6] = this.sigmoid(this.calculateMean(durations) / 500); // Mean
      vector[7] = this.sigmoid(this.calculateStd(durations) / 200); // Std deviation
    }

    return vector;
  }

  /**
   * Encodes tracker fingerprints using locality-sensitive hashing
   */
  private async encodeTrackers(trackers: string[]): Promise<Float32Array> {
    const vector = new Float32Array(SignatureVectorizer.TRACKER_DIM);

    if (!trackers || trackers.length === 0) {
      return vector;
    }

    // Concatenate and hash all tracker identifiers
    const combined = trackers.sort().join('|');
    const hashBuffer = await crypto.subtle.digest('SHA-256',
      new TextEncoder().encode(combined)
    );
    const hashArray = new Uint8Array(hashBuffer);

    // Convert hash to float vector with values in [0, 1]
    for (let i = 0; i < SignatureVectorizer.TRACKER_DIM; i++) {
      const byteIndex = i % hashArray.length;
      vector[i] = hashArray[byteIndex] / 255.0;
    }

    // Apply sparsity: zero out small values to create sparse representation
    const threshold = 0.3;
    for (let i = 0; i < vector.length; i++) {
      if (vector[i] < threshold) {
        vector[i] = 0;
      }
    }

    return vector;
  }

  /**
   * Encodes protocol signature (HTTP/2, HTTP/3, QUIC patterns)
   */
  private encodeProtocol(protocolSignature: string): Float32Array {
    const vector = new Float32Array(SignatureVectorizer.PROTOCOL_DIM);

    // One-hot encoding for known protocols
    switch (protocolSignature?.toLowerCase()) {
      case 'h3':
      case 'http/3':
        vector[0] = 1.0; // HTTP/3 / QUIC
        break;
      case 'h2':
      case 'http/2':
        vector[1] = 1.0; // HTTP/2
        break;
      case 'http/1.1':
        vector[2] = 1.0; // HTTP/1.1
        break;
      default:
        vector[3] = 1.0; // Unknown/Other
    }

    return vector;
  }

  /**
   * Encodes timing patterns from resource timings
   */
  private encodeTimingPatterns(
    resourceTimings?: Array<{ name: string; duration: number; nextHopProtocol?: string }>
  ): Float32Array {
    const vector = new Float32Array(SignatureVectorizer.TIMING_DIM);

    if (!resourceTimings || resourceTimings.length === 0) {
      return vector;
    }

    // Extract timing features
    const durations = resourceTimings.map(r => r.duration);
    const intervals: number[] = [];

    // Calculate inter-request intervals
    for (let i = 1; i < durations.length; i++) {
      intervals.push(Math.abs(durations[i] - durations[i - 1]));
    }

    // Encode periodicity detection (looking for regular patterns)
    const fftResult = this.simpleFFT(durations.slice(0, 16)); // Use first 16 samples

    // First 6 components: FFT magnitudes (frequency domain features)
    for (let i = 0; i < 6 && i < fftResult.length; i++) {
      vector[i] = this.sigmoid(fftResult[i] / 100);
    }

    // Next 3 components: Timing statistics
    vector[6] = this.sigmoid(durations.length / 50); // Request count
    vector[7] = intervals.length > 0 ?
      this.sigmoid(this.calculateMean(intervals) / 100) : 0; // Mean interval
    vector[8] = intervals.length > 0 ?
      this.sigmoid(this.calculateStd(intervals) / 50) : 0; // Interval variance

    // Last 3 components: Protocol diversity
    const protocols = new Set(resourceTimings
      .map(r => r.nextHopProtocol)
      .filter(p => p)
    );
    vector[9] = protocols.has('h3') ? 1 : 0; // QUIC present
    vector[10] = protocols.has('h2') ? 1 : 0; // HTTP/2 present
    vector[11] = protocols.size > 1 ? 1 : 0; // Mixed protocols

    return vector;
  }

  /**
   * Simple FFT for periodicity detection
   */
  private simpleFFT(data: number[]): number[] {
    const n = data.length;
    const magnitudes: number[] = [];

    // Calculate first few frequency components only
    for (let k = 0; k < Math.min(6, n / 2); k++) {
      let real = 0;
      let imag = 0;

      for (let t = 0; t < n; t++) {
        const angle = -2 * Math.PI * k * t / n;
        real += data[t] * Math.cos(angle);
        imag += data[t] * Math.sin(angle);
      }

      magnitudes.push(Math.sqrt(real * real + imag * imag));
    }

    return magnitudes;
  }

  /**
   * Normalizes vector to unit length (L2 normalization)
   */
  private normalizeVector(vector: Float32Array): void {
    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
      sum += vector[i] * vector[i];
    }

    const norm = Math.sqrt(sum);
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }
  }

  /**
   * Sigmoid activation function for bounded outputs
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Calculate mean of array
   */
  private calculateMean(data: number[]): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStd(data: number[]): number {
    if (data.length < 2) return 0;
    const mean = this.calculateMean(data);
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * Compute cosine similarity between two vectors
   */
  public cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
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
   * Update normalization statistics from observed data
   */
  public updateStatistics(fragments: MemoryFragment[]): void {
    if (fragments.length === 0) return;

    // Update friction statistics
    const frictions = fragments.map(f => f.friction);
    this.frictionStats.mean = this.calculateMean(frictions);
    this.frictionStats.std = this.calculateStd(frictions);

    // Update latency statistics
    const latencies = fragments.map(f => f.latency);
    this.latencyStats.mean = this.calculateMean(latencies);
    this.latencyStats.std = this.calculateStd(latencies);

    logger.debug('[SignatureVectorizer] Statistics updated', {
      frictionMean: this.frictionStats.mean,
      frictionStd: this.frictionStats.std,
      latencyMean: this.latencyStats.mean,
      latencyStd: this.latencyStats.std,
      sampleSize: fragments.length
    });
  }

  /**
   * Récupère un vecteur du pool ou en crée un nouveau
   */
  private getVectorFromPool(): Float32Array {
    const vector = SignatureVectorizer.vectorPool.pop();
    if (vector) {
      // Réinitialiser le vecteur réutilisé
      vector.fill(0);
      return vector;
    }
    return new Float32Array(SignatureVectorizer.TOTAL_DIM);
  }

  /**
   * Retourne un vecteur au pool pour réutilisation
   */
  public releaseVector(vector: Float32Array): void {
    if (SignatureVectorizer.vectorPool.length < SignatureVectorizer.MAX_POOL_SIZE) {
      SignatureVectorizer.vectorPool.push(vector);
    }
  }

  /**
   * Nettoie le pool de vecteurs
   */
  public static clearVectorPool(): void {
    SignatureVectorizer.vectorPool.length = 0;
  }
}