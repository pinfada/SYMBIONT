// Système de gestion d'erreurs centralisé pour SYMBIONT

import { ErrorContext, ValidationResult } from '../../types/core';
import { logger } from '@shared/utils/secureLogger';

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

export class ErrorHandler {
  private static instance: ErrorHandler | null = null;
  private metrics: ErrorMetrics;
  private errorQueue: ErrorContext[] = [];
  private maxQueueSize = 1000;
  private logLevel: LogLevel = 'warning';

  private constructor() {
    this.metrics = {
      errorCount: 0,
      lastErrorTime: 0,
      errorsByComponent: new Map(),
      errorsByMethod: new Map(),
      recoveryAttempts: 0,
      recoverySuccesses: 0
    };
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Configure le niveau de log
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Enregistre une erreur avec contexte
   */
  public logError(context: ErrorContext): void {
    this.updateMetrics(context);
    this.addToQueue(context);
    this.outputError(context);
  }

  /**
   * Enregistre une erreur avec informations minimales
   */
  public logSimpleError(
    component: string,
    method: string,
    error: Error | unknown,
    level: 'debug' | 'info' | 'warning' | 'error' = 'error',
    context?: any
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    
    const errorContext: ErrorContext = {
      component,
      method,
      timestamp: Date.now(),
      severity: level,
      details: {
        message,
        context,
        originalError: error instanceof Error ? {
          name: error.name,
          stack: error.stack
        } : undefined
      }
    };

    // Simple console logging
    console[level === 'warning' ? 'warn' : level === 'debug' ? 'debug' : level === 'info' ? 'info' : 'error'](
      `[${component}][${method}] ${message}`,
      context || ''
    );

    // Store for metrics
    this.recordError(errorContext);
  }

  /**
   * Validation avec retour structuré
   */
  public validateRequired<T>(
    value: T | null | undefined, 
    fieldName: string,
    component: string,
    method: string
  ): ValidationResult {
    const errors: string[] = [];
    
    if (value === null || value === undefined) {
      errors.push(`${fieldName} is required`);
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      context: {
        component,
        method,
        timestamp: Date.now(),
        severity: errors.length > 0 ? 'error' : 'info'
      }
    };

    if (!result.isValid) {
      this.logError(result.context!);
    }

    return result;
  }

  /**
   * Valide le type et les contraintes d'une valeur
   */
  public validateType<T>(
    value: unknown,
    expectedType: string,
    constraints: {
      min?: number;
      max?: number;
      required?: boolean;
      pattern?: RegExp;
    } = {},
    fieldName: string,
    component: string,
    method: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required
    if (constraints.required && (value === null || value === undefined)) {
      errors.push(`${fieldName} is required`);
    }

    // Check type
    if (value !== null && value !== undefined) {
      const actualType = typeof value;
      if (actualType !== expectedType) {
        errors.push(`${fieldName} must be of type ${expectedType}, got ${actualType}`);
      }

      // Numeric constraints
      if (expectedType === 'number' && typeof value === 'number') {
        if (constraints.min !== undefined && value < constraints.min) {
          errors.push(`${fieldName} must be >= ${constraints.min}`);
        }
        if (constraints.max !== undefined && value > constraints.max) {
          errors.push(`${fieldName} must be <= ${constraints.max}`);
        }
        if (!Number.isFinite(value)) {
          errors.push(`${fieldName} must be a finite number`);
        }
      }

      // String constraints (longueur et pattern)
      if (expectedType === 'string' && typeof value === 'string') {
        if (constraints.min !== undefined && value.length < constraints.min) {
          errors.push(`${fieldName} must be at least ${constraints.min} characters long`);
        }
        if (constraints.max !== undefined && value.length > constraints.max) {
          errors.push(`${fieldName} must be at most ${constraints.max} characters long`);
        }
        if (constraints.pattern && !constraints.pattern.test(value)) {
          errors.push(`${fieldName} does not match required pattern`);
        }
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      context: {
        component,
        method,
        timestamp: Date.now(),
        severity: errors.length > 0 ? 'error' : 'warning',
        details: { fieldName, expectedType, actualValue: value }
      }
    };

    if (!result.isValid) {
      this.logError(result.context!);
    }

    return result;
  }

  /**
   * Exécute une opération avec retry automatique
   */
  public async withRetry<T>(
    operation: () => Promise<T>,
    strategy: ErrorRecoveryStrategy,
    context: { component: string; method: string }
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
      this.metrics.recoveryAttempts++;
      
      try {
        const result = await operation();
        if (attempt > 1) {
          this.metrics.recoverySuccesses++;
          this.logSimpleError(
            context.component, 
            context.method, 
            `Recovery successful after ${attempt} attempts`, 
            'info'
          );
        }
        return result;
      } catch (_error) {
        lastError = _error instanceof Error ? _error : new Error(String(_error));
        
        this.logSimpleError(
          context.component, 
          context.method, 
          `Attempt ${attempt}/${strategy.maxRetries} failed: ${lastError.message}`, 
          'warning'
        );

        if (attempt < strategy.maxRetries && strategy.shouldRetry(lastError, attempt)) {
          await this.delay(strategy.backoffMs * attempt);
          continue;
        }
        break;
      }
    }

    // All retries failed
    this.logSimpleError(
      context.component, 
      context.method, 
      `All ${strategy.maxRetries} retry attempts failed. Last error: ${lastError?.message}`, 
      'error'
    );

    if (strategy.fallbackValue !== undefined) {
      return strategy.fallbackValue as T;
    }

    throw lastError;
  }

  /**
   * Wrapper safe pour les opérations qui peuvent lever des exceptions
   */
  public safeExecute<T>(
    operation: () => T,
    fallbackValue: T,
    context: { component: string; method: string }
  ): T {
    try {
      return operation();
    } catch (_error) {
      this.logSimpleError(context.component, context.method, _error, 'error');
      return fallbackValue;
    }
  }

  /**
   * Wrapper safe pour les opérations async
   */
  public async safeExecuteAsync<T>(
    operation: () => Promise<T>,
    fallbackValue: T,
    context: { component: string; method: string }
  ): Promise<T> {
    try {
      return await operation();
    } catch (_error) {
      this.logSimpleError(context.component, context.method, _error, 'error');
      return fallbackValue;
    }
  }

  /**
   * Récupère les métriques d'erreurs
   */
  public getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Récupère les erreurs récentes
   */
  public getRecentErrors(maxCount: number = 50): ErrorContext[] {
    return this.errorQueue.slice(-maxCount);
  }

  /**
   * Nettoie les métriques et la queue
   */
  public reset(): void {
    this.metrics = {
      errorCount: 0,
      lastErrorTime: 0,
      errorsByComponent: new Map(),
      errorsByMethod: new Map(),
      recoveryAttempts: 0,
      recoverySuccesses: 0
    };
    this.errorQueue = [];
  }

  private updateMetrics(context: ErrorContext): void {
    this.metrics.errorCount++;
    this.metrics.lastErrorTime = context.timestamp;
    
    // Update component metrics
    const componentCount = this.metrics.errorsByComponent.get(context.component) || 0;
    this.metrics.errorsByComponent.set(context.component, componentCount + 1);
    
    // Update method metrics
    const methodKey = `${context.component}.${context.method}`;
    const methodCount = this.metrics.errorsByMethod.get(methodKey) || 0;
    this.metrics.errorsByMethod.set(methodKey, methodCount + 1);
  }

  private addToQueue(context: ErrorContext): void {
    this.errorQueue.push(context);
    
    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }
  }

  private outputError(context: ErrorContext): void {
    if (!this.shouldLog(context.severity)) {
      return;
    }

    const timestamp = new Date(context.timestamp).toISOString();
    const message = `[${timestamp}] ${context.severity.toUpperCase()} ${context.component}.${context.method}`;
    
    switch (context.severity) {
      case 'critical':
      case 'error':
        logger.error(message, context.details);
        break;
      case 'warning':
        logger.warn(message, context.details);
        break;
      case 'info':
        console.info(message, context.details);
        break;
      case 'debug':
        logger.debug(message, context.details);
        break;
    }
  }

  private shouldLog(severity: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warning', 'error', 'critical'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(severity);
    return messageLevelIndex >= currentLevelIndex;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordError(context: ErrorContext): void {
    this.updateMetrics(context);
    this.addToQueue(context);
  }
}

// Instance globale pour utilisation facile
export const errorHandler = ErrorHandler.getInstance(); 