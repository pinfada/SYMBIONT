/**
 * DreamStorage - Persistent Storage for Dream Analysis Results
 *
 * Manages IndexedDB storage with compression for dream synthesis reports
 * and surveillance signatures. Implements quota management to prevent
 * storage exhaustion.
 *
 * @module DreamStorage
 */

import { logger } from '@/shared/utils/secureLogger';
import { generateSecureUUID } from '@/shared/utils/uuid';
import type { DreamReport, SurveillanceSignature, MemoryFragment } from './DreamProcessor';

interface StoredReport extends DreamReport {
  compressed: boolean;
  size: number;
}

interface StorageQuota {
  used: number;
  total: number;
  percentage: number;
}

/**
 * IndexedDB storage manager with compression
 */
export class DreamStorage {
  private static readonly DB_NAME = 'SymbiontDreams';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_REPORTS = 'reports';
  private static readonly STORE_SIGNATURES = 'signatures';
  private static readonly STORE_FRAGMENTS = 'fragments';

  // Storage limits
  private static readonly MAX_REPORTS = 100;
  private static readonly MAX_SIGNATURES = 500;
  private static readonly MAX_FRAGMENTS = 1000;
  private static readonly MAX_STORAGE_MB = 50; // 50MB limit

  private db: IDBDatabase | null = null;
  private compressionWorker: Worker | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize database connection
   */
  private async initialize(): Promise<void> {
    try {
      this.db = await this.openDatabase();
      logger.info('[DreamStorage] Database initialized');

      // Check and enforce quotas
      await this.enforceQuotas();

    } catch (error) {
      logger.error('[DreamStorage] Failed to initialize database', error);
      throw error;
    }
  }

  /**
   * Opens IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        DreamStorage.DB_NAME,
        DreamStorage.DB_VERSION
      );

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(DreamStorage.STORE_REPORTS)) {
          const reportStore = db.createObjectStore(DreamStorage.STORE_REPORTS, {
            keyPath: 'synthesisId'
          });
          reportStore.createIndex('timestamp', 'startTime', { unique: false });
          reportStore.createIndex('shadowEntities', 'shadowEntities.length', { unique: false });
        }

        if (!db.objectStoreNames.contains(DreamStorage.STORE_SIGNATURES)) {
          const sigStore = db.createObjectStore(DreamStorage.STORE_SIGNATURES, {
            keyPath: 'id'
          });
          sigStore.createIndex('confidence', 'confidence', { unique: false });
          sigStore.createIndex('discoveredAt', 'discoveredAt', { unique: false });
          sigStore.createIndex('domains', 'domains', { unique: false, multiEntry: true });
        }

        if (!db.objectStoreNames.contains(DreamStorage.STORE_FRAGMENTS)) {
          const fragStore = db.createObjectStore(DreamStorage.STORE_FRAGMENTS, {
            keyPath: 'id',
            autoIncrement: true
          });
          fragStore.createIndex('domain', 'domain', { unique: false });
          fragStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Stores dream synthesis report
   */
  public async storeSynthesisReport(report: DreamReport): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Compress report if large
      const compressed = await this.compressIfNeeded(report);

      const storedReport: StoredReport = {
        ...report,
        compressed: compressed !== report,
        size: JSON.stringify(compressed).length
      };

      const transaction = this.db.transaction(
        [DreamStorage.STORE_REPORTS],
        'readwrite'
      );
      const store = transaction.objectStore(DreamStorage.STORE_REPORTS);

      await this.promisifyRequest(store.put(storedReport));

      logger.info('[DreamStorage] Report stored', {
        synthesisId: report.synthesisId,
        compressed: storedReport.compressed,
        sizeMB: storedReport.size / 1024 / 1024
      });

      // Cleanup old reports
      await this.cleanupOldReports();

    } catch (error) {
      logger.error('[DreamStorage] Failed to store report', error);
      throw error;
    }
  }

  /**
   * Stores surveillance signature
   */
  public async storeSignature(signature: SurveillanceSignature): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const transaction = this.db.transaction(
        [DreamStorage.STORE_SIGNATURES],
        'readwrite'
      );
      const store = transaction.objectStore(DreamStorage.STORE_SIGNATURES);

      await this.promisifyRequest(store.put(signature));

      logger.debug('[DreamStorage] Signature stored', {
        id: signature.id,
        domains: signature.domains.length
      });

      // Cleanup if needed
      await this.cleanupOldSignatures();

    } catch (error) {
      logger.error('[DreamStorage] Failed to store signature', error);
      throw error;
    }
  }

  /**
   * Stores memory fragments for future analysis
   */
  public async storeFragments(fragments: MemoryFragment[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const transaction = this.db.transaction(
        [DreamStorage.STORE_FRAGMENTS],
        'readwrite'
      );
      const store = transaction.objectStore(DreamStorage.STORE_FRAGMENTS);

      // Batch insert with size check
      for (const fragment of fragments) {
        // Add timestamp if missing
        if (!fragment.timestamp) {
          fragment.timestamp = Date.now();
        }

        await this.promisifyRequest(store.add(fragment));
      }

      logger.debug('[DreamStorage] Fragments stored', {
        count: fragments.length
      });

      // Cleanup old fragments
      await this.cleanupOldFragments();

    } catch (error) {
      logger.error('[DreamStorage] Failed to store fragments', error);
      throw error;
    }
  }

  /**
   * Retrieves recent synthesis reports
   */
  public async getRecentReports(limit = 10): Promise<DreamReport[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const transaction = this.db.transaction(
        [DreamStorage.STORE_REPORTS],
        'readonly'
      );
      const store = transaction.objectStore(DreamStorage.STORE_REPORTS);
      const index = store.index('timestamp');

      const reports: DreamReport[] = [];
      const cursor = index.openCursor(null, 'prev'); // Newest first

      return new Promise((resolve, reject) => {
        (cursor as IDBRequest).onsuccess = (event) => {
          const result = (event.target as IDBRequest<IDBCursorWithValue>).result;

          if (result && reports.length < limit) {
            const storedReport = result.value as StoredReport;

            // Decompress if needed
            const report = storedReport.compressed ?
              this.decompress(storedReport) : storedReport;

            reports.push(report);
            result.continue();
          } else {
            resolve(reports);
          }
        };

        (cursor as IDBRequest).onerror = () => {
          reject(new Error('Failed to retrieve reports'));
        };
      });

    } catch (error) {
      logger.error('[DreamStorage] Failed to get reports', error);
      throw error;
    }
  }

  /**
   * Retrieves high-confidence signatures
   */
  public async getHighConfidenceSignatures(
    minConfidence = 0.8
  ): Promise<SurveillanceSignature[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const transaction = this.db.transaction(
        [DreamStorage.STORE_SIGNATURES],
        'readonly'
      );
      const store = transaction.objectStore(DreamStorage.STORE_SIGNATURES);
      const index = store.index('confidence');

      const range = IDBKeyRange.lowerBound(minConfidence);
      const signatures: SurveillanceSignature[] = [];

      const cursor = index.openCursor(range, 'prev');

      return new Promise((resolve, reject) => {
        (cursor as IDBRequest).onsuccess = (event) => {
          const result = (event.target as IDBRequest<IDBCursorWithValue>).result;

          if (result) {
            signatures.push(result.value as SurveillanceSignature);
            result.continue();
          } else {
            resolve(signatures);
          }
        };

        (cursor as IDBRequest).onerror = () => {
          reject(new Error('Failed to retrieve signatures'));
        };
      });

    } catch (error) {
      logger.error('[DreamStorage] Failed to get signatures', error);
      throw error;
    }
  }

  /**
   * Retrieves memory fragments for domain
   */
  public async getFragmentsForDomain(
    domain: string,
    limit = 100
  ): Promise<MemoryFragment[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const transaction = this.db.transaction(
        [DreamStorage.STORE_FRAGMENTS],
        'readonly'
      );
      const store = transaction.objectStore(DreamStorage.STORE_FRAGMENTS);
      const index = store.index('domain');

      const fragments: MemoryFragment[] = [];
      const cursor = index.openCursor(IDBKeyRange.only(domain));

      return new Promise((resolve, reject) => {
        (cursor as IDBRequest).onsuccess = (event) => {
          const result = (event.target as IDBRequest<IDBCursorWithValue>).result;

          if (result && fragments.length < limit) {
            fragments.push(result.value as MemoryFragment);
            result.continue();
          } else {
            resolve(fragments);
          }
        };

        (cursor as IDBRequest).onerror = () => {
          reject(new Error('Failed to retrieve fragments'));
        };
      });

    } catch (error) {
      logger.error('[DreamStorage] Failed to get fragments', error);
      throw error;
    }
  }

  /**
   * Compress data if needed (simplified - real implementation would use LZ4)
   */
  private async compressIfNeeded(data: any): Promise<any> {
    const jsonStr = JSON.stringify(data);

    // Only compress if > 100KB
    if (jsonStr.length < 100 * 1024) {
      return data;
    }

    // Simplified compression using basic encoding
    // In production, use proper LZ4 library
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(jsonStr);

      // Use CompressionStream API if available
      if ('CompressionStream' in self) {
        const cs = new (self as any).CompressionStream('gzip');
        const writer = cs.writable.getWriter();
        writer.write(data);
        writer.close();

        const compressed = await new Response(cs.readable).arrayBuffer();
        return {
          _compressed: true,
          data: Array.from(new Uint8Array(compressed))
        };
      }

      return data; // Return uncompressed if API not available

    } catch (error) {
      logger.debug('[DreamStorage] Compression failed, storing uncompressed');
      return data;
    }
  }

  /**
   * Decompress data (simplified)
   */
  private decompress(data: any): any {
    if (!data._compressed) {
      return data;
    }

    try {
      // Use DecompressionStream API if available
      if ('DecompressionStream' in self) {
        const ds = new (self as any).DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        writer.write(new Uint8Array(data.data));
        writer.close();

        return new Response(ds.readable).json();
      }

      return data; // Return as-is if decompression not available

    } catch (error) {
      logger.error('[DreamStorage] Decompression failed');
      return data;
    }
  }

  /**
   * Cleanup old reports beyond limit
   */
  private async cleanupOldReports(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(
        [DreamStorage.STORE_REPORTS],
        'readwrite'
      );
      const store = transaction.objectStore(DreamStorage.STORE_REPORTS);
      const count = await this.promisifyRequest(store.count());

      if (count > DreamStorage.MAX_REPORTS) {
        const toDelete = count - DreamStorage.MAX_REPORTS;
        const index = store.index('timestamp');
        const cursor = index.openCursor(); // Oldest first

        let deleted = 0;
        (cursor as IDBRequest).onsuccess = (event) => {
          const result = (event.target as IDBRequest<IDBCursorWithValue>).result;

          if (result && deleted < toDelete) {
            result.delete();
            deleted++;
            result.continue();
          }
        };

        logger.debug('[DreamStorage] Cleaned old reports', { deleted: toDelete });
      }

    } catch (error) {
      logger.error('[DreamStorage] Cleanup failed', error);
    }
  }

  /**
   * Cleanup old signatures beyond limit
   */
  private async cleanupOldSignatures(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(
        [DreamStorage.STORE_SIGNATURES],
        'readwrite'
      );
      const store = transaction.objectStore(DreamStorage.STORE_SIGNATURES);
      const count = await this.promisifyRequest(store.count());

      if (count > DreamStorage.MAX_SIGNATURES) {
        // Delete low confidence signatures first
        const index = store.index('confidence');
        const cursor = index.openCursor(); // Lowest confidence first

        const toDelete = count - DreamStorage.MAX_SIGNATURES;
        let deleted = 0;

        (cursor as IDBRequest).onsuccess = (event) => {
          const result = (event.target as IDBRequest<IDBCursorWithValue>).result;

          if (result && deleted < toDelete) {
            result.delete();
            deleted++;
            result.continue();
          }
        };

        logger.debug('[DreamStorage] Cleaned old signatures', { deleted: toDelete });
      }

    } catch (error) {
      logger.error('[DreamStorage] Signature cleanup failed', error);
    }
  }

  /**
   * Cleanup old fragments beyond limit
   */
  private async cleanupOldFragments(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(
        [DreamStorage.STORE_FRAGMENTS],
        'readwrite'
      );
      const store = transaction.objectStore(DreamStorage.STORE_FRAGMENTS);
      const count = await this.promisifyRequest(store.count());

      if (count > DreamStorage.MAX_FRAGMENTS) {
        const index = store.index('timestamp');
        const cursor = index.openCursor(); // Oldest first

        const toDelete = count - DreamStorage.MAX_FRAGMENTS;
        let deleted = 0;

        (cursor as IDBRequest).onsuccess = (event) => {
          const result = (event.target as IDBRequest<IDBCursorWithValue>).result;

          if (result && deleted < toDelete) {
            result.delete();
            deleted++;
            result.continue();
          }
        };

        logger.debug('[DreamStorage] Cleaned old fragments', { deleted: toDelete });
      }

    } catch (error) {
      logger.error('[DreamStorage] Fragment cleanup failed', error);
    }
  }

  /**
   * Check and enforce storage quotas
   */
  private async enforceQuotas(): Promise<void> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage || 0) / 1024 / 1024;
        const quotaMB = (estimate.quota || 0) / 1024 / 1024;

        logger.info('[DreamStorage] Storage quota check', {
          usedMB: usedMB.toFixed(2),
          quotaMB: quotaMB.toFixed(2),
          percentage: ((usedMB / quotaMB) * 100).toFixed(1)
        });

        // If using too much space, aggressive cleanup
        if (usedMB > DreamStorage.MAX_STORAGE_MB) {
          await this.aggressiveCleanup();
        }
      }
    } catch (error) {
      logger.debug('[DreamStorage] Could not check storage quota');
    }
  }

  /**
   * Aggressive cleanup when approaching quota
   */
  private async aggressiveCleanup(): Promise<void> {
    logger.warn('[DreamStorage] Running aggressive cleanup');

    // Clear half of each store
    await this.clearOldestRecords(DreamStorage.STORE_REPORTS, 0.5);
    await this.clearOldestRecords(DreamStorage.STORE_SIGNATURES, 0.5);
    await this.clearOldestRecords(DreamStorage.STORE_FRAGMENTS, 0.5);
  }

  /**
   * Clear oldest records from store
   */
  private async clearOldestRecords(
    storeName: string,
    fraction: number
  ): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const count = await this.promisifyRequest(store.count());
    const toDelete = Math.floor(count * fraction);

    if (toDelete > 0) {
      const cursor = store.openCursor();
      let deleted = 0;

      (cursor as IDBRequest).onsuccess = (event) => {
        const result = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (result && deleted < toDelete) {
          result.delete();
          deleted++;
          result.continue();
        }
      };
    }
  }

  /**
   * Get storage statistics
   */
  public async getStatistics(): Promise<{
    reports: number;
    signatures: number;
    fragments: number;
    storageMB: number;
  }> {
    if (!this.db) {
      return { reports: 0, signatures: 0, fragments: 0, storageMB: 0 };
    }

    const transaction = this.db.transaction(
      [DreamStorage.STORE_REPORTS, DreamStorage.STORE_SIGNATURES, DreamStorage.STORE_FRAGMENTS],
      'readonly'
    );

    const reports = await this.promisifyRequest(
      transaction.objectStore(DreamStorage.STORE_REPORTS).count()
    );
    const signatures = await this.promisifyRequest(
      transaction.objectStore(DreamStorage.STORE_SIGNATURES).count()
    );
    const fragments = await this.promisifyRequest(
      transaction.objectStore(DreamStorage.STORE_FRAGMENTS).count()
    );

    let storageMB = 0;
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      storageMB = (estimate.usage || 0) / 1024 / 1024;
    }

    return { reports, signatures, fragments, storageMB };
  }

  /**
   * Clear all stored data
   */
  public async clearAll(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(
      [DreamStorage.STORE_REPORTS, DreamStorage.STORE_SIGNATURES, DreamStorage.STORE_FRAGMENTS],
      'readwrite'
    );

    await this.promisifyRequest(
      transaction.objectStore(DreamStorage.STORE_REPORTS).clear()
    );
    await this.promisifyRequest(
      transaction.objectStore(DreamStorage.STORE_SIGNATURES).clear()
    );
    await this.promisifyRequest(
      transaction.objectStore(DreamStorage.STORE_FRAGMENTS).clear()
    );

    logger.info('[DreamStorage] All data cleared');
  }

  /**
   * Helper to promisify IDB requests
   */
  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cleanup and disposal
   */
  public dispose(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }
  }
}