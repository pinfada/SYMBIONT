# Security Guide SYMBIONT

Guide complet de sécurité pour développeurs et utilisateurs de SYMBIONT.

## 🛡️ Vue d'Ensemble Sécurité

SYMBIONT implémente une architecture de sécurité multicouche basée sur :
- **Chiffrement local** : Toutes les données sont chiffrées avant stockage
- **Génération aléatoire sécurisée** : Utilisation exclusive de WebCrypto API
- **Logging sécurisé** : Sanitisation automatique des données sensibles
- **Validation stricte** : Validation de toutes les entrées et communications
- **Principe du moindre privilège** : Permissions minimales requises

## 🔐 Cryptographie

### Génération de Nombres Aléatoires Sécurisés

**❌ INTERDIT - Math.random()**
```typescript
// JAMAIS utiliser Math.random() dans SYMBIONT
const insecure = Math.random(); // ❌ Non cryptographique
const uuid = Math.random().toString(36); // ❌ Prévisible
```

**✅ REQUIS - SecureRandom**
```typescript
import { SecureRandom, generateSecureUUID } from '@/shared/utils';

// Génération sécurisée
const secure = SecureRandom.random(); // ✅ Cryptographiquement sûr
const uuid = generateSecureUUID(); // ✅ UUID v4 sécurisé

// Bytes aléatoires
const randomBytes = SecureRandom.getRandomBytes(32); // 32 bytes sécurisés
```

### Implémentation SecureRandom

```typescript
// src/shared/utils/secureRandom.ts
export class SecureRandom {
  private static validateEnvironment(): void {
    if (!crypto || !crypto.getRandomValues) {
      throw new SecurityError('WebCrypto API not available');
    }
  }

  public static random(): number {
    this.validateEnvironment();
    
    // Utilisation de crypto.getRandomValues pour sécurité maximale
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    
    // Normalisation en [0, 1)
    return array[0] / (0xFFFFFFFF + 1);
  }

  public static getRandomBytes(length: number): Uint8Array {
    this.validateEnvironment();
    
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  // UUID v4 cryptographiquement sécurisé
  public static generateSecureUUID(): string {
    const bytes = this.getRandomBytes(16);
    
    // Version et variant selon RFC 4122
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant bits
    
    return this.formatUUID(bytes);
  }
}
```

### Chiffrement des Données

```typescript
// Chiffrement AES-GCM pour données sensibles
export class CryptoManager {
  private static algorithm = 'AES-GCM';
  private static keyLength = 256;

  public static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: this.algorithm, length: this.keyLength },
      true,
      ['encrypt', 'decrypt']
    );
  }

  public static async encrypt(data: string, key: CryptoKey): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // GCM IV
    
    const encrypted = await crypto.subtle.encrypt(
      { name: this.algorithm, iv },
      key,
      encoder.encode(data)
    );

    return {
      encrypted: new Uint8Array(encrypted),
      iv,
      algorithm: this.algorithm
    };
  }

  public static async decrypt(encryptedData: EncryptedData, key: CryptoKey): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
      { name: encryptedData.algorithm, iv: encryptedData.iv },
      key,
      encryptedData.encrypted
    );

    return new TextDecoder().decode(decrypted);
  }
}
```

## 🏗️ Architecture de Sécurité

### SecurityManager Central

```typescript
// src/background/SecurityManager.ts
export class SecurityManager {
  private encryptionKey: CryptoKey;
  private accessTokens: Map<string, AccessToken>;
  private rateLimiter: RateLimiter;

  constructor() {
    this.initializeSecureEnvironment();
  }

  private async initializeSecureEnvironment(): Promise<void> {
    // Génération de clé maître
    this.encryptionKey = await CryptoManager.generateKey();
    
    // Configuration rate limiting
    this.rateLimiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 100 // 100 requêtes/minute
    });
  }

  public async secureStore(key: string, data: any): Promise<void> {
    // Chiffrement des données
    const serialized = JSON.stringify(data);
    const encrypted = await CryptoManager.encrypt(serialized, this.encryptionKey);
    
    // Stockage sécurisé
    await chrome.storage.local.set({ [key]: encrypted });
    
    // Log sécurisé
    logger.info('Data stored securely', { key, size: serialized.length }, 'SecurityManager');
  }

  public async secureRetrieve(key: string): Promise<any> {
    const encrypted = await chrome.storage.local.get(key);
    if (!encrypted[key]) return null;

    try {
      const decrypted = await CryptoManager.decrypt(encrypted[key], this.encryptionKey);
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Decryption failed', { key }, 'SecurityManager');
      throw new SecurityError('Data integrity compromised');
    }
  }

  public validateRequest(request: any, source: string): boolean {
    // Vérification rate limiting
    if (!this.rateLimiter.checkLimit(source)) {
      logger.warn('Rate limit exceeded', { source }, 'SecurityManager');
      return false;
    }

    // Validation schema
    if (!this.validateRequestSchema(request)) {
      logger.warn('Invalid request schema', { type: request.type }, 'SecurityManager');
      return false;
    }

    return true;
  }
}
```

### Logging Sécurisé

**❌ DANGEREUX - Console.log Direct**
```typescript
// ❌ Peut exposer des données sensibles en production
console.log('User data:', { email: user.email, password: user.password });
console.log('API response:', response); // Peut contenir des tokens
```

**✅ SÉCURISÉ - Logger avec Sanitisation**
```typescript
import { logger } from '@/shared/utils';

// ✅ Sanitisation automatique
logger.info('User logged in', { userId: user.id, timestamp: Date.now() }, 'AuthService');
logger.debug('API call completed', { endpoint: '/organisms', status: 200 }, 'ApiClient');
```

### Implémentation SecureLogger

```typescript
// src/shared/utils/secureLogger.ts
export class SecureLogger {
  private static sensitivePatterns = [
    /password/i,
    /token/i,
    /key/i,
    /secret/i,
    /auth/i,
    /email/i,
    /phone/i,
    /ssn/i,
    /credit/i
  ];

  private static sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      // Vérifier si la clé est sensible
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Récursion pour objets imbriqués
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private static isSensitiveKey(key: string): boolean {
    return this.sensitivePatterns.some(pattern => pattern.test(key));
  }

  public static info(message: string, data?: any, context?: string): void {
    if (process.env.NODE_ENV === 'production') {
      console.log(`[${context || 'SYMBIONT'}] ${message}`, this.sanitizeData(data));
    } else {
      console.log(`[${context || 'SYMBIONT'}] ${message}`, data);
    }
  }

  public static warn(message: string, data?: any, context?: string): void {
    console.warn(`[${context || 'SYMBIONT'}] ⚠️ ${message}`, this.sanitizeData(data));
  }

  public static error(message: string, error?: any, context?: string): void {
    console.error(`[${context || 'SYMBIONT'}] ❌ ${message}`, {
      error: error?.message || error,
      stack: error?.stack?.split('\n').slice(0, 3), // Stack limité
      timestamp: Date.now()
    });
  }
}

// Export simplifié
export const logger = SecureLogger;
```

## 🔒 Validation et Sanitisation

### Validation des Messages

```typescript
// Schémas de validation pour messages
const MessageSchemas = {
  EVOLVE_ORGANISM: {
    type: 'object',
    properties: {
      behaviorData: {
        type: 'array',
        items: {
          type: 'object',
          required: ['type', 'timestamp', 'context']
        }
      }
    },
    required: ['behaviorData']
  }
};

export class MessageValidator {
  public static validate(message: any): boolean {
    const schema = MessageSchemas[message.type];
    if (!schema) {
      logger.warn('Unknown message type', { type: message.type }, 'MessageValidator');
      return false;
    }

    return this.validateSchema(message.payload, schema);
  }

  private static validateSchema(data: any, schema: any): boolean {
    // Implémentation validation JSON Schema
    // Utilise une librairie comme Ajv en production
    return true; // Simplifié pour l'exemple
  }
}
```

### Sanitisation des Entrées

```typescript
export class InputSanitizer {
  private static htmlEscape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private static sqlEscape(str: string): string {
    return str.replace(/'/g, "''").replace(/;/g, '\\;');
  }

  public static sanitizeForStorage(data: any): any {
    if (typeof data === 'string') {
      return this.htmlEscape(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForStorage(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[this.htmlEscape(key)] = this.sanitizeForStorage(value);
      }
      return sanitized;
    }
    
    return data;
  }
}
```

## 🚨 Gestion des Erreurs Sécurisées

### Classe d'Erreurs Sécurisées

```typescript
// src/shared/errors/SecurityError.ts
export class SecurityError extends Error {
  public readonly code: string;
  public readonly timestamp: number;
  public readonly context: string;

  constructor(message: string, code: string = 'SECURITY_VIOLATION', context: string = 'Unknown') {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.timestamp = Date.now();
    this.context = context;

    // Log immédiat en mode production
    if (process.env.NODE_ENV === 'production') {
      this.logSecurityIncident();
    }
  }

  private logSecurityIncident(): void {
    logger.error('Security incident detected', {
      code: this.code,
      context: this.context,
      timestamp: this.timestamp
    }, 'SecurityIncident');
  }
}

// Erreurs spécialisées
export class CryptographicError extends SecurityError {
  constructor(message: string, context: string) {
    super(message, 'CRYPTO_ERROR', context);
  }
}

export class AccessDeniedError extends SecurityError {
  constructor(resource: string, context: string) {
    super(`Access denied to ${resource}`, 'ACCESS_DENIED', context);
  }
}
```

### Handler Global d'Erreurs

```typescript
// src/shared/errors/ErrorHandler.ts
export class SecurityErrorHandler {
  private static incidents: SecurityIncident[] = [];

  public static handleSecurityError(error: SecurityError): void {
    // Enregistrer l'incident
    this.incidents.push({
      error: error.code,
      message: error.message,
      timestamp: error.timestamp,
      context: error.context
    });

    // Actions selon la gravité
    switch (error.code) {
      case 'CRYPTO_ERROR':
        this.handleCryptographicFailure(error);
        break;
      case 'ACCESS_DENIED':
        this.handleAccessViolation(error);
        break;
      default:
        this.handleGenericSecurityError(error);
    }
  }

  private static handleCryptographicFailure(error: CryptographicError): void {
    // Régénérer les clés si nécessaire
    // Invalider les sessions actives
    // Notifier l'utilisateur de manière sécurisée
    logger.error('Cryptographic failure - initiating recovery', {
      context: error.context
    }, 'SecurityHandler');
  }
}
```

## 🌐 Sécurité Réseau et Communication

### Communication P2P Sécurisée

```typescript
// src/social/SecureP2PManager.ts
export class SecureP2PManager {
  private keyPair: CryptoKeyPair;
  private trustedPeers: Map<string, TrustedPeer>;

  public async initializeSecureChannel(): Promise<void> {
    // Génération de paire de clés ECDH
    this.keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey']
    );
  }

  public async establishSecureConnection(peerId: string, publicKey: CryptoKey): Promise<SecureChannel> {
    // Dérivation de clé partagée
    const sharedKey = await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey
      },
      this.keyPair.privateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );

    return new SecureChannel(peerId, sharedKey);
  }

  public async sendSecureMessage(channel: SecureChannel, message: any): Promise<void> {
    const encrypted = await CryptoManager.encrypt(
      JSON.stringify(message),
      channel.sharedKey
    );

    await this.sendEncryptedMessage(channel.peerId, encrypted);
  }
}
```

### Rate Limiting

```typescript
// src/shared/security/RateLimiter.ts
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
  }

  public checkLimit(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Nettoyer les requêtes anciennes
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      logger.warn('Rate limit exceeded', { 
        identifier, 
        requests: validRequests.length 
      }, 'RateLimiter');
      return false;
    }

    // Ajouter la requête actuelle
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
}
```

## 🔍 Audit et Compliance

### Audit de Sécurité

```bash
# Script d'audit automatisé
npm run security:audit

# Vérification des dépendances
npm audit --audit-level moderate

# Scan du code pour patterns dangereux
node scripts/security-scan.js

# Validation de conformité RGPD
node scripts/gdpr-compliance-check.js
```

### Logs d'Audit

```typescript
// src/shared/audit/AuditLogger.ts
export class AuditLogger {
  private static auditLog: AuditEntry[] = [];

  public static logSecurityEvent(event: SecurityEvent): void {
    const entry: AuditEntry = {
      timestamp: Date.now(),
      type: event.type,
      severity: event.severity,
      context: event.context,
      details: this.sanitizeAuditData(event.details)
    };

    this.auditLog.push(entry);
    
    // Persistance sécurisée
    this.persistAuditEntry(entry);
  }

  private static sanitizeAuditData(details: any): any {
    // Suppression des données sensibles des logs d'audit
    const sanitized = { ...details };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.key;
    return sanitized;
  }

  public static generateAuditReport(): AuditReport {
    return {
      period: {
        start: this.auditLog[0]?.timestamp,
        end: Date.now()
      },
      events: this.auditLog,
      summary: this.generateSummary()
    };
  }
}
```

## 📋 Checklist Sécurité

### Pour les Développeurs

**Cryptographie ✅**
- [ ] Utilisation exclusive de SecureRandom pour génération aléatoire
- [ ] Implémentation correcte du chiffrement AES-GCM
- [ ] Gestion sécurisée des clés cryptographiques
- [ ] UUID v4 cryptographiquement sécurisés

**Validation ✅**
- [ ] Validation de tous les inputs utilisateur
- [ ] Sanitisation des données avant stockage
- [ ] Validation des schémas de messages
- [ ] Échappement correct des données d'affichage

**Logging ✅**
- [ ] Utilisation du logger sécurisé uniquement
- [ ] Aucune donnée sensible dans les logs
- [ ] Logs d'audit pour actions critiques
- [ ] Rotation et archivage des logs

**Communication ✅**
- [ ] Chiffrement des communications P2P
- [ ] Rate limiting sur toutes les APIs
- [ ] Validation des certificats
- [ ] Gestion sécurisée des timeouts

### Pour les Utilisateurs

**Configuration ✅**
- [ ] Vérifier les paramètres de confidentialité
- [ ] Activer le chiffrement des données
- [ ] Configurer les permissions minimales
- [ ] Activer les logs d'audit si souhaité

**Maintenance ✅**
- [ ] Mettre à jour Chrome régulièrement
- [ ] Vérifier les certificats de sécurité
- [ ] Surveiller les logs d'activité
- [ ] Sauvegarder les données importantes

## 🚨 Incident Response

### Procédure d'Incident

1. **Détection** : Système d'alertes automatiques
2. **Évaluation** : Évaluation de la gravité et de l'impact
3. **Containment** : Isolation et limitation des dégâts
4. **Investigation** : Analyse forensique et identification de la cause
5. **Recovery** : Restauration du service sécurisé
6. **Post-mortem** : Analyse et amélioration des processus

### Contact d'Urgence

En cas d'incident de sécurité critique :
- **GitHub Security Advisory** : Rapport confidentiel
- **Issues avec tag `security`** : Pour problèmes non critiques
- **Email sécurisé** : Pour communications sensibles

---

**Sécurité renforcée ?** 🔒

[**🛠️ Developer Guide**](Developer-Guide) | [**🏗️ Architecture**](Architecture) | [**❓ FAQ Sécurité**](FAQ)