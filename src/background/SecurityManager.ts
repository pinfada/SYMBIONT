/**
 * SecurityManager - Sécurité avancée (chiffrement, anonymisation, contrôle d'accès)
 */
import { BehaviorPattern } from '../shared/types/organism'
import { swCryptoAPI } from './service-worker-adapter'
import { logger } from '@/shared/utils/secureLogger';
import { bulkheadManager } from '@/shared/patterns/BulkheadManager';

export class SecurityManager {
  private encryptionKey: CryptoKey | null = null
  private keyPromise: Promise<CryptoKey> | null = null

  constructor(skipAutoInit: boolean = false) {
    // Configuration des bulkheads pour l'isolation des opérations critiques
    this.setupBulkheads();
    
    // Initialisation sécurisée avec génération de clé WebCrypto
    if (!skipAutoInit) {
      this.initializeSecureKey()
    }
  }

  private setupBulkheads(): void {
    // Bulkhead pour les opérations cryptographiques
    bulkheadManager.createBulkhead({
      name: 'crypto-operations',
      maxConcurrentRequests: 5,
      timeout: 10000,
      fallbackStrategy: 'circuit-breaker',
      retryAttempts: 2
    });

    // Bulkhead pour les opérations de stockage sécurisé
    bulkheadManager.createBulkhead({
      name: 'secure-storage',
      maxConcurrentRequests: 10,
      timeout: 5000,
      fallbackStrategy: 'fail-fast'
    });

    // Bulkhead pour l'anonymisation des données
    bulkheadManager.createBulkhead({
      name: 'data-anonymization',
      maxConcurrentRequests: 3,
      timeout: 3000,
      fallbackStrategy: 'retry',
      retryAttempts: 3
    });
  }

  /**
   * Initialise une clé de chiffrement sécurisée avec WebCrypto
   */
  private async initializeSecureKey(): Promise<void> {
    if (this.keyPromise) return
    
    this.keyPromise = this.generateSecureKey()
    this.encryptionKey = await this.keyPromise
  
    }

  /**
   * Génère une clé AES-GCM 256 bits sécurisée
   */
  private async generateSecureKey(): Promise<CryptoKey> {
    if (!swCryptoAPI?.subtle) {
      logger.warn('WebCrypto API non disponible - mode développement activé (NON SÉCURISÉ)');
      // Retourner une clé factice pour le développement
      return this.createDevelopmentKey();
    }

    // Tentative de récupération d'une clé stockée ou génération nouvelle
    const storedKeyData = await this.getStoredKey()
    
    if (storedKeyData) {
      return await swCryptoAPI.subtle.importKey(
        'raw',
        storedKeyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      )
    }

    // Génération d'une nouvelle clé sécurisée
    const key = await swCryptoAPI.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // Extractible pour stockage
      ['encrypt', 'decrypt']
    )

    // Stockage sécurisé de la clé
    await this.storeKey(key)
    
    return key
  }

  /**
   * Crée une clé factice pour le développement (NON SÉCURISÉ)
   */
  private createDevelopmentKey(): CryptoKey {
    // Clé factice pour éviter les erreurs en développement
    // ATTENTION: Cette clé n'est PAS sécurisée et ne doit jamais être utilisée en production
    return {
      type: 'secret',
      extractable: false,
      algorithm: { name: 'AES-GCM' },
      usages: ['encrypt', 'decrypt']
    } as CryptoKey;
  }

  /**
   * Récupère la clé stockée de manière sécurisée
   */
  private async getStoredKey(): Promise<ArrayBuffer | null> {
    try {
      return new Promise((resolve) => {
        chrome.storage.local.get(['symbiont_key_v2'], (result) => {
          if (result.symbiont_key_v2) {
            const keyData = new Uint8Array(result.symbiont_key_v2)
            resolve(keyData.buffer)
          } else {
            resolve(null)
          }
        })
      })
    } catch {
      return null
    }
  }

  /**
   * Stocke la clé de manière sécurisée
   */
  private async storeKey(key: CryptoKey): Promise<void> {
    try {
      // En mode développement, ne pas essayer d'exporter la clé factice
      if (!swCryptoAPI?.subtle) {
        logger.warn('Mode développement: pas de stockage de clé réel');
        return;
      
    }
      
      const keyData = await swCryptoAPI.subtle.exportKey('raw', key)
      const keyArray = Array.from(new Uint8Array(keyData))
      
      chrome.storage.local.set({ 
        symbiont_key_v2: keyArray,
        symbiont_key_created: Date.now()
      })
    } catch (error) {
      logger.error('Erreur lors du stockage de la clé:', error)
    }
  }

  /**
   * Garantit que la clé est initialisée avant utilisation
   */
  private async ensureKeyReady(): Promise<CryptoKey> {
    if (!this.encryptionKey) {
      await this.initializeSecureKey()
    
    }
    
    if (!this.encryptionKey) {
      throw new Error('Impossible d\'initialiser la clé de chiffrement')
    }
    
    return this.encryptionKey
  }

  /**
   * Chiffre des données sensibles avec AES-GCM sécurisé
   */
  async encryptSensitiveData(data: unknown): Promise<string> {
    return bulkheadManager.execute('crypto-operations', async () => {
      return this._encryptSensitiveData(data);
    }, 'encryptSensitiveData');
  }

  private async _encryptSensitiveData(data: unknown): Promise<string> {
    if (!swCryptoAPI?.subtle) {
      logger.warn('WebCrypto API non disponible - chiffrement factice pour développement');
      // Mode développement : pas de chiffrement réel mais évite les erreurs
      return 'DEV_MODE:' + btoa(JSON.stringify(data));
    }

    try {
      const key = await this.ensureKeyReady()
      const enc = new TextEncoder()
      const iv = swCryptoAPI.getRandomValues(new Uint8Array(12))
      const encoded = enc.encode(JSON.stringify(data))
      
      const ciphertext = await swCryptoAPI.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
      )
      
      // Concatène IV + ciphertext en base64
      const buf = new Uint8Array(iv.length + ciphertext.byteLength)
      buf.set(iv, 0)
      buf.set(new Uint8Array(ciphertext), iv.length)
      return btoa(String.fromCharCode(...buf))
    } catch (error) {
      logger.error('Erreur de chiffrement:', error)
      throw new Error('Échec du chiffrement des données sensibles')
    }
  }

  /**
   * Déchiffre des données sensibles avec AES-GCM sécurisé
   */
  async decryptSensitiveData(data: unknown): Promise<unknown> {
    return bulkheadManager.execute('crypto-operations', async () => {
      return this._decryptSensitiveData(data);
    }, 'decryptSensitiveData');
  }

  private async _decryptSensitiveData(data: unknown): Promise<unknown> {
    if (typeof data !== 'string') {
      throw new Error('decryptSensitiveData attend une chaîne de caractères.')
    }

    // Gestion du mode développement
    if (data.startsWith('DEV_MODE:')) {
      logger.warn('Déchiffrement en mode développement (non sécurisé)');
      try {
        return JSON.parse(atob(data.substring(9)));
      } catch (error) {
        logger.error('Erreur déchiffrement mode développement:', error);
        return null;
      }
    }

    if (!swCryptoAPI?.subtle) {
      logger.warn('WebCrypto API non disponible - déchiffrement factice pour développement');
      return null;
    }

    try {
      const key = await this.ensureKeyReady()
      const bin = Uint8Array.from(atob(String(data)), c => c.charCodeAt(0))
      const iv = bin.slice(0, 12)
      const ciphertext = bin.slice(12)
      
      const plainBuffer = await swCryptoAPI.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      )
      
      const plainText = new TextDecoder().decode(plainBuffer)
      return JSON.parse(plainText)
    } catch (error) {
      logger.error('Erreur de déchiffrement:', error)
      throw new Error('Échec du déchiffrement des données - données corrompues ou clé invalide')
    }
  }

  /**
   * Anonymise un pattern comportemental (suppression PII, hashage sécurisé)
   */
  async anonymizeForSharing(data: BehaviorPattern): Promise<unknown> {
    return bulkheadManager.execute('data-anonymization', async () => {
      return this._anonymizeForSharing(data);
    }, 'anonymizeForSharing');
  }

  private async _anonymizeForSharing(data: BehaviorPattern): Promise<unknown> {
    const anonymized = { ...data 
    }
    
    // Suppression des URLs sensibles
    if ('url' in anonymized) {
      anonymized.url = 'anonymized'
    }
    
    // Hashage sécurisé des identifiants
    if ('userId' in anonymized && typeof anonymized.userId === 'string') {
      anonymized.userId = await this.hash(anonymized.userId)
    }
    
    if ('id' in anonymized && typeof anonymized.id === 'string') {
      anonymized.id = await this.hash(anonymized.id)
    }
    
    // Suppression d'autres données personnelles potentielles (RGPD)
    const sensitiveFields = [
      'email', 'name', 'address', 'phone', 'ip', 
      'ssn', 'creditCard', 'passport', 'nationalId',
      'birthDate', 'age', 'location', 'coordinates',
      'biometric', 'medical', 'financial', 'salary'
    ]
    sensitiveFields.forEach(field => {
      if (field in anonymized) {
        delete (anonymized as any)[field]
      }
    })
    
    // Généralisation des timestamps (précision à l'heure)
    if ('timestamp' in anonymized && typeof anonymized.timestamp === 'number') {
      anonymized.timestamp = Math.floor(anonymized.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000)
    }
    
    return anonymized
  }

  /**
   * Version synchrone pour compatibilité (utilise hashSync)
   */
  anonymizeForSharingSync(data: BehaviorPattern): any {
    const anonymized = { ...data 
    }
    if ('url' in anonymized) anonymized.url = 'anonymized'
    if ('userId' in anonymized && typeof anonymized.userId === 'string') anonymized.userId = this.hashSync(anonymized.userId)
    if ('id' in anonymized && typeof anonymized.id === 'string') anonymized.id = this.hashSync(anonymized.id)
    return anonymized
  }

  /**
   * Contrôle d'accès par rôle (user/admin), ressource, etc.
   */
  validateDataAccess(request: { userId: string; resource: string; role?: 'user' | 'admin' }, requiredRole: 'user' | 'admin' = 'user'): boolean {
    if (!request.userId || !request.resource) return false
    if (requiredRole === 'admin' && request.role !== 'admin') return false
    return true
  }

  /**
   * Hash cryptographique SHA-256 pour anonymisation sécurisée
   */
  async hash(str: string): Promise<string> {
    if (!swCryptoAPI?.subtle) {
      // Fallback simple en cas d'indisponibilité de WebCrypto
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i)
        hash |= 0
      
    }
      return btoa(hash.toString())
    }

    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(str)
      const hashBuffer = await swCryptoAPI.subtle.digest('SHA-256', data)
      const hashArray = new Uint8Array(hashBuffer)
      
      // Conversion en base64 pour un hash compact
      return btoa(String.fromCharCode(...hashArray))
    } catch (error) {
      logger.error('Erreur de hashage:', error)
      throw new Error('Échec du hashage sécurisé')
    }
  }

  /**
   * Version synchrone du hash pour compatibilité (non recommandée pour nouveau code)
   */
  hashSync(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash |= 0
    
    }
    return btoa(hash.toString())
  }
} 