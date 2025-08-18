// Utilitaires pour opérations sécurisées et éviter les erreurs de type

/**
 * Calcule la moyenne d'un tableau de nombres de manière sécurisée
 */
export function safeAverage(numbers: number[]): number {
  if (!numbers || numbers.length === 0) {
    return 0;
  }
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

/**
 * Vérifie si une chaîne de caractères est valide avant d'appeler split()
 */
export function safeSplit(str: unknown, separator: string): string[] {
  if (typeof str !== 'string') {
    return [];
  }
  return str.split(separator);
}

/**
 * Vérifie si une valeur a une propriété length avant d'y accéder
 */
export function safeLength(value: unknown): number {
  if (!value || typeof value !== 'object') {
    return 0;
  }
  
  if ('length' in value && typeof (value as any).length === 'number') {
    return (value as any).length;
  }
  
  return 0;
}

/**
 * Calcule un ratio de manière sécurisée en évitant la division par zéro
 */
export function safeRatio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

/**
 * Vérifie si un élément DOM a une className valide
 */
export function safeGetClasses(element: Element | null | undefined): string[] {
  if (!element) {
    return [];
  }
  
  // Vérifier si c'est bien un élément DOM
  if (!(element instanceof Element)) {
    return [];
  }
  
  // Vérifier que className existe et est une string
  if (!element.className || typeof element.className !== 'string') {
    return [];
  }
  
  try {
    return element.className.split(' ').filter(c => c && c.length > 0);
  } catch {
    return [];
  }
}

/**
 * Récupère une sélection de texte de manière sécurisée
 */
export function safeGetSelection(): string {
  try {
    // Vérifier que nous sommes dans un environnement DOM
    if (typeof document === 'undefined' || !document.getSelection) {
      return '';
    }
    
    const selection = document.getSelection();
    if (!selection) {
      return '';
    }
    
    const text = selection.toString();
    return typeof text === 'string' ? text : '';
  } catch {
    return '';
  }
}

/**
 * Vérifie si un tableau contient des éléments avant de le traiter
 */
export function safeArrayOperation<T>(
  array: T[] | null | undefined,
  operation: (arr: T[]) => T,
  defaultValue: T
): T {
  if (!array || array.length === 0) {
    return defaultValue;
  }
  return operation(array);
}

/**
 * Parse un objet JSON de manière sécurisée
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return defaultValue;
    }
    
    const parsed = JSON.parse(jsonString);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Récupère une propriété d'objet de manière sécurisée
 */
export function safeGet<T>(obj: Record<string, unknown>, path: string, defaultValue: T): T {
  try {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current !== undefined ? current : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Limite un tableau à une taille maximale de manière sécurisée
 */
export function safeLimitArray<T>(array: T[], maxSize: number): T[] {
  if (!array || array.length === 0) {
    return [];
  }
  
  if (array.length <= maxSize) {
    return array;
  }
  
  return array.slice(-maxSize);
} 