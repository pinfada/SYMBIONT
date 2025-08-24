/**
 * Module de chiffrement sécurisé pour les données sensibles de SYMBIONT
 * Utilise WebCrypto API pour un chiffrement AES-GCM robuste
 */

export class SymbiontEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits recommandé pour GCM
  private static readonly TAG_LENGTH = 128; // 128 bits pour l'authentification

  /**
   * Génère une clé de chiffrement dérivée du navigateur de l'utilisateur
   */
  private static async deriveKey(salt: Uint8Array): Promise<CryptoKey> {
    // Utiliser des données quasi-uniques du navigateur comme source
    const browserData = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
    ].join('|');

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(browserData),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // OWASP recommande au minimum 100k itérations
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false, // Clé non extractible pour plus de sécurité
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Chiffre des données avec AES-GCM
   */
  static async encrypt(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      // Générer un salt et un IV uniques
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Dériver la clé
      const key = await this.deriveKey(salt);

      // Chiffrer
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          tagLength: this.TAG_LENGTH
        },
        key,
        dataBuffer
      );

      // Combiner salt + iv + données chiffrées
      const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

      // Encoder en base64 pour stockage
      return btoa(String.fromCharCode(...combined));

    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Déchiffre des données AES-GCM
   */
  static async decrypt(encryptedData: string): Promise<string> {
    try {
      // Décoder de base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extraire salt, iv, et données chiffrées
      const salt = combined.slice(0, 32);
      const iv = combined.slice(32, 32 + this.IV_LENGTH);
      const encrypted = combined.slice(32 + this.IV_LENGTH);

      // Dériver la même clé
      const key = await this.deriveKey(salt);

      // Déchiffrer
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          tagLength: this.TAG_LENGTH
        },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);

    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - data may be corrupted');
    }
  }

  /**
   * Chiffre un objet JSON
   */
  static async encryptObject(obj: unknown): Promise<string> {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  /**
   * Déchiffre vers un objet JSON
   */
  static async decryptObject<T>(encryptedData: string): Promise<T> {
    const jsonString = await this.decrypt(encryptedData);
    return JSON.parse(jsonString) as T;
  }

  /**
   * Hash sécurisé pour vérification d'intégrité (non réversible)
   */
  static async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = new Uint8Array(hashBuffer);
    
    return btoa(String.fromCharCode(...hashArray));
  }

  /**
   * Génère un token de session sécurisé
   */
  static generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Valide l'intégrité des données avec hash
   */
  static async validateIntegrity(data: string, expectedHash: string): Promise<boolean> {
    try {
      const actualHash = await this.hash(data);
      return actualHash === expectedHash;
    } catch {
      return false;
    }
  }
}