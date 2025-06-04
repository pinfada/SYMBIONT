import { ErrorContext, ValidationResult } from '../../types/core';
export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export interface ErrorMetrics {
    errorCount: number;
    lastErrorTime: number;
    errorsByComponent: Map<string, number>;
    errorsByMethod: Map<string, number>;
    recoveryAttempts: number;
    recoverySuccesses: number;
}
export interface ErrorRecoveryStrategy {
    maxRetries: number;
    backoffMs: number;
    fallbackValue?: unknown;
    shouldRetry: (error: Error, attempt: number) => boolean;
}
export declare class ErrorHandler {
    private static instance;
    private metrics;
    private errorQueue;
    private maxQueueSize;
    private logLevel;
    private constructor();
    static getInstance(): ErrorHandler;
    /**
     * Configure le niveau de log
     */
    setLogLevel(level: LogLevel): void;
    /**
     * Enregistre une erreur avec contexte
     */
    logError(context: ErrorContext): void;
    /**
     * Enregistre une erreur avec informations minimales
     */
    logSimpleError(component: string, method: string, error: any, level?: 'debug' | 'info' | 'warning' | 'error', context?: any): void;
    /**
     * Validation avec retour structuré
     */
    validateRequired<T>(value: T | null | undefined, fieldName: string, component: string, method: string): ValidationResult;
    /**
     * Valide le type et les contraintes d'une valeur
     */
    validateType<T>(value: unknown, expectedType: string, constraints: {
        min?: number;
        max?: number;
        required?: boolean;
        pattern?: RegExp;
    } | undefined, fieldName: string, component: string, method: string): ValidationResult;
    /**
     * Exécute une opération avec retry automatique
     */
    withRetry<T>(operation: () => Promise<T>, strategy: ErrorRecoveryStrategy, context: {
        component: string;
        method: string;
    }): Promise<T>;
    /**
     * Wrapper safe pour les opérations qui peuvent lever des exceptions
     */
    safeExecute<T>(operation: () => T, fallbackValue: T, context: {
        component: string;
        method: string;
    }): T;
    /**
     * Wrapper safe pour les opérations async
     */
    safeExecuteAsync<T>(operation: () => Promise<T>, fallbackValue: T, context: {
        component: string;
        method: string;
    }): Promise<T>;
    /**
     * Récupère les métriques d'erreurs
     */
    getMetrics(): ErrorMetrics;
    /**
     * Récupère les erreurs récentes
     */
    getRecentErrors(maxCount?: number): ErrorContext[];
    /**
     * Nettoie les métriques et la queue
     */
    reset(): void;
    private updateMetrics;
    private addToQueue;
    private outputError;
    private shouldLog;
    private delay;
    private recordError;
}
export declare const errorHandler: ErrorHandler;
//# sourceMappingURL=ErrorHandler.d.ts.map