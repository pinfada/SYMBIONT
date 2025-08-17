/**
 * Système de logging sécurisé
 * Remplace console.log avec protection des données sensibles et gestion des niveaux
 */
export declare enum LogLevel {
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
    data?: any;
    context?: string | undefined;
    sanitized: boolean;
}
export declare class SecureLogger {
    private static instance;
    private config;
    private logEntries;
    private static readonly SENSITIVE_PATTERNS;
    private constructor();
    static getInstance(config?: Partial<LogConfig>): SecureLogger;
    private isProduction;
    /**
     * Sanitise les données pour supprimer les informations sensibles
     */
    private sanitizeData;
    private sanitizeString;
    private isSensitiveField;
    private formatMessage;
    private shouldLog;
    private log;
    trace(message: string, data?: any, context?: string): void;
    debug(message: string, data?: any, context?: string): void;
    info(message: string, data?: any, context?: string): void;
    warn(message: string, data?: any, context?: string): void;
    error(message: string, data?: any, context?: string): void;
    fatal(message: string, data?: any, context?: string): void;
    setLevel(level: LogLevel): void;
    enableConsole(enable: boolean): void;
    getLogs(level?: LogLevel): LogEntry[];
    clearLogs(): void;
    exportLogs(): string;
}
export declare const logger: SecureLogger;
export declare const secureLog: (message: string, data?: any, context?: string) => void;
export declare const secureWarn: (message: string, data?: any, context?: string) => void;
export declare const secureError: (message: string, data?: any, context?: string) => void;
export declare const secureDebug: (message: string, data?: any, context?: string) => void;
export {};
//# sourceMappingURL=secureLogger.d.ts.map