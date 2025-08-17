// Export centralisé de tous les utilitaires sécurisés
// Utilisation : import { safeAverage, safeGetClasses } from '@/shared/utils';

// Opérations sécurisées
export {
  safeAverage,
  safeRatio,
  safeGetClasses,
  safeGetSelection,
  safeSplit,
  safeLength,
  safeJsonParse,
  safeGet,
  safeLimitArray,
  safeArrayOperation
} from './safeOperations';

// Validation et debug (développement uniquement)
export {
  validateVariable,
  validateLengthProperty,
  validateSplitOperation,
  enableErrorValidation,
  runErrorTests
} from './errorValidation';

// Génération sécurisée de nombres aléatoires
export {
  SecureRandom,
  secureRandom,
  secureRandomInt,
  secureRandomFloat
} from './secureRandom';

// Système de logging sécurisé
export {
  SecureLogger,
  LogLevel,
  logger,
  secureLog,
  secureWarn,
  secureError,
  secureDebug
} from './secureLogger';

// UUID sécurisé
export {
  generateUUID,
  generateSecureUUID,
  isCryptoUUIDAvailable
} from './uuid';

// Imports pour utilisation interne
import { enableErrorValidation, runErrorTests } from './errorValidation';
import { logger } from './secureLogger';

// Types utilitaires pour TypeScript
export type SafeOperationConfig = {
  isDevelopment?: boolean;
  enableLogging?: boolean;
  maxArraySize?: number;
};

// Configuration par défaut pour les opérations sécurisées
export const DEFAULT_SAFE_CONFIG: SafeOperationConfig = {
  isDevelopment: process.env.NODE_ENV === 'development',
  enableLogging: false,
  maxArraySize: 1000
};

// Helper pour initialiser les utilitaires sécurisés en production
export function initializeSafeOperations(config: SafeOperationConfig = DEFAULT_SAFE_CONFIG): void {
  if (config.isDevelopment && config.enableLogging) {
    logger.info('🛡️ Safe Operations initialized with config', { config });
    
    // Activer la validation d'erreurs en mode développement
    enableErrorValidation(config.isDevelopment);
    
    // Lancer les tests de validation
    runErrorTests();
  }
}

// Version utilitaire pour imports faciles
export * as SafeOps from './safeOperations';
export * as ErrorValidation from './errorValidation'; 