/**
 * Storage Layer
 *
 * Exports les gestionnaires de stockage.
 */

// Storage résilient (nouvelle implémentation avec backpressure)
export {
  ResilientStorageManager,
  createResilientStorage,
  type StorageMetrics,
  type StorageHealth
} from './ResilientStorageManager';

// Legacy storage (pour compatibilité)
export { HybridStorageManager } from './hybrid-storage-manager';

// Core storage
export * from '../core/storage/SymbiontStorage';
