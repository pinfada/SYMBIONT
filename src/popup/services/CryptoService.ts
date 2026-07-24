// Service de cryptographie pour sécuriser les communications P2P.
//
// Garanties :
// - Clés persistées (IndexedDB) : identité cryptographique stable entre sessions
// - Chiffrement hybride RSA-OAEP + AES-256-GCM : tout message, quelle que soit
//   sa taille, est chiffré (RSA seul plafonne à ~190 octets → un organisme
//   JSON ne passait jamais et retombait en clair)
// - Signatures ECDSA P-256 réelles (authenticité/intégrité)
// - Empreinte de clé (safety number) pour vérification hors bande (anti-MITM)
// - Échec FERMÉ : jamais de repli silencieux en clair
import { logger } from '@shared/utils/secureLogger';

interface PeerKeys {
  encrypt: CryptoKey; // RSA-OAEP public (chiffrement)
  verify?: CryptoKey; // ECDSA public (vérification de signature)
}

const IDB_NAME = 'symbiont-crypto';
const IDB_STORE = 'keys';
const SELF_KEY_ID = 'self-v2';

export class CryptoService {
  private static instance: CryptoService;
  private encryptionPair: CryptoKeyPair | null = null;
  private signingPair: CryptoKeyPair | null = null;
  private peerKeys: Map<string, PeerKeys> = new Map();
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.initPromise = this.initializeKeys();
  }

  static getInstance(): CryptoService {
    if (!this.instance) {
      this.instance = new CryptoService();
    }
    return this.instance;
  }

  private async ensureReady(): Promise<void> {
    if (!this.initPromise) this.initPromise = this.initializeKeys();
    await this.initPromise;
  }

  // === Persistance des clés (IndexedDB) ===

  private openKeyDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async loadStoredKeys(): Promise<{
    encryptionPair: CryptoKeyPair;
    signingPair: CryptoKeyPair;
  } | null> {
    try {
      const db = await this.openKeyDb();
      const record = await new Promise<any>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(SELF_KEY_ID);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      db.close();
      if (record?.encryptionPair?.privateKey && record?.signingPair?.privateKey) {
        return record;
      }
      return null;
    } catch (error) {
      logger.warn('Crypto: lecture des clés persistées impossible:', error);
      return null;
    }
  }

  private async persistKeys(): Promise<void> {
    if (!this.encryptionPair || !this.signingPair) return;
    try {
      const db = await this.openKeyDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        // Les CryptoKey sont structured-cloneable : stockées telles quelles,
        // le matériel de clé privée n'est jamais exposé au JS.
        tx.objectStore(IDB_STORE).put(
          { encryptionPair: this.encryptionPair, signingPair: this.signingPair },
          SELF_KEY_ID
        );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (error) {
      logger.warn('Crypto: persistance des clés impossible:', error);
    }
  }

  private async initializeKeys(): Promise<void> {
    try {
      const stored = await this.loadStoredKeys();
      if (stored) {
        this.encryptionPair = stored.encryptionPair;
        this.signingPair = stored.signingPair;
        logger.info('Crypto: clés chargées depuis le stockage persistant');
        return;
      }

      // Paire de chiffrement (RSA-OAEP 2048)
      this.encryptionPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Paire de signature (ECDSA P-256)
      this.signingPair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );

      await this.persistKeys();
      logger.info('Crypto: nouvelles paires de clés générées et persistées');
    } catch (error) {
      logger.error('Crypto: erreur initialisation des clés:', error);
      throw error;
    }
  }

  // === Échange de clés publiques ===

  /**
   * Exporte le bundle de clés publiques (chiffrement + signature) en base64,
   * à transmettre aux pairs lors du key exchange.
   */
  async getPublicKeyString(): Promise<string> {
    await this.ensureReady();
    if (!this.encryptionPair || !this.signingPair) {
      throw new Error('Crypto: clés non initialisées');
    }
    const encSpki = await crypto.subtle.exportKey('spki', this.encryptionPair.publicKey);
    const sigSpki = await crypto.subtle.exportKey('spki', this.signingPair.publicKey);
    const bundle = {
      v: 2,
      enc: this.toBase64(encSpki),
      sig: this.toBase64(sigSpki)
    };
    return btoa(JSON.stringify(bundle));
  }

  /**
   * Importe le bundle de clés publiques d'un pair. Rétro-compatible avec un
   * ancien format (SPKI RSA brut) pour ne pas casser les pairs non migrés.
   */
  async importPeerPublicKey(peerId: string, publicKeyString: string): Promise<void> {
    try {
      let encB64: string;
      let sigB64: string | null = null;

      try {
        const bundle = JSON.parse(atob(publicKeyString));
        if (bundle && bundle.enc) {
          encB64 = bundle.enc;
          sigB64 = bundle.sig || null;
        } else {
          encB64 = publicKeyString; // format hérité
        }
      } catch {
        encB64 = publicKeyString; // SPKI RSA brut (hérité)
      }

      const encryptKey = await crypto.subtle.importKey(
        'spki',
        this.fromBase64(encB64),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt']
      );

      const peerKeys: PeerKeys = { encrypt: encryptKey };

      if (sigB64) {
        peerKeys.verify = await crypto.subtle.importKey(
          'spki',
          this.fromBase64(sigB64),
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['verify']
        );
      }

      this.peerKeys.set(peerId, peerKeys);
      logger.info(`Crypto: clés publiques importées pour ${peerId}`);
    } catch (error) {
      logger.error(`Crypto: erreur import clé pour ${peerId}:`, error);
      throw error;
    }
  }

  // === Chiffrement hybride RSA-OAEP + AES-256-GCM ===

  /**
   * Chiffre un message pour un pair. Échoue (throw) si aucune clé n'est
   * disponible ou en cas d'erreur : jamais de repli en clair.
   */
  async encryptForPeer(peerId: string, message: string): Promise<string> {
    await this.ensureReady();
    const peer = this.peerKeys.get(peerId);
    if (!peer) {
      throw new Error(`Crypto: pas de clé publique pour ${peerId}`);
    }

    // 1. Clé de session AES-GCM éphémère
    const aesKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // 2. Chiffrement du message avec l'AES
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      new TextEncoder().encode(message)
    );

    // 3. Chiffrement de la clé AES avec la RSA publique du pair
    const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
    const encryptedKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      peer.encrypt,
      rawAesKey
    );

    const envelope = {
      v: 2,
      k: this.toBase64(encryptedKey),
      iv: this.toBase64(iv.buffer),
      c: this.toBase64(ciphertext)
    };
    return btoa(JSON.stringify(envelope));
  }

  /**
   * Déchiffre un message hybride reçu. Échoue (throw) si le message n'est pas
   * dans notre format ou en cas d'erreur : jamais de renvoi du texte brut.
   */
  async decryptMessage(encryptedMessage: string): Promise<string> {
    await this.ensureReady();
    if (!this.encryptionPair) {
      throw new Error('Crypto: pas de clé privée pour déchiffrer');
    }

    let envelope: any;
    try {
      envelope = JSON.parse(atob(encryptedMessage));
    } catch {
      throw new Error('Crypto: format de message chiffré invalide');
    }
    if (!envelope || envelope.v !== 2 || !envelope.k || !envelope.iv || !envelope.c) {
      throw new Error('Crypto: enveloppe chiffrée non reconnue');
    }

    // 1. Déchiffrer la clé AES avec notre RSA privée
    const rawAesKey = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      this.encryptionPair.privateKey,
      this.fromBase64(envelope.k)
    );
    const aesKey = await crypto.subtle.importKey(
      'raw',
      rawAesKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // 2. Déchiffrer le message
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(this.fromBase64(envelope.iv)) },
      aesKey,
      this.fromBase64(envelope.c)
    );
    return new TextDecoder().decode(plainBuffer);
  }

  // === Signatures ECDSA ===

  /** Signe un message avec notre clé ECDSA privée (base64). */
  async signMessage(message: string): Promise<string> {
    await this.ensureReady();
    if (!this.signingPair) {
      throw new Error('Crypto: pas de clé de signature');
    }
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      this.signingPair.privateKey,
      new TextEncoder().encode(message)
    );
    return this.toBase64(signature);
  }

  /** Vérifie la signature d'un message avec la clé publique du pair. */
  async verifyMessage(peerId: string, message: string, signatureB64: string): Promise<boolean> {
    await this.ensureReady();
    const peer = this.peerKeys.get(peerId);
    if (!peer?.verify) return false;
    try {
      return await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        peer.verify,
        this.fromBase64(signatureB64),
        new TextEncoder().encode(message)
      );
    } catch {
      return false;
    }
  }

  // === Empreinte de vérification (safety number, anti-MITM) ===

  /** Empreinte courte de nos clés publiques, à comparer hors bande. */
  async getKeyFingerprint(): Promise<string> {
    await this.ensureReady();
    if (!this.encryptionPair || !this.signingPair) return '';
    return this.fingerprintOf(this.encryptionPair.publicKey, this.signingPair.publicKey);
  }

  /** Empreinte des clés d'un pair (null si signature non disponible). */
  async getPeerFingerprint(peerId: string): Promise<string | null> {
    const peer = this.peerKeys.get(peerId);
    if (!peer?.verify) return null;
    return this.fingerprintOf(peer.encrypt, peer.verify);
  }

  private async fingerprintOf(encKey: CryptoKey, sigKey: CryptoKey): Promise<string> {
    const enc = await crypto.subtle.exportKey('spki', encKey);
    const sig = await crypto.subtle.exportKey('spki', sigKey);
    const combined = new Uint8Array(enc.byteLength + sig.byteLength);
    combined.set(new Uint8Array(enc), 0);
    combined.set(new Uint8Array(sig), enc.byteLength);
    const digest = await crypto.subtle.digest('SHA-256', combined);
    const hex = Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    // Groupes de 4 pour lisibilité (comme un safety number)
    return (hex.slice(0, 20).match(/.{1,4}/g) || []).join(' ');
  }

  // === Utilitaires ===

  generateAnonymousName(peerId: string): string {
    const adjectives = ['Mystique', 'Quantique', 'Cosmique', 'Éthéré', 'Cristallin',
                       'Lumineux', 'Symbiotique', 'Harmonique', 'Fractal', 'Stellaire'];
    const nouns = ['Organisme', 'Être', 'Entité', 'Conscience', 'Esprit',
                  'Neurone', 'Cellule', 'Symbiote', 'Noyau', 'Nexus'];
    const hash = peerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const adjIndex = hash % adjectives.length;
    const nounIndex = (hash * 7) % nouns.length;
    return `${adjectives[adjIndex]} ${nouns[nounIndex]}`;
  }

  hasPeerKey(peerId: string): boolean {
    return this.peerKeys.has(peerId);
  }

  removePeerKey(peerId: string): void {
    this.peerKeys.delete(peerId);
  }

  private toBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  private fromBase64(b64: string): ArrayBuffer {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const cryptoService = CryptoService.getInstance();
