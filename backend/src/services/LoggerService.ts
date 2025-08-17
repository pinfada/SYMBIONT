// Logger Service - Production Ready
export class LoggerService {
  private static instance: LoggerService;
  
  private constructor() {}
  
  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }
  
  info(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      // Utilisation de console.error pour éviter les fuites de données en production
      console.error(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  }
  
  error(message: string, error?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
    }
  }
  
  warn(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  }
  
  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  }
} 