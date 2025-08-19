/**
 * Système de logging sécurisé
 * Remplace console.log avec protection des données sensibles et gestion des niveaux
 */

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  sensitiveFields: string[];
  productionMode: boolean;
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
  context?: string | undefined;
  sanitized: boolean;
}

export class SecureLogger {
  private static instance: SecureLogger;
  private config: LogConfig;
  private logEntries: LogEntry[] = [];
  
  // Patterns pour détecter les données sensibles
  private static readonly SENSITIVE_PATTERNS = [
    /password/i,
    /token/i,
    /key/i,
    /secret/i,
    /auth/i,
    /credential/i,
    /session/i,
    /cookie/i,
    /jwt/i,
    /bearer/i,
    /api[_-]?key/i,
    /access[_-]?token/i,
    /refresh[_-]?token/i,
    /private[_-]?key/i,
    /\b[A-Za-z0-9+/]{32,}={0,2}\b/, // Base64
    /\b[0-9a-f]{32,}\b/i, // Hex strings
    /\b[0-9]{4}[_-]?[0-9]{4}[_-]?[0-9]{4}[_-]?[0-9]{4}\b/, // Credit card pattern
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
  ];

  private constructor(config: Partial<LogConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: !this.isProduction(),
      enableStorage: true,
      maxStorageEntries: 1000,
      sensitiveFields: ['password', 'token', 'key', 'secret', 'auth'],
      productionMode: this.isProduction(),
      ...config
    };
  }

  static getInstance(config?: Partial<LogConfig>): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger(config);
    }
    return SecureLogger.instance;
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production' || 
           (typeof chrome !== 'undefined' && typeof chrome.runtime?.getManifest === 'function');
  }

  /**
   * Sanitise les données pour supprimer les informations sensibles
   */
  private sanitizeData(data: unknown): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        return data.map(item => this.sanitizeData(item));
      }

      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveField(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  private sanitizeString(str: string): string {
    let sanitized = str;
    
    for (const pattern of SecureLogger.SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    
    return sanitized;
  }

  private isSensitiveField(fieldName: string): boolean {
    return this.config.sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }

  private formatMessage(level: LogLevel, message: string, data?: any, context?: string): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const contextStr = context ? ` [${context}]` : '';
    const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    
    return `[${timestamp}] ${levelName}${contextStr}: ${message}${dataStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private log(level: LogLevel, message: string, data?: any, context?: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const sanitizedMessage = this.sanitizeString(message);

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: sanitizedMessage,
      data: sanitizedData,
      context,
      sanitized: true
    };

    // Stockage des logs
    if (this.config.enableStorage) {
      this.logEntries.push(logEntry);
      
      // Limiter le nombre d'entrées en mémoire
      if (this.logEntries.length > this.config.maxStorageEntries) {
        this.logEntries = this.logEntries.slice(-this.config.maxStorageEntries);
      }
    }

    // Affichage console (seulement en développement par défaut)
    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(level, sanitizedMessage, sanitizedData, context);
      
      switch (level) {
        case LogLevel.TRACE:
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(formattedMessage);
          break;
      }
    }
  }

  // Méthodes publiques de logging
  trace(message: string, data?: any, context?: string): void {
    this.log(LogLevel.TRACE, message, data, context);
  }

  debug(message: string, data?: any, context?: string): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  info(message: string, data?: any, context?: string): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  warn(message: string, data?: any, context?: string): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  error(message: string, data?: any, context?: string): void {
    this.log(LogLevel.ERROR, message, data, context);
  }

  fatal(message: string, data?: any, context?: string): void {
    this.log(LogLevel.FATAL, message, data, context);
  }

  // Méthodes utilitaires
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  enableConsole(enable: boolean): void {
    this.config.enableConsole = enable;
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logEntries.filter(entry => entry.level >= level);
    }
    return [...this.logEntries];
  }

  clearLogs(): void {
    this.logEntries = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logEntries, null, 2);
  }
}

// Instance globale pour un usage facile
export const logger = SecureLogger.getInstance();

// Aliases pour migration facile depuis console.log
export const secureLog = logger.info.bind(logger);
export const secureWarn = logger.warn.bind(logger);
export const secureError = logger.error.bind(logger);
export const secureDebug = logger.debug.bind(logger);