/**
 * Vérifie si une variable peut causer l'erreur "Cannot read properties of undefined"
 */
export declare function validateVariable(variable: any, variableName: string): void;
/**
 * Vérifie si un objet a des propriétés length avant de les utiliser
 */
export declare function validateLengthProperty(obj: Record<string, unknown>, objectName: string): boolean;
/**
 * Vérifie si une string peut être splitée
 */
export declare function validateSplitOperation(str: any, stringName: string): boolean;
/**
 * Mode debug pour traquer les erreurs potentielles
 * Utiliser uniquement en développement
 */
export declare function enableErrorValidation(isDevelopment?: boolean): (() => void) | void;
/**
 * Teste les corrections apportées
 */
export declare function runErrorTests(): void;
//# sourceMappingURL=errorValidation.d.ts.map