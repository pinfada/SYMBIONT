/**
 * ActiveRAGStore — Store local de signatures de menaces (F-06)
 *
 * Stockage IndexedDB avec cache LRU mémoire.
 * Fallback mémoire seule si IndexedDB indisponible.
 */

import {
  ThreatSignature,
  SignaturePattern,
  SignatureMatch,
  SignatureStatus,
  cosineSimilarity,
  CandidateSignature,
} from '../CortexTypes';
import { generateSecureUUID } from '@shared/utils/uuid';

const DB_NAME = 'symbiont-cortex-rag';
const DB_VERSION = 1;
const STORE_NAME = 'signatures';
const MAX_CACHE_ENTRIES = 500;
const DEFAULT_SIMILARITY_THRESHOLD = 0.75;

export class ActiveRAGStore {
  private db: IDBDatabase | null = null;
  private cache: Map<string, ThreatSignature> = new Map();
  private fallbackMemoryOnly = false;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = await this.openDatabase();
      await this.loadConfirmedIntoCache();
    } catch {
      this.fallbackMemoryOnly = true;
    }

    this.initialized = true;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB not available'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('lastSeenAt', 'lastSeenAt', { unique: false });
          store.createIndex('confidence', 'confidence', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async loadConfirmedIntoCache(): Promise<void> {
    const confirmed = await this.getByStatus('confirmed');
    for (const sig of confirmed) {
      this.addToCache(sig);
    }
  }

  private addToCache(sig: ThreatSignature): void {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(sig.id, sig);
  }

  async findSimilar(
    pattern: SignaturePattern,
    threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
  ): Promise<SignatureMatch[]> {
    const startTime = performance.now();
    const matches: SignatureMatch[] = [];
    const signatures = await this.getConfirmedSignatures();

    for (const sig of signatures) {
      const similarity = cosineSimilarity(pattern.featureVector, sig.pattern.featureVector);
      if (similarity >= threshold) {
        matches.push({
          signatureId: sig.id,
          similarity,
          matchedSignature: sig,
          matchDuration: performance.now() - startTime,
        });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);
    return matches;
  }

  async addCandidate(candidate: CandidateSignature): Promise<void> {
    const now = Date.now();
    const signature: ThreatSignature = {
      id: generateSecureUUID(),
      pattern: candidate.pattern,
      status: 'candidate',
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
      occurrenceCount: 1,
      falsePositiveCount: 0,
      truePositiveCount: 0,
      confidence: candidate.initialConfidence,
      promotionHistory: [],
      sourceContext: {
        urlHash: candidate.contextSnapshot.urlHash,
        generatedByOracleId: candidate.sourceSignalId,
      },
    };

    await this.put(signature);
    this.addToCache(signature);
  }

  async updateStatus(
    id: string,
    status: SignatureStatus,
    reason: string,
  ): Promise<void> {
    const sig = await this.get(id);
    if (!sig) return;

    const transition = {
      from: sig.status,
      to: status,
      timestamp: Date.now(),
      reason,
      metrics: {
        occurrenceCount: sig.occurrenceCount,
        falsePositiveRate:
          sig.occurrenceCount > 0
            ? sig.falsePositiveCount / sig.occurrenceCount
            : 0,
        confidence: sig.confidence,
      },
    };

    sig.status = status;
    sig.updatedAt = Date.now();
    sig.promotionHistory.push(transition);

    await this.put(sig);

    if (status === 'confirmed') {
      this.addToCache(sig);
    } else if (status === 'deprecated' || status === 'quarantined') {
      this.cache.delete(id);
    }
  }

  async recordOccurrence(id: string): Promise<void> {
    const sig = await this.get(id);
    if (!sig) return;

    sig.occurrenceCount++;
    sig.lastSeenAt = Date.now();
    sig.updatedAt = Date.now();

    await this.put(sig);
    if (this.cache.has(id)) {
      this.cache.set(id, sig);
    }
  }

  async recordFalsePositive(id: string): Promise<void> {
    const sig = await this.get(id);
    if (!sig) return;

    sig.falsePositiveCount++;
    sig.updatedAt = Date.now();
    sig.confidence = Math.max(0, sig.confidence - 0.05);

    await this.put(sig);
    if (this.cache.has(id)) {
      this.cache.set(id, sig);
    }
  }

  async recordTruePositive(id: string): Promise<void> {
    const sig = await this.get(id);
    if (!sig) return;

    sig.truePositiveCount++;
    sig.lastSeenAt = Date.now();
    sig.updatedAt = Date.now();
    sig.confidence = Math.min(1, sig.confidence + 0.02);

    await this.put(sig);
    if (this.cache.has(id)) {
      this.cache.set(id, sig);
    }
  }

  async getConfirmedSignatures(): Promise<ThreatSignature[]> {
    const cached = Array.from(this.cache.values()).filter(
      (s) => s.status === 'confirmed',
    );
    if (cached.length > 0) return cached;
    return this.getByStatus('confirmed');
  }

  async getCandidatesForReview(): Promise<ThreatSignature[]> {
    const candidates = await this.getByStatus('candidate');
    const probation = await this.getByStatus('probation');
    return [...candidates, ...probation];
  }

  async pruneDeprecated(maxAgeMs: number): Promise<number> {
    const deprecated = await this.getByStatus('deprecated');
    const cutoff = Date.now() - maxAgeMs;
    let pruned = 0;

    for (const sig of deprecated) {
      if (sig.updatedAt < cutoff) {
        await this.delete(sig.id);
        this.cache.delete(sig.id);
        pruned++;
      }
    }

    return pruned;
  }

  async getSiteRiskScore(urlHash: string | undefined): Promise<number> {
    if (!urlHash) return 0.5;

    const all = await this.getAll();
    const siteSignatures = all.filter(
      (s) => s.sourceContext.urlHash === urlHash,
    );

    if (siteSignatures.length === 0) return 0.5;

    const maliciousCount = siteSignatures.filter(
      (s) => s.status === 'confirmed' || s.status === 'probation',
    ).length;

    return Math.min(1, maliciousCount / Math.max(1, siteSignatures.length));
  }

  async getSignatureCount(): Promise<Record<SignatureStatus, number>> {
    const all = await this.getAll();
    const counts: Record<SignatureStatus, number> = {
      candidate: 0,
      probation: 0,
      confirmed: 0,
      deprecated: 0,
      quarantined: 0,
    };

    for (const sig of all) {
      if (counts[sig.status] !== undefined) {
        counts[sig.status]++;
      }
    }

    return counts;
  }

  async getRecentCandidates(windowMs: number = 3600_000): Promise<ThreatSignature[]> {
    const cutoff = Date.now() - windowMs;
    const candidates = await this.getByStatus('candidate');
    return candidates.filter((s) => s.createdAt >= cutoff);
  }

  isFallbackMode(): boolean {
    return this.fallbackMemoryOnly;
  }

  // ─── Low-level storage ────────────────────────────────────────────

  private async get(id: string): Promise<ThreatSignature | null> {
    const cached = this.cache.get(id);
    if (cached) return cached;

    if (this.fallbackMemoryOnly || !this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result ?? null;
        if (result) {
          result.pattern.featureVector = new Float32Array(result.pattern.featureVector);
        }
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async put(sig: ThreatSignature): Promise<void> {
    this.addToCache(sig);

    if (this.fallbackMemoryOnly || !this.db) return;

    const serializable = {
      ...sig,
      pattern: {
        ...sig.pattern,
        featureVector: Array.from(sig.pattern.featureVector),
      },
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(serializable);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async delete(id: string): Promise<void> {
    this.cache.delete(id);

    if (this.fallbackMemoryOnly || !this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getByStatus(status: SignatureStatus): Promise<ThreatSignature[]> {
    if (this.fallbackMemoryOnly || !this.db) {
      return Array.from(this.cache.values()).filter((s) => s.status === status);
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.getAll(status);
      request.onsuccess = () => {
        const results = (request.result || []).map(
          (r: ThreatSignature & { pattern: { featureVector: number[] } }) => ({
            ...r,
            pattern: {
              ...r.pattern,
              featureVector: new Float32Array(r.pattern.featureVector),
            },
          }),
        );
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getAll(): Promise<ThreatSignature[]> {
    if (this.fallbackMemoryOnly || !this.db) {
      return Array.from(this.cache.values());
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result || []).map(
          (r: ThreatSignature & { pattern: { featureVector: number[] } }) => ({
            ...r,
            pattern: {
              ...r.pattern,
              featureVector: new Float32Array(r.pattern.featureVector),
            },
          }),
        );
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  destroy(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.cache.clear();
    this.initialized = false;
  }
}
