import { SecureRandom } from './secureRandom';
import { logger } from './secureLogger';

/**
 * Génère un UUID v4 avec fallback pour les environnements sans crypto.randomUUID
 */
export function generateUUID(): string {
  // Essayer d'abord crypto.randomUUID si disponible
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (_error) {
      logger.warn('crypto.randomUUID failed, using fallback', { error: _error });
    }
  }

  // Utilise notre générateur sécurisé au lieu de Math.random()
  return SecureRandom.uuid();
}

/**
 * Vérifie si crypto.randomUUID est disponible dans l'environnement actuel
 */
export function isCryptoUUIDAvailable(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.randomUUID === 'function';
}

/**
 * Génère un UUID v4 cryptographiquement sécurisé si possible
 * Utilise le système SecureRandom comme fallback sécurisé
 */
export function generateSecureUUID(): string {
  if (isCryptoUUIDAvailable()) {
    return crypto.randomUUID();
  }

  // Utilise notre générateur sécurisé
  return SecureRandom.uuid();
} 