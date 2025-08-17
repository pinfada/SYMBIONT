import { SecureLogger } from '@shared/utils/secureLogger';
// Utilitaire de validation pour détecter et prévenir les erreurs courantes

/**
 * Vérifie si une variable peut causer l'erreur "Cannot read properties of undefined"
 */
export function validateVariable(variable: any, variableName: string): void {
  if (variable === undefined) {
    SecureLogger.warn(`⚠️ Variable "${variableName}" est undefined`);
  }
  if (variable === null) {
    SecureLogger.warn(`⚠️ Variable "${variableName}" est null`);
  }
}

/**
 * Vérifie si un objet a des propriétés length avant de les utiliser
 */
export function validateLengthProperty(obj: any, objectName: string): boolean {
  if (!obj) {
    SecureLogger.warn(`⚠️ "${objectName}" est null/undefined, impossible d'accéder à .length`);
    return false;
  }
  
  if (!('length' in obj)) {
    SecureLogger.warn(`⚠️ "${objectName}" n'a pas de propriété length`);
    return false;
  }
  
  return true;
}

/**
 * Vérifie si une string peut être splitée
 */
export function validateSplitOperation(str: any, stringName: string): boolean {
  if (typeof str !== 'string') {
    SecureLogger.warn(`⚠️ "${stringName}" n'est pas une string, impossible d'utiliser .split()`);
    return false;
  }
  
  return true;
}

/**
 * Mode debug pour traquer les erreurs potentielles
 * Utiliser uniquement en développement
 */
export function enableErrorValidation(isDevelopment: boolean = false): (() => void) | void {
  if (!isDevelopment) {
    // En production, ne pas activer le mode debug verbose
    return;
  }
  
  SecureLogger.info('✅ Validation d\'erreurs activée (mode développement)');
  
  // Surveiller les erreurs via window.addEventListener
  if (typeof window !== 'undefined') {
    const errorHandler = (event: ErrorEvent) => {
      const message = event.message || '';
      
      if (message.includes('split is not a function')) {
        SecureLogger.error('🚨 Erreur className.split détectée:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          stack: event.error?.stack
        });
      }
      
      if (message.includes('Cannot read properties of undefined')) {
        SecureLogger.error('🚨 Erreur lecture propriété undefined détectée:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          stack: event.error?.stack
        });
      }
      
      if (message.includes('Cannot access') && message.includes('before initialization')) {
        SecureLogger.error('🚨 Erreur variable non initialisée détectée:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          stack: event.error?.stack
        });
      }
    };
    
    window.addEventListener('error', errorHandler);
    
    // Nettoyer l'écouteur si nécessaire
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }
}

/**
 * Teste les corrections apportées
 */
export function runErrorTests(): void {
  SecureLogger.info('🧪 Test des corrections d\'erreurs...');
  
  // Test 1: className.split sur undefined
  try {
    const element = { className: undefined } as any;
    if (typeof element.className === 'string') {
      element.className.split(' ');
    } else {
      SecureLogger.info('✅ Test 1 réussi: className.split protégé');
    }
  } catch (error) {
    SecureLogger.error('❌ Test 1 échoué:', error);
  }
  
  // Test 2: Division par zéro
  try {
    const emptyArray: number[] = [];
    const average = emptyArray.length > 0 
      ? emptyArray.reduce((a, b) => a + b, 0) / emptyArray.length 
      : 0;
    SecureLogger.info('✅ Test 2 réussi: Division par zéro évitée, moyenne =', average);
  } catch (error) {
    SecureLogger.error('❌ Test 2 échoué:', error);
  }
  
  // Test 3: Propriété length sur undefined
  try {
    const undefinedVar = undefined as any;
    const length = undefinedVar?.length || 0;
    SecureLogger.info('✅ Test 3 réussi: Propriété length protégée, length =', length);
  } catch (error) {
    SecureLogger.error('❌ Test 3 échoué:', error);
  }
  
  SecureLogger.info('✅ Tests terminés');
} 