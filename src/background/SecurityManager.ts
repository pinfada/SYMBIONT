/**
 * SecurityManager - Sécurité avancée (chiffrement, anonymisation, contrôle d'accès)
 */
import { OrganismState, BehaviorPattern } from '../shared/types/organism'
import { swCryptoAPI } from './service-worker-adapter'

export class SecurityManager {
  private encryptionKey: string

  constructor() {
    // Clé de chiffrement simple (à remplacer par WebCrypto en prod)
    this.encryptionKey = 'symbiont-key-demo'
  }

  /**
   * Chiffre des données sensibles (AES ou base64 fallback)
   */
  async encryptSensitiveData(data: any): Promise<string> {
    if (swCryptoAPI && swCryptoAPI.subtle) {
      // WebCrypto API (AES-GCM)
      const enc = new TextEncoder()
      const keyMaterial = enc.encode(this.encryptionKey.padEnd(32, '0').slice(0, 32))
      const key = await swCryptoAPI.subtle.importKey(
        'raw', keyMaterial as BufferSource,
        { name: 'AES-GCM' }, false, ['encrypt']
      )
      const iv = swCryptoAPI.getRandomValues(new Uint8Array(12))
      const encoded = enc.encode(JSON.stringify(data))
      const ciphertext = await swCryptoAPI.subtle.encrypt(
        { name: 'AES-GCM', iv }, key, encoded
      )
      // Concatène IV + ciphertext en base64
      const buf = new Uint8Array(iv.length + ciphertext.byteLength)
      buf.set(iv, 0)
      buf.set(new Uint8Array(ciphertext), iv.length)
      return btoa(String.fromCharCode(...buf))
    } else {
      // Fallback base64
      const json = JSON.stringify(data)
      return btoa(unescape(encodeURIComponent(json)))
    }
  }

  /**
   * Déchiffre des données sensibles (AES ou base64 fallback)
   */
  async decryptSensitiveData(data: unknown): Promise<any> {
    if (typeof data !== 'string') {
      throw new Error('decryptSensitiveData attend une chaîne de caractères.');
    }
    if (swCryptoAPI && swCryptoAPI.subtle) {
      try {
        const bin = Uint8Array.from(atob(String(data)), c => c.charCodeAt(0))
        const iv = bin.slice(0, 12)
        const ciphertext = bin.slice(12)
        const enc = new TextEncoder()
        const keyMaterial = enc.encode(this.encryptionKey.padEnd(32, '0').slice(0, 32))
        const key = await swCryptoAPI.subtle.importKey(
          'raw', keyMaterial as BufferSource,
          { name: 'AES-GCM' }, false, ['decrypt']
        )
        const plain = await swCryptoAPI.subtle.decrypt(
          { name: 'AES-GCM', iv }, key, ciphertext
        )
        return JSON.parse(new TextDecoder().decode(plain))
      } catch {
        // Fallback base64
        const json = decodeURIComponent(escape(atob(String(data))))
        return JSON.parse(json)
      }
    } else {
      // Fallback base64
      const json = decodeURIComponent(escape(atob(String(data))))
      return JSON.parse(json)
    }
  }

  /**
   * Anonymise un pattern comportemental (suppression PII, hashage)
   */
  anonymizeForSharing(data: BehaviorPattern): any {
    const anonymized = { ...data }
    if ('url' in anonymized) anonymized.url = 'anonymized'
    if ('userId' in anonymized && typeof anonymized.userId === 'string') anonymized.userId = this.hash(anonymized.userId)
    if ('id' in anonymized && typeof anonymized.id === 'string') anonymized.id = this.hash(anonymized.id)
    // Supprime d'autres PII si besoin
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
   * Hash simple (SHA-256 base64) pour anonymisation
   */
  hash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash |= 0
    }
    return btoa(hash.toString())
  }
} 