import { logger } from '@shared/utils/secureLogger';
/**
 * Utilitaires de génération de nombres aléatoires sécurisés
 * Remplace Math.random() par crypto.getRandomValues() pour la sécurité cryptographique
 */

export class SecureRandom {
  private static readonly MAX_UINT32 = 0xFFFFFFFF;

  /**
   * Génère un nombre aléatoire sécurisé entre 0 et 1 (équivalent Math.random())
   */
  static random(): number {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] / (this.MAX_UINT32 + 1);
    }

    // CRITICAL: Crypto API not available - this should never happen in production
    const error = new Error('SECURITY CRITICAL: crypto.getRandomValues not available. Cannot generate secure random numbers.');
    logger.error('SecureRandom: CRITICAL SECURITY FAILURE', error);

    // In development/test only: use deterministic fallback instead of Math.random()
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      logger.warn('SecureRandom: Using deterministic fallback for development/testing ONLY');
      // Use a simple counter-based approach for testing (NOT secure)
      const timestamp = Date.now();
      const seed = (timestamp * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    // In production: throw error instead of using insecure fallback
    throw error;
  }

  /**
   * Génère un entier aléatoire sécurisé dans une plage
   */
  static randomInt(min: number, max: number): number {
    if (min >= max) {
      throw new Error('SecureRandom: min doit être inférieur à max');
    }
    
    const range = max - min;
    return Math.floor(this.random() * range) + min;
  }

  /**
   * Génère un nombre flottant aléatoire sécurisé dans une plage
   */
  static randomFloat(min: number, max: number): number {
    if (min >= max) {
      throw new Error('SecureRandom: min doit être inférieur à max');
    }
    
    return this.random() * (max - min) + min;
  }

  /**
   * Génère des bytes aléatoires sécurisés
   */
  static randomBytes(length: number): Uint8Array {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      return array;
    }

    // CRITICAL: Crypto API not available
    const error = new Error('SECURITY CRITICAL: crypto.getRandomValues not available. Cannot generate secure random bytes.');
    logger.error('SecureRandom: CRITICAL SECURITY FAILURE in randomBytes', error);

    // In development/test only: use deterministic fallback
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      logger.warn('SecureRandom: Using deterministic fallback for development/testing ONLY');
      const array = new Uint8Array(length);
      const timestamp = Date.now();
      for (let i = 0; i < length; i++) {
        // Deterministic pattern based on timestamp and index
        const seed = ((timestamp + i) * 9301 + 49297) % 233280;
        array[i] = (seed % 256);
      }
      return array;
    }

    // In production: throw error instead of using insecure fallback
    throw error;
  }

  /**
   * Sélectionne un élément aléatoire d'un tableau
   */
  static choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('SecureRandom: Le tableau ne peut pas être vide');
    }
    
    const index = this.randomInt(0, array.length);
    return array[index];
  }

  /**
   * Génère un UUID v4 sécurisé
   */
  static uuid(): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);

      // Version 4 UUID format
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32)
      ].join('-');
    }

    // CRITICAL: Crypto API not available
    const error = new Error('SECURITY CRITICAL: crypto.getRandomValues not available. Cannot generate secure UUID.');
    logger.error('SecureRandom: CRITICAL SECURITY FAILURE in uuid', error);

    // In development/test only: use timestamp-based UUID (NOT secure but deterministic)
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      logger.warn('SecureRandom: Using timestamp-based UUID for development/testing ONLY');
      const timestamp = Date.now();
      const timestampHex = timestamp.toString(16).padStart(12, '0');
      const counter = (Math.floor(timestamp / 1000) % 65536).toString(16).padStart(4, '0');
      return `${timestampHex.slice(0, 8)}-${timestampHex.slice(8, 12)}-4${counter.slice(0, 3)}-8${counter.slice(3, 4)}00-${timestampHex}`;
    }

    // In production: throw error instead of using insecure fallback
    throw error;
  }

  /**
   * Génère une chaîne aléatoire sécurisée
   */
  static randomString(length: number, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(this.randomInt(0, charset.length));
    }
    return result;
  }

  /**
   * Génère un ID court sécurisé pour les identifiants
   */
  static randomId(prefix = '', length = 8): string {
    const id = this.randomString(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
    return prefix ? `${prefix}_${id}` : id;
  }

  /**
   * Alias pour randomInt - génère un entier entre min et max (exclusif)
   */
  static between(min: number, max: number): number {
    return this.randomInt(min, max);
  }

  /**
   * Alias pour randomId - génère un ID de la longueur spécifiée
   */
  static generateId(length = 8): string {
    return this.randomId('', length);
  }
}

// Alias pour une migration facile depuis Math.random()
export const secureRandom = SecureRandom.random;
export const secureRandomInt = SecureRandom.randomInt;
export const secureRandomFloat = SecureRandom.randomFloat;