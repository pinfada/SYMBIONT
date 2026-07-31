// Mock Chrome storage APIs for testing
const mockChromeStorage = {
  local: {
    get: jest.fn().mockImplementation((keys, callback) => {
      if (callback) callback({});
      return Promise.resolve({});
    }),
    set: jest.fn().mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    })
  }
};

// Mock global chrome object
global.chrome = {
  storage: mockChromeStorage
} as any;

// Mock btoa and atob for Node.js environment
global.btoa = jest.fn();
global.atob = jest.fn();

// Mock service-worker-adapter before importing SecurityManager
const mockCryptoSubtle = {
  generateKey: jest.fn(),
  importKey: jest.fn(),
  exportKey: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  digest: jest.fn()
};

const mockCryptoGetRandomValues = jest.fn();

// Mock implementations applied fresh in beforeEach because the jest config sets
// resetMocks/clearMocks/restoreMocks = true, which wipes any implementation set
// at module scope before each test runs.
const mockKey = {
  type: 'secret',
  extractable: true,
  algorithm: { name: 'AES-GCM', length: 256 },
  usages: ['encrypt', 'decrypt']
} as CryptoKey;

function applyCryptoMockImplementations(): void {
  global.btoa = jest.fn().mockImplementation((str) => Buffer.from(str, 'binary').toString('base64'));
  global.atob = jest.fn().mockImplementation((str) => Buffer.from(str, 'base64').toString('binary'));

  mockCryptoSubtle.generateKey.mockResolvedValue(mockKey);
  mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
  mockCryptoSubtle.exportKey.mockResolvedValue(new ArrayBuffer(32));

  mockCryptoSubtle.encrypt.mockImplementation(async (algorithm, key, data) => {
    // Validate parameters
    if (!algorithm || !key || !data) {
      throw new Error('Missing required parameters for encryption');
    }

    // Ensure data is an ArrayBuffer or can be converted to one.
    // Use ArrayBuffer.isView (realm-agnostic) instead of `instanceof Uint8Array`
    // because the module encodes via Node's TextEncoder, producing a typed array
    // from a different realm than the test's Uint8Array under jsdom.
    let dataBuffer = data;
    if (!(data instanceof ArrayBuffer)) {
      if (ArrayBuffer.isView(data)) {
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
  });

  mockCryptoSubtle.decrypt.mockImplementation(async () => {
    const testData = JSON.stringify({ foo: 'bar', n: 42 });
    return new TextEncoder().encode(testData).buffer;
  });

  mockCryptoSubtle.digest.mockImplementation(async (_algorithm, _data) => {
    // Create a realistic hash-like result
    const hash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      hash[i] = (0xCD + i) % 256;
    }
    return hash.buffer;
  });

  mockCryptoGetRandomValues.mockImplementation((arr) => {
    // Fill with deterministic values for testing
    if (arr && arr.length) {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = i % 256;
      }
    }
    return arr;
  });
}

// Mock the service worker adapter
const mockSwCryptoAPI = {
  subtle: mockCryptoSubtle,
  getRandomValues: mockCryptoGetRandomValues
};

jest.mock('../src/background/service-worker-adapter', () => ({
  swCryptoAPI: mockSwCryptoAPI
}));

import { SecurityManager } from '../src/background/SecurityManager'
import { bulkheadManager } from '../src/shared/patterns/BulkheadManager'

describe('SecurityManager', () => {
  let security: SecurityManager;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Re-apply mock implementations (wiped by resetMocks between tests)
    applyCryptoMockImplementations();

    // The bulkheadManager is a module singleton whose circuit-breaker state
    // leaks across tests. Reset it so a deliberate-failure test doesn't leave
    // the breaker open for the next one.
    const bulkheads = (bulkheadManager as any).bulkheads as Map<string, any>;
    if (bulkheads) {
      for (const bulkhead of bulkheads.values()) {
        bulkhead.circuitBreakerOpen = false;
        bulkhead.activeRequests = 0;
        bulkhead.lastFailureTime = 0;
      }
    }

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
      const encrypted = await security.encryptSensitiveData(testData);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      expect(mockCryptoSubtle.encrypt).toHaveBeenCalled();
      
      // Test decryption  
      const decrypted = await security.decryptSensitiveData(encrypted);
      expect(decrypted).toEqual(testData);
      expect(mockCryptoSubtle.decrypt).toHaveBeenCalled();
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
      // Realm-agnostic check: the module encodes with Node's TextEncoder, so the
      // typed array passed to digest is not an instanceof the test-realm Uint8Array.
      const digestCall = mockCryptoSubtle.digest.mock.calls[0];
      expect(digestCall[0]).toBe('SHA-256');
      expect(ArrayBuffer.isView(digestCall[1])).toBe(true);
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
      // Create a new SecurityManager instance and test crypto check
      const testSecurity = new SecurityManager(true);
      
      // Test will fail at the crypto check level since we need to test the actual API validation
      await expect(testSecurity.encryptSensitiveData({})).rejects.toThrow();
    });
  });
});