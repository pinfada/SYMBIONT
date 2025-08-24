/**
 * Validation et sanitisation centralisée des inputs utilisateur
 * Améliore la sécurité selon les recommandations d'audit
 */
import { logger } from '@/shared/utils/secureLogger';

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class InputValidator {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly ORGANISM_NAME_REGEX = /^[a-zA-Z0-9\s\-_]{3,50}$/;
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private static readonly SESSION_ID_REGEX = /^[a-f0-9]{32,}$/i;
  private static readonly SAFE_PATH_REGEX = /^[a-zA-Z0-9._\-\/]+$/;
  
  // XSS patterns to detect and remove
  private static readonly XSS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /<form[^>]*>.*?<\/form>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi,
    /<[^>]*\s+on\w+[^>]*>/gi
  ];
  
  // NoSQL injection patterns
  private static readonly NOSQL_PATTERNS = [
    /\$ne\b/gi,
    /\$gt\b/gi,
    /\$lt\b/gi,
    /\$in\b/gi,
    /\$nin\b/gi,
    /\$regex\b/gi,
    /\$where\b/gi,
    /\$exists\b/gi,
    /\$or\b/gi,
    /\$and\b/gi
  ];
  
  // Path traversal patterns
  private static readonly PATH_TRAVERSAL_PATTERNS = [
    /\.\./g,
    /%2e%2e/gi,
    /%252e%252e/gi,
    /\.%2e/gi,
    /%2e\./gi,
    /\.\\\./g,
    /%5c\.\./gi,
    /\.\.\//g,
    /\.\.%2f/gi
  ];

  /**
   * Sanitise les inputs de base en supprimant les caractères dangereux
   */
  static sanitizeUserInput(input: unknown, maxLength: number = 1000): string {
    if (input === null || input === undefined) {
      return '';
    }

    let sanitized = String(input).trim();

    // Limiter la longueur pour éviter les attaques par buffer overflow
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
      logger.warn('Input truncated due to length limit', { 
        originalLength: String(input).length, 
        maxLength 
      }, 'input-validation');
    }

    // Supprimer les caractères de contrôle potentiellement dangereux
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Encoder les caractères HTML de base
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Supprimer les patterns XSS
    for (const pattern of this.XSS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  /**
   * Valide et sanitise les noms d'organismes
   */
  static validateOrganismName(name: unknown): string {
    if (typeof name !== 'string') {
      throw new ValidationError('Organism name must be a string', 'name', name);
    }

    const sanitized = this.sanitizeUserInput(name, 50);
    
    if (sanitized.length < 3) {
      throw new ValidationError('Organism name must be at least 3 characters long', 'name', sanitized);
    }

    if (!this.ORGANISM_NAME_REGEX.test(sanitized)) {
      throw new ValidationError('Organism name contains invalid characters', 'name', sanitized);
    }

    return sanitized;
  }

  /**
   * Valide les adresses email
   */
  static validateEmail(email: unknown): string {
    if (typeof email !== 'string') {
      throw new ValidationError('Email must be a string', 'email', email);
    }

    const sanitized = this.sanitizeUserInput(email, 254);
    
    if (!this.EMAIL_REGEX.test(sanitized)) {
      throw new ValidationError('Invalid email format', 'email', sanitized);
    }

    // Vérifications de sécurité supplémentaires
    if (sanitized.includes('javascript:') || sanitized.includes('<script>')) {
      throw new ValidationError('Email contains potentially malicious content', 'email', sanitized);
    }

    return sanitized.toLowerCase();
  }

  /**
   * Valide les données de mutation d'organisme
   */
  static validateMutationData(data: unknown): MutationData {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Mutation data must be an object', 'mutationData', data);
    }

    const mutation = data as any;

    // Valider le type
    if (typeof mutation.type !== 'string') {
      throw new ValidationError('Mutation type must be a string', 'type', mutation.type);
    }
    
    const validTypes = ['genetic', 'behavioral', 'neural', 'adaptive', 'environmental'];
    if (!validTypes.includes(mutation.type)) {
      throw new ValidationError('Invalid mutation type', 'type', mutation.type);
    }

    // Valider la force
    if (typeof mutation.strength !== 'number') {
      throw new ValidationError('Mutation strength must be a number', 'strength', mutation.strength);
    }
    
    if (mutation.strength < 0 || mutation.strength > 1) {
      throw new ValidationError('Mutation strength must be between 0 and 1', 'strength', mutation.strength);
    }

    // Valider la cible (optionnelle)
    let target: string | undefined;
    if (mutation.target !== undefined) {
      if (typeof mutation.target !== 'string') {
        throw new ValidationError('Mutation target must be a string', 'target', mutation.target);
      }
      target = this.sanitizeUserInput(mutation.target, 100);
    }

    return {
      type: mutation.type,
      strength: mutation.strength,
      target: target || ''
    };
  }

  /**
   * Valide et sanitise les chemins de fichiers
   */
  static validateFilePath(path: unknown): string {
    if (typeof path !== 'string') {
      throw new ValidationError('File path must be a string', 'path', path);
    }

    // Détecter les tentatives de path traversal
    for (const pattern of this.PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(path)) {
        throw new ValidationError('Path traversal attempt detected', 'path', path);
      }
    }

    // Sanitiser le chemin
    let sanitized = this.sanitizeUserInput(path, 500);

    // Supprimer les caractères potentiellement dangereux pour les systèmes de fichiers
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '_');

    // Vérifier que le chemin est dans la liste des caractères sûrs
    if (!this.SAFE_PATH_REGEX.test(sanitized)) {
      throw new ValidationError('Path contains unsafe characters', 'path', sanitized);
    }

    return sanitized;
  }

  /**
   * Valide les objets JSON en détectant les injections NoSQL
   */
  static validateJSON(jsonString: unknown): any {
    if (typeof jsonString !== 'string') {
      throw new ValidationError('JSON input must be a string', 'json', jsonString);
    }

    // Détecter les patterns d'injection NoSQL
    for (const pattern of this.NOSQL_PATTERNS) {
      if (pattern.test(jsonString)) {
        throw new ValidationError('Potential NoSQL injection detected', 'json', jsonString);
      }
    }

    try {
      const parsed = JSON.parse(jsonString);
      
      // Vérifier récursivement les objets parsés
      this.validateObjectForInjection(parsed);
      
      return parsed;
    } catch (_error) {
      throw new ValidationError('Invalid JSON format', 'json', jsonString);
    }
  }

  /**
   * Valide les UUIDs
   */
  static validateUUID(uuid: unknown): string {
    if (typeof uuid !== 'string') {
      throw new ValidationError('UUID must be a string', 'uuid', uuid);
    }

    if (!this.UUID_REGEX.test(uuid)) {
      throw new ValidationError('Invalid UUID format', 'uuid', uuid);
    }

    return uuid.toLowerCase();
  }

  /**
   * Valide les IDs de session
   */
  static validateSessionId(sessionId: unknown): string {
    if (typeof sessionId !== 'string') {
      throw new ValidationError('Session ID must be a string', 'sessionId', sessionId);
    }

    if (!this.SESSION_ID_REGEX.test(sessionId)) {
      throw new ValidationError('Invalid session ID format', 'sessionId', sessionId);
    }

    if (sessionId.length < 32 || sessionId.length > 128) {
      throw new ValidationError('Session ID length must be between 32 and 128 characters', 'sessionId', sessionId);
    }

    return sessionId.toLowerCase();
  }

  /**
   * Valide les paramètres d'API avec whitelist
   */
  static validateApiParams(params: unknown, allowedParams: string[]): Record<string, any> {
    if (!params || typeof params !== 'object') {
      throw new ValidationError('API parameters must be an object', 'params', params);
    }

    const validated: Record<string, any> = {};
    const paramsObj = params as Record<string, any>;

    for (const [key, value] of Object.entries(paramsObj)) {
      if (!allowedParams.includes(key)) {
        logger.warn('Unauthorized parameter filtered out', { key }, 'input-validation');
        continue;
      }

      // Sanitiser la valeur selon son type
      if (typeof value === 'string') {
        validated[key] = this.sanitizeUserInput(value);
      } else if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
          throw new ValidationError(`Parameter ${key} must be a finite number`, key, value);
        }
        validated[key] = value;
      } else if (typeof value === 'boolean') {
        validated[key] = value;
      } else {
        throw new ValidationError(`Parameter ${key} has unsupported type`, key, value);
      }
    }

    return validated;
  }

  /**
   * Valide les données de configuration utilisateur
   */
  static validateUserPreferences(preferences: unknown): UserPreferences {
    if (!preferences || typeof preferences !== 'object') {
      throw new ValidationError('User preferences must be an object', 'preferences', preferences);
    }

    const prefs = preferences as any;
    const validated: UserPreferences = {};

    // Thème
    if (prefs.theme !== undefined) {
      if (typeof prefs.theme !== 'string') {
        throw new ValidationError('Theme must be a string', 'theme', prefs.theme);
      }
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(prefs.theme)) {
        throw new ValidationError('Invalid theme value', 'theme', prefs.theme);
      }
      validated.theme = prefs.theme;
    }

    // Notifications
    if (prefs.notifications !== undefined) {
      if (typeof prefs.notifications !== 'boolean') {
        throw new ValidationError('Notifications setting must be a boolean', 'notifications', prefs.notifications);
      }
      validated.notifications = prefs.notifications;
    }

    // Langue
    if (prefs.language !== undefined) {
      if (typeof prefs.language !== 'string') {
        throw new ValidationError('Language must be a string', 'language', prefs.language);
      }
      const validLanguages = ['en', 'fr', 'es', 'de', 'it'];
      if (!validLanguages.includes(prefs.language)) {
        throw new ValidationError('Invalid language code', 'language', prefs.language);
      }
      validated.language = prefs.language;
    }

    return validated;
  }

  /**
   * Recherche récursive d'injections dans les objets
   */
  private static validateObjectForInjection(obj: Record<string, unknown>, depth: number = 0): void {
    // Limiter la profondeur pour éviter les attaques par récursion
    if (depth > 10) {
      throw new ValidationError('Object nesting too deep', 'object', obj);
    }

    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        // Vérifier les clés pour les opérateurs NoSQL
        for (const pattern of this.NOSQL_PATTERNS) {
          if (pattern.test(key)) {
            throw new ValidationError('NoSQL injection pattern detected in object key', 'key', key);
          }
        }

        // Vérifier récursivement les valeurs
        if (typeof value === 'string') {
          for (const pattern of this.NOSQL_PATTERNS) {
            if (pattern.test(value)) {
              throw new ValidationError('NoSQL injection pattern detected in value', 'value', value);
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          this.validateObjectForInjection(value as Record<string, unknown>, depth + 1);
        }
      }
    }
  }

  /**
   * Valide la sécurité des regex pour éviter ReDoS
   */
  static validateRegexSafety(pattern: string, input: string, timeoutMs: number = 100): boolean {
    try {
      const regex = new RegExp(pattern);
      const start = Date.now();
      
      regex.test(input);
      
      const duration = Date.now() - start;
      
      if (duration > timeoutMs) {
        logger.warn('Potential ReDoS detected', { 
          pattern, 
          inputLength: input.length, 
          duration 
        }, 'input-validation');
        return false;
      }
      
      return true;
    } catch (_error) {
      logger.error('Invalid regex pattern', { pattern, error: _error }, 'input-validation');
      return false;
    }
  }

  /**
   * Échappe les caractères spéciaux pour utilisation dans regex
   */
  static escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Valide les limites de taux (rate limiting)
   */
  static validateRateLimit(
    identifier: string, 
    maxRequests: number = 100, 
    windowMs: number = 60000
  ): boolean {
    // Cette implémentation basique pourrait être étendue avec Redis
    const now = Date.now();
    const key = `rate_limit_${identifier}`;
    
    // Simulation d'un stockage en mémoire (à remplacer par Redis en production)
    const requests = this.getRateLimitData(key, now, windowMs);
    
    if (requests >= maxRequests) {
      logger.warn('Rate limit exceeded', { 
        identifier: this.sanitizeUserInput(identifier, 50),
        requests,
        maxRequests,
        windowMs
      }, 'input-validation');
      return false;
    }
    
    this.incrementRateLimit(key, now);
    return true;
  }

  private static rateLimitCache = new Map<string, number[]>();

  private static getRateLimitData(key: string, now: number, windowMs: number): number {
    const requests = this.rateLimitCache.get(key) || [];
    // Nettoyer les anciennes requêtes
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    this.rateLimitCache.set(key, validRequests);
    return validRequests.length;
  }

  private static incrementRateLimit(key: string, now: number): void {
    const requests = this.rateLimitCache.get(key) || [];
    requests.push(now);
    this.rateLimitCache.set(key, requests);
  }
}

// Types d'interface
export interface MutationData {
  type: string;
  strength: number;
  target?: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  notifications?: boolean;
  language?: string;
}

// Fonctions utilitaires exportées
export const sanitize = InputValidator.sanitizeUserInput;
export const validateEmail = InputValidator.validateEmail;
export const validateJSON = InputValidator.validateJSON;
export const validateOrganismName = InputValidator.validateOrganismName;