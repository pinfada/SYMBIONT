/**
 * Calcule la moyenne d'un tableau de nombres de manière sécurisée
 */
export declare function safeAverage(numbers: number[]): number;
/**
 * Vérifie si une chaîne de caractères est valide avant d'appeler split()
 */
export declare function safeSplit(str: unknown, separator: string): string[];
/**
 * Vérifie si une valeur a une propriété length avant d'y accéder
 */
export declare function safeLength(value: unknown): number;
/**
 * Calcule un ratio de manière sécurisée en évitant la division par zéro
 */
export declare function safeRatio(numerator: number, denominator: number): number;
/**
 * Vérifie si un élément DOM a une className valide
 */
export declare function safeGetClasses(element: Element | null | undefined): string[];
/**
 * Récupère une sélection de texte de manière sécurisée
 */
export declare function safeGetSelection(): string;
/**
 * Vérifie si un tableau contient des éléments avant de le traiter
 */
export declare function safeArrayOperation<T>(array: T[] | null | undefined, operation: (arr: T[]) => T, defaultValue: T): T;
/**
 * Parse un objet JSON de manière sécurisée
 */
export declare function safeJsonParse<T>(jsonString: string, defaultValue: T): T;
/**
 * Récupère une propriété d'objet de manière sécurisée
 */
export declare function safeGet<T>(obj: Record<string, unknown>, path: string, defaultValue: T): T;
/**
 * Limite un tableau à une taille maximale de manière sécurisée
 */
export declare function safeLimitArray<T>(array: T[], maxSize: number): T[];
//# sourceMappingURL=safeOperations.d.ts.map