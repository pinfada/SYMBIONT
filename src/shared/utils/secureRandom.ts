import { SecureLogger } from '@shared/utils/secureLogger';
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
    
    // Fallback pour les environnements sans crypto
    SecureLogger.warn('SecureRandom: crypto.getRandomValues non disponible, utilisation de Math.random()');
    return Math.random();
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
    
    // Fallback pour les environnements sans crypto
    SecureLogger.warn('SecureRandom: crypto.getRandomValues non disponible, génération fallback');
    const array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
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
    
    // Fallback UUID generation
    SecureLogger.warn('SecureRandom: crypto.getRandomValues non disponible, UUID fallback');
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
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
}

// Alias pour une migration facile depuis Math.random()
export const secureRandom = SecureRandom.random;
export const secureRandomInt = SecureRandom.randomInt;
export const secureRandomFloat = SecureRandom.randomFloat;