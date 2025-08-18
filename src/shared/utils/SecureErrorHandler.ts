/**
 * Gestionnaire d'erreurs sécurisé pour éviter l'exposition d'informations sensibles
 * Améliore la sécurité selon les recommandations d'audit
 */
import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';

export class SecureError extends Error {
  public readonly errorId: string;
  public readonly timestamp: number;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context?: string;

  constructor(
    message: string,
    category: ErrorCategory = 'GENERAL',
    severity: ErrorSeverity = 'MEDIUM',
    context?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SecureError';
    this.errorId = this.generateErrorId();
    this.timestamp = Date.now();
    this.category = category;
    this.severity = severity;
    this.context = context;
  }

  private generateErrorId(): string {
    // Générer un ID d'erreur unique pour le suivi sans exposer d'informations
    const timestamp = Date.now().toString(36);
    const random = Math.floor(SecureRandom.random() * 1000000).toString(36);
    return `ERR_${timestamp}_${random}`.toUpperCase();
  }

  toSafeObject(): SafeErrorObject {
    return {
      errorId: this.errorId,
      timestamp: this.timestamp,
      category: this.category,
      severity: this.severity,
      message: this.getSafeMessage(),
      context: this.context
    };
  }

  private getSafeMessage(): string {
    // Retourner un message générique pour la production, détaillé pour le développement
    if (process.env.NODE_ENV === 'production') {
      return this.getGenericMessage();
    }
    return this.message;
  }

  private getGenericMessage(): string {
    const genericMessages: Record<ErrorCategory, string> = {
      AUTHENTICATION: 'Authentication failed',
      AUTHORIZATION: 'Access denied',
      VALIDATION: 'Invalid input provided',
      NETWORK: 'Network communication error',
      STORAGE: 'Data storage error',
      CRYPTO: 'Cryptographic operation failed',
      PERFORMANCE: 'Performance threshold exceeded',
      GENERAL: 'An error occurred while processing your request'
    };

    return genericMessages[this.category] || genericMessages.GENERAL;
  }
}

export type ErrorCategory = 
  | 'AUTHENTICATION' 
  | 'AUTHORIZATION' 
  | 'VALIDATION' 
  | 'NETWORK' 
  | 'STORAGE' 
  | 'CRYPTO' 
  | 'PERFORMANCE' 
  | 'GENERAL';

export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SafeErrorObject {
  errorId: string;
  timestamp: number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  context?: string;
}

export class SecureErrorHandler {
  private static readonly MAX_STACK_DEPTH = 10;
  private static readonly SENSITIVE_PATTERNS = [
    /password/gi,
    /token/gi,
    /secret/gi,
    /key/gi,
    /auth/gi,
    /session/gi,
    /cookie/gi,
    /api[_-]?key/gi,
    /bearer\s+[\w\-._]+/gi,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, // emails
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/gi, // credit cards pattern
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/gi, // IP addresses
  ];

  /**
   * Traite une erreur de manière sécurisée
   */
  static handleError(
    error: Error | unknown,
    category: ErrorCategory = 'GENERAL',
    context?: string,
    additionalInfo?: Record<string, unknown>
  ): SecureError {
    const secureError = this.createSecureError(error, category, context);
    
    // Logger l'erreur avec informations détaillées en interne
    this.logErrorSecurely(secureError, error, additionalInfo);
    
    // Déclencher des actions basées sur la sévérité
    this.handleErrorBySeverity(secureError);
    
    return secureError;
  }

  /**
   * Crée une erreur sécurisée à partir d'une erreur standard
   */
  private static createSecureError(
    error: Error | unknown,
    category: ErrorCategory,
    context?: string
  ): SecureError {
    if (error instanceof SecureError) {
      return error;
    }

    const severity = this.determineSeverity(error, category);
    const message = this.extractSafeMessage(error);
    const originalError = error instanceof Error ? error : undefined;

    return new SecureError(message, category, severity, context, originalError);
  }

  /**
   * Détermine la sévérité de l'erreur
   */
  private static determineSeverity(
    error: Error | unknown,
    category: ErrorCategory
  ): ErrorSeverity {
    // Sévérité basée sur la catégorie
    const categorySeverity: Record<ErrorCategory, ErrorSeverity> = {
      AUTHENTICATION: 'HIGH',
      AUTHORIZATION: 'HIGH',
      CRYPTO: 'CRITICAL',
      VALIDATION: 'MEDIUM',
      NETWORK: 'MEDIUM',
      STORAGE: 'MEDIUM',
      PERFORMANCE: 'LOW',
      GENERAL: 'MEDIUM'
    };

    let severity = categorySeverity[category];

    // Ajuster selon le type d'erreur
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes('security')) {
        severity = 'CRITICAL';
      } else if (error.message.toLowerCase().includes('unauthorized')) {
        severity = 'HIGH';
      } else if (error.message.toLowerCase().includes('not found')) {
        severity = 'LOW';
      }
    }

    return severity;
  }

  /**
   * Extrait un message sûr de l'erreur en supprimant les informations sensibles
   */
  private static extractSafeMessage(error: Error | unknown): string {
    let message = 'Unknown error occurred';

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String((error as any).message);
    }

    // Supprimer les informations potentiellement sensibles
    return this.sanitizeErrorMessage(message);
  }

  /**
   * Sanitise le message d'erreur en supprimant les informations sensibles
   */
  private static sanitizeErrorMessage(message: string): string {
    let sanitized = message;

    // Remplacer les patterns sensibles par des placeholders
    for (const pattern of this.SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Supprimer les paths absolus qui pourraient révéler la structure
    sanitized = sanitized.replace(/[A-Z]:\\[^\\]+\\.*|\/[^\/]+\/.*/, '[PATH_REDACTED]');
    
    // Supprimer les stack traces détaillées
    const lines = sanitized.split('\n');
    if (lines.length > 3) {
      sanitized = lines.slice(0, 3).join('\n') + '\n[STACK_TRUNCATED]';
    }

    return sanitized;
  }

  /**
   * Logger l'erreur de manière sécurisée
   */
  private static logErrorSecurely(
    secureError: SecureError,
    originalError: Error | unknown,
    additionalInfo?: Record<string, unknown>
  ): void {
    const logData = {
      errorId: secureError.errorId,
      category: secureError.category,
      severity: secureError.severity,
      timestamp: secureError.timestamp,
      context: secureError.context,
      ...additionalInfo
    };

    // En développement, inclure plus de détails
    if (process.env.NODE_ENV === 'development') {
      logData.originalMessage = originalError instanceof Error ? originalError.message : String(originalError);
      logData.stack = originalError instanceof Error ? this.sanitizeStack(originalError.stack) : undefined;
    }

    // Logger selon la sévérité
    switch (secureError.severity) {
      case 'CRITICAL':
        logger.error(`CRITICAL ERROR: ${secureError.message}`, logData, secureError.context || 'error-handler');
        break;
      case 'HIGH':
        logger.error(`HIGH SEVERITY: ${secureError.message}`, logData, secureError.context || 'error-handler');
        break;
      case 'MEDIUM':
        logger.warn(`MEDIUM SEVERITY: ${secureError.message}`, logData, secureError.context || 'error-handler');
        break;
      case 'LOW':
        logger.info(`LOW SEVERITY: ${secureError.message}`, logData, secureError.context || 'error-handler');
        break;
    }
  }

  /**
   * Sanitise la stack trace
   */
  private static sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;

    const lines = stack.split('\n');
    const sanitizedLines = lines
      .slice(0, this.MAX_STACK_DEPTH)
      .map(line => {
        // Supprimer les paths absolus
        return line.replace(/[A-Z]:\\[^\\]+\\.*|\/[^\/]+\/.*/, '[PATH]');
      });

    return sanitizedLines.join('\n');
  }

  /**
   * Actions à prendre selon la sévérité
   */
  private static handleErrorBySeverity(secureError: SecureError): void {
    switch (secureError.severity) {
      case 'CRITICAL':
        // En production, cela pourrait déclencher des alertes
        this.alertSecurityTeam(secureError);
        break;
      case 'HIGH':
        // Monitoring et alertes
        this.incrementErrorCounter(secureError.category);
        break;
      case 'MEDIUM':
        // Tracking pour analyse
        this.trackErrorPattern(secureError);
        break;
      case 'LOW':
        // Simple logging
        break;
    }
  }

  /**
   * Alerte l'équipe de sécurité (simulation)
   */
  private static alertSecurityTeam(secureError: SecureError): void {
    logger.error('SECURITY ALERT: Critical error detected', {
      errorId: secureError.errorId,
      category: secureError.category,
      timestamp: secureError.timestamp
    }, 'security-alert');
    
    // En production, cela enverrait une alerte réelle
    // await sendAlert('security-team', secureError.toSafeObject());
  }

  /**
   * Incrémente le compteur d'erreurs
   */
  private static incrementErrorCounter(category: ErrorCategory): void {
    // En production, cela utiliserait un système de métriques comme Prometheus
    logger.info('Error counter incremented', { category }, 'error-metrics');
  }

  /**
   * Track les patterns d'erreurs
   */
  private static trackErrorPattern(secureError: SecureError): void {
    // En production, cela analyserait les patterns pour détecter des attaques
    logger.info('Error pattern tracked', {
      errorId: secureError.errorId,
      category: secureError.category,
      context: secureError.context
    }, 'error-analytics');
  }

  /**
   * Gère les erreurs async de manière sécurisée
   */
  static async handleAsyncError<T>(
    operation: () => Promise<T>,
    category: ErrorCategory = 'GENERAL',
    context?: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (_error) {
      this.handleError(error, category, context);
      return null;
    }
  }

  /**
   * Wrap une fonction pour la gestion d'erreurs sécurisée
   */
  static wrapFunction<T extends (...args: unknown[]) => any>(
    fn: T,
    category: ErrorCategory = 'GENERAL',
    context?: string
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);
        
        // Si la fonction retourne une Promise, gérer les erreurs async
        if (result && typeof result.then === 'function') {
          return result.catch((error: Error) => {
            throw this.handleError(error, category, context);
          });
        }
        
        return result;
      } catch (_error) {
        throw this.handleError(error, category, context);
      }
    }) as T;
  }

  /**
   * Crée une réponse d'erreur sécurisée pour les APIs
   */
  static createApiErrorResponse(
    error: SecureError,
    includeErrorId: boolean = true
  ): ApiErrorResponse {
    const response: ApiErrorResponse = {
      success: false,
      message: error.getSafeMessage(),
      timestamp: error.timestamp
    };

    if (includeErrorId) {
      response.errorId = error.errorId;
    }

    // En développement, inclure plus de détails
    if (process.env.NODE_ENV === 'development') {
      response.category = error.category;
      response.severity = error.severity;
    }

    return response;
  }

  /**
   * Valide si une erreur doit être exposée publiquement
   */
  static shouldExposeError(error: SecureError): boolean {
    // Ne jamais exposer les erreurs critiques de sécurité
    if (error.category === 'CRYPTO' || error.category === 'AUTHENTICATION') {
      return false;
    }

    // Ne pas exposer les erreurs haute sévérité en production
    if (process.env.NODE_ENV === 'production' && error.severity === 'HIGH') {
      return false;
    }

    return true;
  }
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  timestamp: number;
  errorId?: string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
}

// Fonctions utilitaires exportées
export const handleError = SecureErrorHandler.handleError;
export const handleAsyncError = SecureErrorHandler.handleAsyncError;
export const wrapFunction = SecureErrorHandler.wrapFunction;

// Décorateur pour la gestion automatique d'erreurs
export function HandleErrors(category: ErrorCategory = 'GENERAL', context?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      try {
        const result = originalMethod.apply(this, args);
        
        if (result && typeof result.then === 'function') {
          return result.catch((error: Error) => {
            throw SecureErrorHandler.handleError(error, category, context || `${target.constructor.name}.${propertyKey}`);
          });
        }
        
        return result;
      } catch (_error) {
        throw SecureErrorHandler.handleError(error, category, context || `${target.constructor.name}.${propertyKey}`);
      }
    };

    return descriptor;
  };
}