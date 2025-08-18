import { logger } from '@shared/utils/secureLogger';
/**
 * FeatureFlagService - Gestion centralisée des feature flags
 * Sépare proprement le comportement dev/staging/production
 */

export interface FeatureFlags {
  USE_REAL_METRICS: boolean;
  USE_REAL_DNA: boolean;
  USE_REAL_BEHAVIOR: boolean;
  USE_BACKEND_API: boolean;
  ENABLE_DEBUG_LOGGING: boolean;
  ENABLE_PERFORMANCE_PROFILING: boolean;
  ENABLE_MOCK_DATA: boolean;
  ENABLE_SECURITY_AUDIT: boolean;
  ENABLE_ADVANCED_ANALYTICS: boolean;
  ENABLE_A_B_TESTING: boolean;
}

export type Environment = 'development' | 'staging' | 'production';

class FeatureFlagService {
  private static instance: FeatureFlagService;
  private environment: Environment;
  private flags: FeatureFlags;
  private overrides: Partial<FeatureFlags> = {};

  private constructor() {
    this.environment = this.detectEnvironment();
    this.flags = this.initializeFlags();
    this.loadOverrides();
  }

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * Détecte l'environnement actuel
   */
  private detectEnvironment(): Environment {
    // 1. Variable d'environnement explicite
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') return 'production';
    if (nodeEnv === 'staging') return 'staging';
    if (nodeEnv === 'development') return 'development';

    // 2. Détection par URL (pour extensions)
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      if (url.includes('staging')) return 'staging';
      if (url.includes('localhost') || url.includes('127.0.0.1')) return 'development';
      if (url.startsWith('chrome-extension://')) {
        // Extension en prod si pas de marqueur dev
        return url.includes('dev') ? 'development' : 'production';
      }
    }

    // 3. Fallback développement
    return 'development';
  }

  /**
   * Initialise les flags selon l'environnement
   */
  private initializeFlags(): FeatureFlags {
    const baseFlags: FeatureFlags = {
      USE_REAL_METRICS: false,
      USE_REAL_DNA: false,
      USE_REAL_BEHAVIOR: false,
      USE_BACKEND_API: false,
      ENABLE_DEBUG_LOGGING: false,
      ENABLE_PERFORMANCE_PROFILING: false,
      ENABLE_MOCK_DATA: true,
      ENABLE_SECURITY_AUDIT: false,
      ENABLE_ADVANCED_ANALYTICS: false,
      ENABLE_A_B_TESTING: false
    };

    switch (this.environment) {
      case 'development':
        return {
          ...baseFlags,
          ENABLE_DEBUG_LOGGING: true,
          ENABLE_PERFORMANCE_PROFILING: true,
          ENABLE_MOCK_DATA: true,
          ENABLE_SECURITY_AUDIT: true,
          // Possibilité d'activer vraies données en dev pour tests
          USE_REAL_METRICS: this.getEnvBoolean('USE_REAL_METRICS', false),
          USE_REAL_DNA: this.getEnvBoolean('USE_REAL_DNA', false),
          USE_REAL_BEHAVIOR: this.getEnvBoolean('USE_REAL_BEHAVIOR', false),
          USE_BACKEND_API: this.getEnvBoolean('USE_BACKEND_API', false)
        };

      case 'staging':
        return {
          ...baseFlags,
          USE_REAL_METRICS: true,
          USE_REAL_DNA: true,
          USE_REAL_BEHAVIOR: true,
          USE_BACKEND_API: true,
          ENABLE_DEBUG_LOGGING: false,
          ENABLE_PERFORMANCE_PROFILING: true,
          ENABLE_MOCK_DATA: false,
          ENABLE_SECURITY_AUDIT: true,
          ENABLE_ADVANCED_ANALYTICS: true,
          ENABLE_A_B_TESTING: true
        };

      case 'production':
        return {
          ...baseFlags,
          USE_REAL_METRICS: true,
          USE_REAL_DNA: true,
          USE_REAL_BEHAVIOR: true,
          USE_BACKEND_API: true,
          ENABLE_DEBUG_LOGGING: false,
          ENABLE_PERFORMANCE_PROFILING: false,
          ENABLE_MOCK_DATA: false,
          ENABLE_SECURITY_AUDIT: false,
          ENABLE_ADVANCED_ANALYTICS: true,
          ENABLE_A_B_TESTING: false // Désactivé par défaut en prod
        };

      default:
        return baseFlags;
    }
  }

  /**
   * Charge les overrides depuis localStorage et variables d'env
   */
  private loadOverrides(): void {
    // 1. Variables d'environnement
    Object.keys(this.flags).forEach(flag => {
      const envValue = process.env[`SYMBIONT_${flag}`];
      if (envValue !== undefined) {
        this.overrides[flag as keyof FeatureFlags] = envValue === 'true';
      }
    });

    // 2. localStorage (pour tests manuels en dev)
    if (this.environment === 'development' && typeof localStorage !== 'undefined') {
      Object.keys(this.flags).forEach(flag => {
        const storageKey = `symbiont_feature_${flag.toLowerCase()}`;
        const storageValue = localStorage.getItem(storageKey);
        if (storageValue !== null) {
          this.overrides[flag as keyof FeatureFlags] = storageValue === 'true';
        }
      });
    }
  }

  /**
   * Obtient la valeur d'un feature flag
   */
  isEnabled(flag: keyof FeatureFlags): boolean {
    // 1. Override explicite
    if (this.overrides[flag] !== undefined) {
      return this.overrides[flag]!;
    }

    // 2. Valeur par défaut selon environnement
    return this.flags[flag];
  }

  /**
   * Override temporaire d'un flag (dev uniquement)
   */
  setFlag(flag: keyof FeatureFlags, value: boolean): void {
    if (this.environment !== 'development') {
      logger.warn(`⚠️ Override de feature flag '${flag}' ignoré en ${this.environment}`);
      return;
    }

    this.overrides[flag] = value;
    
    // Sauvegarder en localStorage pour persistence
    if (typeof localStorage !== 'undefined') {
      const storageKey = `symbiont_feature_${flag.toLowerCase()}`;
      localStorage.setItem(storageKey, value.toString());
    }

    logger.info(`🔧 Feature flag '${flag}' défini à ${value}`);
  }

  /**
   * Remet à zéro tous les overrides
   */
  resetOverrides(): void {
    if (this.environment !== 'development') {
      logger.warn('⚠️ Reset des overrides ignoré en production');
      return;
    }

    this.overrides = {};
    
    // Nettoyer localStorage
    if (typeof localStorage !== 'undefined') {
      Object.keys(this.flags).forEach(flag => {
        const storageKey = `symbiont_feature_${flag.toLowerCase()}`;
        localStorage.removeItem(storageKey);
      });
    }

    logger.info('🔄 Tous les feature flags remis aux valeurs par défaut');
  }

  /**
   * Obtient l'environnement actuel
   */
  getEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Obtient tous les flags actuels (pour debug)
   */
  getAllFlags(): FeatureFlags & { environment: Environment } {
    const resolvedFlags: FeatureFlags = {} as FeatureFlags;
    
    Object.keys(this.flags).forEach(flag => {
      resolvedFlags[flag as keyof FeatureFlags] = this.isEnabled(flag as keyof FeatureFlags);
    });

    return {
      ...resolvedFlags,
      environment: this.environment
    };
  }

  /**
   * Vérifie si on est en mode développement
   */
  isDevelopment(): boolean {
    return this.environment === 'development';
  }

  /**
   * Vérifie si on est en mode staging
   */
  isStaging(): boolean {
    return this.environment === 'staging';
  }

  /**
   * Vérifie si on est en mode production
   */
  isProduction(): boolean {
    return this.environment === 'production';
  }

  /**
   * Exécute du code conditionnel selon l'environnement
   */
  runInEnvironment<T>(
    handlers: {
      development?: () => T;
      staging?: () => T;
      production?: () => T;
      default?: () => T;
    }
  ): T | undefined {
    const handler = handlers[this.environment] || handlers.default;
    return handler?.();
  }

  /**
   * Log conditionnel selon les feature flags
   */
  debugLog(message: string, ...args: unknown[]): void {
    if (this.isEnabled('ENABLE_DEBUG_LOGGING')) {
      logger.info(`🐛 [SYMBIONT Debug] ${message}`, ...args);
    }
  }

  /**
   * Performance profiling conditionnel
   */
  profileOperation<T>(name: string, operation: () => T): T {
    if (!this.isEnabled('ENABLE_PERFORMANCE_PROFILING')) {
      return operation();
    }

    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;
    
    logger.info(`⏱️ [SYMBIONT Profile] ${name}: ${duration.toFixed(2)}ms`);
    
    return result;
  }

  /**
   * Exécution conditionnelle selon feature flag
   */
  whenEnabled<T>(flag: keyof FeatureFlags, operation: () => T): T | undefined {
    return this.isEnabled(flag) ? operation() : undefined;
  }

  /**
   * Utilitaire pour lire variables d'environnement boolean
   */
  private getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  /**
   * Validation de sécurité - vérifie qu'on n'utilise pas de données mock en prod
   */
  validateProductionSafety(): void {
    if (!this.isProduction()) return;

    const unsafeFlags = [
      'ENABLE_MOCK_DATA',
      'ENABLE_DEBUG_LOGGING'
    ];

    const violations = unsafeFlags.filter(flag => 
      this.isEnabled(flag as keyof FeatureFlags)
    );

    if (violations.length > 0) {
      throw new Error(
        `🚨 SÉCURITÉ: Flags dangereux activés en production: ${violations.join(', ')}`
      );
    }
  }
}

export default FeatureFlagService;