/**
 * Génère un UUID v4 avec fallback pour les environnements sans crypto.randomUUID
 */
export function generateUUID(): string {
  // Essayer d'abord crypto.randomUUID si disponible
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      console.warn('crypto.randomUUID failed, using fallback:', error);
    }
  }

  // Fallback pour les environnements qui ne supportent pas crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
 * Sinon utilise Math.random() comme fallback
 */
export function generateSecureUUID(): string {
  if (isCryptoUUIDAvailable()) {
    return crypto.randomUUID();
  }

  // Fallback sécurisé utilisant crypto.getRandomValues si disponible
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    // Version 4 UUID format
    array[6] = (array[6] & 0x0f) | 0x40; // version
    array[8] = (array[8] & 0x3f) | 0x80; // variant
    
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-');
  }

  // Dernier recours : Math.random()
  console.warn('Using Math.random() for UUID generation - not cryptographically secure');
  return generateUUID();
} 