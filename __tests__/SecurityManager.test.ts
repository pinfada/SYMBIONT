// Mock service-worker-adapter before importing SecurityManager
const mockCryptoSubtle = {
  generateKey: jest.fn().mockResolvedValue({ 
    type: 'secret', 
    extractable: true, 
    algorithm: { name: 'AES-GCM', length: 256 }, 
    usages: ['encrypt', 'decrypt'] 
  } as CryptoKey),
  importKey: jest.fn().mockResolvedValue({ 
    type: 'secret', 
    extractable: true, 
    algorithm: { name: 'AES-GCM', length: 256 }, 
    usages: ['encrypt', 'decrypt'] 
  } as CryptoKey),
  exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
  encrypt: jest.fn().mockImplementation(async (algorithm, key, data) => {
    // Validate parameters
    if (!algorithm || !key || !data) {
      throw new Error('Missing required parameters for encryption');
    }
    
    // Ensure data is an ArrayBuffer or can be converted to one
    let dataBuffer = data;
    if (!(data instanceof ArrayBuffer)) {
      if (data instanceof Uint8Array) {
        dataBuffer = data.buffer;
      } else {
        throw new Error('Data must be ArrayBuffer or Uint8Array');
      }
    }
    
    // Simulate realistic encryption result with proper buffer
    const inputLength = dataBuffer.byteLength || 0;
    const ciphertext = new Uint8Array(inputLength + 16); // Add some auth tag bytes
    ciphertext.fill(0xBB);
    
    // Add some variation based on input
    for (let i = 0; i < Math.min(inputLength, ciphertext.length); i++) {
      ciphertext[i] = (ciphertext[i] + i) % 256;
    }
    
    return ciphertext.buffer;
  }),
  decrypt: jest.fn().mockImplementation(async () => {
    const testData = JSON.stringify({ foo: 'bar', n: 42 });
    return new TextEncoder().encode(testData).buffer;
  }),
  digest: jest.fn().mockImplementation(async () => {
    const hash = new Uint8Array(32);
    hash.fill(0xCD);
    return hash.buffer;
  })
};

const mockCryptoGetRandomValues = jest.fn().mockImplementation((arr) => {
  // Fill with deterministic values for testing
  if (arr && arr.length) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = i % 256;
    }
  }
  return arr;
});

jest.mock('../src/background/service-worker-adapter', () => ({
  swCryptoAPI: {
    subtle: mockCryptoSubtle,
    getRandomValues: mockCryptoGetRandomValues
  }
}));

import { SecurityManager } from '../src/background/SecurityManager'

describe('SecurityManager', () => {
  let security: SecurityManager;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset all crypto mocks
    mockCryptoSubtle.generateKey.mockClear();
    mockCryptoSubtle.encrypt.mockClear();
    mockCryptoSubtle.decrypt.mockClear();
    mockCryptoSubtle.digest.mockClear();
    mockCryptoGetRandomValues.mockClear();
    
    // Create SecurityManager with manual initialization to avoid chrome.storage issues
    security = new SecurityManager(true); // Skip auto-init
    
    // Manually set the encryption key for testing
    (security as any).encryptionKey = { 
      type: 'secret', 
      extractable: true, 
      algorithm: { name: 'AES-GCM', length: 256 }, 
      usages: ['encrypt', 'decrypt'] 
    } as CryptoKey;
  });

  describe('Chiffrement/Déchiffrement', () => {
    it('chiffre et déchiffre correctement les données', async () => {
      const testData = { foo: 'bar', n: 42 };
      
      // Test encryption
      try {
        const encrypted = await security.encryptSensitiveData(testData);
        expect(typeof encrypted).toBe('string');
        expect(encrypted.length).toBeGreaterThan(0);
        expect(mockCryptoSubtle.encrypt).toHaveBeenCalled();
        
        // Test decryption  
        const decrypted = await security.decryptSensitiveData(encrypted);
        expect(decrypted).toEqual(testData);
        expect(mockCryptoSubtle.decrypt).toHaveBeenCalled();
      } catch (error) {
        console.log('Mock calls:', {
          getRandomValues: mockCryptoGetRandomValues.mock.calls,
          encrypt: mockCryptoSubtle.encrypt.mock.calls
        });
        throw error;
      }
    });

    it('gère les erreurs de chiffrement gracieusement', async () => {
      mockCryptoSubtle.encrypt.mockRejectedValue(new Error('Crypto failure'));
      
      await expect(security.encryptSensitiveData({})).rejects.toThrow('Échec du chiffrement des données sensibles');
    });

    it('gère les erreurs de déchiffrement gracieusement', async () => {
      mockCryptoSubtle.decrypt.mockRejectedValue(new Error('Decrypt failure'));
      
      await expect(security.decryptSensitiveData('invalid')).rejects.toThrow('Échec du déchiffrement des données');
    });
  });

  describe('Anonymisation', () => {
    it('anonymise les données comportementales (async)', async () => {
      const pattern = { 
        url: 'https://secret.com', 
        interactions: 5, 
        timeSpent: 10, 
        scrollDepth: 0.8, 
        timestamp: Date.now() 
      };
      
      const anonymized = await security.anonymizeForSharing(pattern);
      expect(anonymized.url).toBe('anonymized');
      expect(anonymized.interactions).toBe(pattern.interactions);
      expect(anonymized.timeSpent).toBe(pattern.timeSpent);
      expect(anonymized.scrollDepth).toBe(pattern.scrollDepth);
    });

    it('anonymise les données comportementales (sync)', () => {
      const pattern = { 
        url: 'https://secret.com', 
        userId: 'user123',
        interactions: 5, 
        timeSpent: 10, 
        scrollDepth: 0.8, 
        timestamp: Date.now() 
      };
      
      const anonymized = security.anonymizeForSharingSync(pattern);
      expect(anonymized.url).toBe('anonymized');
      expect(anonymized.userId).not.toBe('user123'); // Hashé
      expect(typeof anonymized.userId).toBe('string');
    });

    it('supprime les champs sensibles', async () => {
      const pattern = { 
        url: 'https://secret.com',
        email: 'test@example.com',
        name: 'John Doe',
        phone: '123456789',
        interactions: 5
      };
      
      const anonymized = await security.anonymizeForSharing(pattern);
      expect(anonymized.email).toBeUndefined();
      expect(anonymized.name).toBeUndefined();
      expect(anonymized.phone).toBeUndefined();
      expect(anonymized.interactions).toBe(5);
    });
  });

  describe('Contrôle d\'accès', () => {
    it('valide l\'accès utilisateur basique', () => {
      const request = { userId: 'user123', resource: 'organisms' };
      expect(security.validateDataAccess(request)).toBe(true);
    });

    it('rejette l\'accès admin sans rôle admin', () => {
      const request = { userId: 'user123', resource: 'admin', role: 'user' as const };
      expect(security.validateDataAccess(request, 'admin')).toBe(false);
    });

    it('accepte l\'accès admin avec rôle admin', () => {
      const request = { userId: 'admin123', resource: 'admin', role: 'admin' as const };
      expect(security.validateDataAccess(request, 'admin')).toBe(true);
    });

    it('rejette les requêtes invalides', () => {
      expect(security.validateDataAccess({ userId: '', resource: 'test' })).toBe(false);
      expect(security.validateDataAccess({ userId: 'user', resource: '' })).toBe(false);
    });
  });

  describe('Hashage', () => {
    it('hash des chaînes avec SHA-256', async () => {
      const testString = 'test-string';
      const hash = await security.hash(testString);
      
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(mockCryptoSubtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
    });

    it('produit des hashs cohérents', async () => {
      const testString = 'consistent-test';
      const hash1 = await security.hash(testString);
      const hash2 = await security.hash(testString);
      
      expect(hash1).toBe(hash2);
    });

    it('hash sync fonctionne comme fallback', () => {
      const testString = 'sync-test';
      const hash = security.hashSync(testString);
      
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('Initialisation', () => {
    it('peut être créé sans auto-initialisation', () => {
      const testSecurity = new SecurityManager(true);
      expect(testSecurity).toBeInstanceOf(SecurityManager);
    });

    it('gère gracieusement l\'absence de clé lors des opérations', async () => {
      const testSecurity = new SecurityManager(true);
      // Sans clé définie, devrait essayer d'initialiser puis échouer proprement
      await expect(testSecurity.encryptSensitiveData({})).rejects.toThrow();
    });

    it('valide la présence de WebCrypto API', async () => {
      // Temporarily disable the crypto API
      const originalSubtle = mockCryptoSubtle;
      jest.doMock('../src/background/service-worker-adapter', () => ({
        swCryptoAPI: null
      }));

      await expect(security.encryptSensitiveData({})).rejects.toThrow('WebCrypto API non disponible');
    });
  });
}); 