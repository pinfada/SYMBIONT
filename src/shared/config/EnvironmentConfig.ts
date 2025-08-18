/**
 * Configuration d'environnement centralisée et sécurisée
 * Gère les variables d'environnement avec validation et fallbacks
 */

import { logger } from '../utils/secureLogger';

export interface SecurityConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  apiKey: string;
  adminApiKey: string;
  encryptionKey: string;
}

export interface ServerConfig {
  port: number;
  adminPort: number;
  corsOrigin: string;
  allowedHosts: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface DatabaseConfig {
  url: string;
  mongoUrl?: string;
  name: string;
}

export interface APIConfig {
  baseUrl: string;
  wsUrl: string;
  timeout: number;
}

export interface FeatureFlags {
  useRealMetrics: boolean;
  useRealDNA: boolean;
  useRealBehavior: boolean;
  useBackendAPI: boolean;
  enableDebugLogging: boolean;
  enablePerformanceProfiling: boolean;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'text';
  retentionDays: number;
}

export interface MonitoringConfig {
  enableMetrics: boolean;
  metricsEndpoint: string;
  metricsAuthToken?: string;
  enableTracing: boolean;
  tracingEndpoint?: string;
  traceSampleRate: number;
}

export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  security: SecurityConfig;
  server: ServerConfig;
  database: DatabaseConfig;
  api: APIConfig;
  features: FeatureFlags;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
}

export class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: AppConfig;
  private isValidated = false;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  /**
   * Charge la configuration depuis les variables d'environnement
   */
  private loadConfiguration(): AppConfig {
    return {
      environment: this.getEnvironment(),
      security: this.getSecurityConfig(),
      server: this.getServerConfig(),
      database: this.getDatabaseConfig(),
      api: this.getAPIConfig(),
      features: this.getFeatureFlags(),
      logging: this.getLoggingConfig(),
      monitoring: this.getMonitoringConfig()
    };
  }

  /**
   * Récupère une variable d'environnement avec validation
   */
  private getEnvVar(
    name: string, 
    required = true, 
    defaultValue?: string,
    validator?: (value: string) => boolean
  ): string {
    const value = process.env[name] || defaultValue;
    
    if (required && !value) {
      throw new Error(`Variable d'environnement requise manquante: ${name}`);
    }
    
    if (value && validator && !validator(value)) {
      throw new Error(`Variable d'environnement invalide: ${name}`);
    }
    
    return value || '';
  }

  /**
   * Récupère une variable numérique
   */
  private getEnvNumber(name: string, required = true, defaultValue?: number): number {
    const value = this.getEnvVar(name, required, defaultValue?.toString());
    const num = parseInt(value);
    
    if (isNaN(num)) {
      throw new Error(`Variable d'environnement ${name} doit être un nombre: ${value}`);
    }
    
    return num;
  }

  /**
   * Récupère une variable booléenne
   */
  private getEnvBoolean(name: string, defaultValue = false): boolean {
    const value = this.getEnvVar(name, false, defaultValue.toString());
    return value.toLowerCase() === 'true';
  }

  /**
   * Configuration environnement
   */
  private getEnvironment(): 'development' | 'staging' | 'production' {
    const env = this.getEnvVar('NODE_ENV', false, 'development');
    
    if (!['development', 'staging', 'production'].includes(env)) {
      logger.warn(`NODE_ENV invalide: ${env}, utilisation de 'development'`);
      return 'development';
    }
    
    return env as 'development' | 'staging' | 'production';
  }

  /**
   * Configuration sécurité
   */
  private getSecurityConfig(): SecurityConfig {
    return {
      jwtSecret: this.getEnvVar('JWT_SECRET', true, undefined, (v) => v.length >= 64),
      jwtRefreshSecret: this.getEnvVar('JWT_REFRESH_SECRET', true, undefined, (v) => v.length >= 64),
      apiKey: this.getEnvVar('SYMBIONT_API_KEY', true, undefined, (v) => v.length >= 32),
      adminApiKey: this.getEnvVar('ADMIN_API_KEY', true, undefined, (v) => v.length >= 32),
      encryptionKey: this.getEnvVar('ENCRYPTION_KEY', true, undefined, (v) => v.length >= 32)
    };
  }

  /**
   * Configuration serveur
   */
  private getServerConfig(): ServerConfig {
    return {
      port: this.getEnvNumber('PORT', false, 3001),
      adminPort: this.getEnvNumber('ADMIN_PORT', false, 8090),
      corsOrigin: this.getEnvVar('CORS_ORIGIN', false, 'http://localhost:3000'),
      allowedHosts: this.getEnvVar('ALLOWED_HOSTS', false, 'localhost').split(','),
      rateLimit: {
        windowMs: this.getEnvNumber('RATE_LIMIT_WINDOW_MS', false, 900000), // 15 min
        maxRequests: this.getEnvNumber('RATE_LIMIT_MAX_REQUESTS', false, 100)
      }
    };
  }

  /**
   * Configuration base de données
   */
  private getDatabaseConfig(): DatabaseConfig {
    return {
      url: this.getEnvVar('DATABASE_URL', true),
      mongoUrl: this.getEnvVar('MONGO_URL', false),
      name: this.getEnvVar('DB_NAME', false, 'symbiont')
    };
  }

  /**
   * Configuration API
   */
  private getAPIConfig(): APIConfig {
    return {
      baseUrl: this.getEnvVar('SYMBIONT_API_URL', false, 'http://localhost:3001'),
      wsUrl: this.getEnvVar('SYMBIONT_WS_URL', false, 'ws://localhost:3001'),
      timeout: this.getEnvNumber('API_TIMEOUT_MS', false, 30000)
    };
  }

  /**
   * Feature flags
   */
  private getFeatureFlags(): FeatureFlags {
    return {
      useRealMetrics: this.getEnvBoolean('USE_REAL_METRICS', true),
      useRealDNA: this.getEnvBoolean('USE_REAL_DNA', true),
      useRealBehavior: this.getEnvBoolean('USE_REAL_BEHAVIOR', true),
      useBackendAPI: this.getEnvBoolean('USE_BACKEND_API', true),
      enableDebugLogging: this.getEnvBoolean('ENABLE_DEBUG_LOGGING', false),
      enablePerformanceProfiling: this.getEnvBoolean('ENABLE_PERFORMANCE_PROFILING', false)
    };
  }

  /**
   * Configuration logging
   */
  private getLoggingConfig(): LoggingConfig {
    const level = this.getEnvVar('LOG_LEVEL', false, 'info');
    const validLevels = ['error', 'warn', 'info', 'debug'];
    
    return {
      level: validLevels.includes(level) ? level as any : 'info',
      format: this.getEnvVar('LOG_FORMAT', false, 'json') as 'json' | 'text',
      retentionDays: this.getEnvNumber('LOG_RETENTION_DAYS', false, 30)
    };
  }

  /**
   * Configuration monitoring
   */
  private getMonitoringConfig(): MonitoringConfig {
    return {
      enableMetrics: this.getEnvBoolean('ENABLE_METRICS', true),
      metricsEndpoint: this.getEnvVar('METRICS_ENDPOINT', false, '/metrics'),
      metricsAuthToken: this.getEnvVar('METRICS_AUTH_TOKEN', false),
      enableTracing: this.getEnvBoolean('ENABLE_TRACING', false),
      tracingEndpoint: this.getEnvVar('JAEGER_ENDPOINT', false),
      traceSampleRate: parseFloat(this.getEnvVar('TRACE_SAMPLE_RATE', false, '0.1'))
    };
  }

  /**
   * Valide la configuration
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Validation sécurité critique en production
      if (this.config.environment === 'production') {
        if (this.config.features.enableDebugLogging) {
          errors.push('Debug logging activé en production');
        }
        
        if (this.config.api.baseUrl.startsWith('http://')) {
          errors.push('URL API non sécurisée (HTTP) en production');
        }
        
        if (this.config.server.corsOrigin === '*') {
          errors.push('CORS_ORIGIN wildcarde dangereux en production');
        }
      }
      
      // Validation secrets
      const secrets = [
        this.config.security.jwtSecret,
        this.config.security.jwtRefreshSecret,
        this.config.security.apiKey,
        this.config.security.adminApiKey,
        this.config.security.encryptionKey
      ];
      
      secrets.forEach((secret, index) => {
        if (secret.includes('changeme') || secret.includes('default')) {
          errors.push(`Secret ${index + 1} contient une valeur par défaut dangereuse`);
        }
      });
      
      this.isValidated = errors.length === 0;
      
      if (this.isValidated) {
        logger.info('Configuration d\'environnement validée', {
          environment: this.config.environment,
          features: Object.keys(this.config.features).filter(key => 
            this.config.features[key as keyof FeatureFlags]
          )
        });
      } else {
        logger.error('Configuration d\'environnement invalide', { errors });
      }
      
      return { valid: this.isValidated, errors };
      
    } catch (_error) {
      const errorMsg = `Erreur validation configuration: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      logger.error(errorMsg);
      return { valid: false, errors };
    }
  }

  /**
   * Accesseurs publics
   */
  public getConfig(): AppConfig {
    if (!this.isValidated) {
      logger.warn('Configuration accédée avant validation');
    }
    return { ...this.config };
  }

  public getSecurity(): SecurityConfig {
    return { ...this.config.security };
  }

  public getServer(): ServerConfig {
    return { ...this.config.server };
  }

  public getFeatures(): FeatureFlags {
    return { ...this.config.features };
  }

  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  /**
   * Redémarre la configuration (pour les tests)
   */
  public reload(): void {
    this.config = this.loadConfiguration();
    this.isValidated = false;
  }
}

// Export de l'instance singleton
export const appConfig = EnvironmentConfig.getInstance();