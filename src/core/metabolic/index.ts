/**
 * Couche Métabolique
 *
 * Gestion des flux et de l'énergie pour éviter l'asphyxie du système.
 */

export {
  NeuromodulationManager,
  neuromodulation,
  type NeuromodulatorLevels,
  type NeuromodulationConfig,
  type NetworkTemperature,
  type NeuromodulationEvent
} from './Neuromodulation';

export {
  BackpressureController,
  backpressureController,
  type BackpressureMetrics,
  type BackpressureConfig,
  type BackpressureLevel
} from './BackpressureController';

export {
  CircadianCycleManager,
  circadianCycle,
  type CircadianPhase,
  type CircadianConfig,
  type DigestTask,
  type CircadianState
} from './CircadianCycle';
