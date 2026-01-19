/**
 * Couche Sociale et Résilience
 *
 * Gestion de l'existence de l'organisme au-delà d'une instance unique.
 */

export {
  QuorumSensingManager,
  createQuorumManager,
  type ContextType,
  type ContextInfo,
  type QuorumMessage,
  type StorageLock,
  type QuorumConfig
} from './QuorumSensing';

export {
  SoftwareEpigeneticsManager,
  softwareEpigenetics,
  featureGuard,
  featureGuardAsync,
  type FeaturePriority,
  type FeatureGene,
  type EpigeneticProfile,
  type AdaptationRule
} from './SoftwareEpigenetics';
