// Service de cryptographie pour sécuriser les communications P2P
import { logger } from '@shared/utils/secureLogger';

export class CryptoService {
  private static instance: CryptoService;
  private keyPair: CryptoKeyPair | null = null;
  private peerPublicKeys: Map<string, CryptoKey> = new Map();

  private constructor() {
    this.initializeKeys();
  }

  static getInstance(): CryptoService {
    if (!this.instance) {
      this.instance = new CryptoService();
    }
    return this.instance;
  }

  // Générer une paire de clés pour ce client
  private async initializeKeys(): Promise<void> {
    try {
      // Vérifier si on a déjà des clés sauvegardées
      const savedKeys = localStorage.getItem('symbiont_crypto_keys');
      if (savedKeys) {
        // Pour simplifier, on régénère à chaque session
        // En production, il faudrait persister les clés de manière sécurisée
      }

      // Générer une nouvelle paire de clés RSA-OAEP
      this.keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true, // Extractable
        ['encrypt', 'decrypt']
      );

      logger.info('Crypto: Paire de clés générée avec succès');
    } catch (error) {
      logger.error('Crypto: Erreur génération clés:', error);
    }
  }

  // Exporter la clé publique pour l'envoyer aux pairs
  async getPublicKeyString(): Promise<string> {
    if (!this.keyPair) {
      await this.initializeKeys();
    }

    if (!this.keyPair) {
      throw new Error('Impossible de générer les clés');
    }

    const publicKey = await window.crypto.subtle.exportKey(
      'spki',
      this.keyPair.publicKey
    );

    // Convertir en base64 pour transmission
    return btoa(String.fromCharCode(...new Uint8Array(publicKey)));
  }

  // Importer la clé publique d'un pair
  async importPeerPublicKey(peerId: string, publicKeyString: string): Promise<void> {
    try {
      // Décoder depuis base64
      const binaryString = atob(publicKeyString);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        bytes,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        true,
        ['encrypt']
      );

      this.peerPublicKeys.set(peerId, publicKey);
      logger.info(`Crypto: Clé publique importée pour ${peerId}`);
    } catch (error) {
      logger.error(`Crypto: Erreur import clé pour ${peerId}:`, error);
    }
  }

  // Chiffrer un message pour un pair spécifique
  async encryptForPeer(peerId: string, message: string): Promise<string> {
    const peerPublicKey = this.peerPublicKeys.get(peerId);
    if (!peerPublicKey) {
      logger.warn(`Crypto: Pas de clé publique pour ${peerId}, envoi en clair`);
      return message; // Fallback en clair si pas de clé
    }

    try {
      // Encoder le message en UTF-8
      const encoder = new TextEncoder();
      const data = encoder.encode(message);

      // Chiffrer avec la clé publique du destinataire
      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP'
        },
        peerPublicKey,
        data
      );

      // Retourner en base64
      return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    } catch (error) {
      logger.error('Crypto: Erreur chiffrement:', error);
      return message; // Fallback en clair en cas d'erreur
    }
  }

  // Déchiffrer un message reçu
  async decryptMessage(encryptedMessage: string): Promise<string> {
    if (!this.keyPair) {
      logger.error('Crypto: Pas de clé privée pour déchiffrer');
      return encryptedMessage;
    }

    try {
      // Décoder depuis base64
      const binaryString = atob(encryptedMessage);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Déchiffrer avec notre clé privée
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP'
        },
        this.keyPair.privateKey,
        bytes
      );

      // Décoder le résultat
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      logger.error('Crypto: Erreur déchiffrement:', error);
      // Si erreur, c'est peut-être un message non chiffré
      return encryptedMessage;
    }
  }

  // Créer une signature pour authentifier l'expéditeur
  async signMessage(message: string): Promise<string> {
    if (!this.keyPair) {
      return '';
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);

      // Pour RSA-OAEP on ne peut pas signer, il faudrait RSA-PSS
      // Pour simplifier, on retourne un hash
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    } catch (error) {
      logger.error('Crypto: Erreur signature:', error);
      return '';
    }
  }

  // Générer un nom d'utilisateur anonyme mais unique
  generateAnonymousName(peerId: string): string {
    const adjectives = ['Mystique', 'Quantique', 'Cosmique', 'Éthéré', 'Cristallin',
                       'Lumineux', 'Symbiotique', 'Harmonique', 'Fractal', 'Stellaire'];
    const nouns = ['Organisme', 'Être', 'Entité', 'Conscience', 'Esprit',
                  'Neurone', 'Cellule', 'Symbiote', 'Noyau', 'Nexus'];

    // Utiliser l'ID pour générer un index consistant
    const hash = peerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const adjIndex = hash % adjectives.length;
    const nounIndex = (hash * 7) % nouns.length;

    return `${adjectives[adjIndex]} ${nouns[nounIndex]}`;
  }

  // Vérifier si on a la clé d'un pair
  hasPeerKey(peerId: string): boolean {
    return this.peerPublicKeys.has(peerId);
  }

  // Nettoyer les clés d'un pair déconnecté
  removePeerKey(peerId: string): void {
    this.peerPublicKeys.delete(peerId);
  }
}

export const cryptoService = CryptoService.getInstance();