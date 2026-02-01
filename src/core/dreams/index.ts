/**
 * Dream Analysis System - Public API
 *
 * Exports for the nocturnal synthesis and cross-domain surveillance detection system
 */

export { DreamProcessor } from './DreamProcessor';
export type {
  MemoryFragment,
  SurveillanceSignature,
  DreamReport
} from './DreamProcessor';

export { MemoryFragmentCollector } from './MemoryFragmentCollector';
export { SignatureVectorizer } from './SignatureVectorizer';
export { AdaptiveResonanceClustering } from './AdaptiveResonanceClustering';
export { ThermalThrottlingController } from './ThermalThrottlingController';
export { CDNWhitelist } from './CDNWhitelist';
export { DreamStorage } from './DreamStorage';

// Re-export types for convenience
export type {
  ThermalState,
  ThermalStatus
} from './ThermalThrottlingController';

export type {
  ClusterOptions,
  Cluster
} from './AdaptiveResonanceClustering';