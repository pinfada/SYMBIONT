// Jest setup file for SYMBIONT tests
import '@testing-library/jest-dom';

// Mock global objects that might not be available in test environment
global.performance = global.performance || {};
global.performance.now = jest.fn(() => Date.now());
global.performance.mark = jest.fn();
global.performance.measure = jest.fn();
global.performance.clearMarks = jest.fn();
global.performance.clearMeasures = jest.fn();
global.performance.getEntries = jest.fn(() => []);
global.performance.getEntriesByName = jest.fn(() => []);
global.performance.getEntriesByType = jest.fn(() => []);

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => [])
}));

// Mock TextEncoder/TextDecoder for Node.js
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock btoa/atob for Node.js
global.btoa = global.btoa || ((str: string) => Buffer.from(str, 'binary').toString('base64'));
global.atob = global.atob || ((str: string) => Buffer.from(str, 'base64').toString('binary'));

// Mock crypto for WebCrypto
const mockCryptoKey = {
  type: 'secret',
  extractable: true,
  algorithm: { name: 'AES-GCM', length: 256 },
  usages: ['encrypt', 'decrypt']
} as CryptoKey;

// Create realistic mock data
const createMockEncryptionResult = (plaintext: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = new Uint8Array(12);
  const mockEncrypted = new Uint8Array(data.length + 16); // +16 for auth tag
  data.forEach((byte, i) => {
    mockEncrypted[i] = byte ^ 0xAA; // Simple XOR for mock encryption
  });
  return mockEncrypted.buffer;
};

const createMockDecryptionResult = (encryptedData: ArrayBuffer) => {
  const data = new Uint8Array(encryptedData);
  const decrypted = new Uint8Array(data.length - 16); // -16 for auth tag
  for (let i = 0; i < decrypted.length; i++) {
    decrypted[i] = data[i] ^ 0xAA; // Reverse XOR
  }
  return decrypted.buffer;
};

// Enhanced crypto mock with better error handling
const cryptoSubtle = {
  generateKey: jest.fn().mockImplementation(async (algorithm, extractable, usages) => {
    // Add some validation
    if (!algorithm || !usages) {
      throw new Error('Invalid parameters for generateKey');
    }
    return mockCryptoKey;
  }),
  importKey: jest.fn().mockResolvedValue(mockCryptoKey),
  exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
  encrypt: jest.fn().mockImplementation(async (algorithm, key, data) => {
    try {
      if (!algorithm || !key || !data) {
        throw new Error('Missing required parameters for encryption');
      }
      const decoder = new TextDecoder();
      const plaintext = decoder.decode(data);
      return createMockEncryptionResult(plaintext);
    } catch (error) {
      throw new Error(`Crypto failure: ${error.message}`);
    }
  }),
  decrypt: jest.fn().mockImplementation(async (algorithm, key, data) => {
    try {
      if (!algorithm || !key || !data) {
        throw new Error('Missing required parameters for decryption');
      }
      return createMockDecryptionResult(data);
    } catch (error) {
      throw new Error(`Decrypt failure: ${error.message}`);
    }
  }),
  digest: jest.fn().mockImplementation(async (algorithm, data) => {
    if (!data) {
      throw new Error('Data is required for digest');
    }
    // Mock SHA-256 hash - create realistic output
    const input = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data);
    const hash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      hash[i] = (input[i % input.length] + i) % 256;
    }
    return hash.buffer;
  })
};

const cryptoGetRandomValues = jest.fn((arr) => {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
});

global.crypto = global.crypto || {};
global.crypto.subtle = cryptoSubtle;
global.crypto.getRandomValues = cryptoGetRandomValues;

// swCryptoAPI will be mocked globally

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16); // ~60fps
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock URL.createObjectURL for Web Workers
global.URL = global.URL || {};
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Worker constructor with improved functionality
global.Worker = jest.fn().mockImplementation((scriptURL) => {
  const mockWorker = {
    postMessage: jest.fn().mockImplementation((message) => {
      // Simulate async response
      setTimeout(() => {
        if (mockWorker.onmessage) {
          mockWorker.onmessage({ data: { type: 'response', payload: message } });
        }
      }, 10);
    }),
    terminate: jest.fn(),
    addEventListener: jest.fn().mockImplementation((type, listener) => {
      if (type === 'message') {
        mockWorker.onmessage = listener;
      } else if (type === 'error') {
        mockWorker.onerror = listener;
      }
    }),
    removeEventListener: jest.fn(),
    onmessage: null,
    onerror: null,
    dispatchEvent: jest.fn()
  };
  
  // Simulate worker ready state
  setTimeout(() => {
    if (mockWorker.onmessage) {
      mockWorker.onmessage({ data: { type: 'ready' } });
    }
  }, 5);
  
  return mockWorker;
});

// Mock WebGL context
const createMockWebGLContext = () => ({
  // WebGL constants
  TRIANGLES: 4,
  LINES: 1,
  POINTS: 0,
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  DYNAMIC_DRAW: 35048,
  STATIC_DRAW: 35044,
  FLOAT: 5126,
  UNSIGNED_SHORT: 5123,
  
  // Buffer methods
  createBuffer: jest.fn(() => ({ id: Math.random() })),
  deleteBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  
  // Vertex attributes
  vertexAttribPointer: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  disableVertexAttribArray: jest.fn(),
  
  // Drawing
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
  
  // Shaders (for future tests)
  createShader: jest.fn(() => ({ id: Math.random() })),
  createProgram: jest.fn(() => ({ id: Math.random() })),
  compileShader: jest.fn(),
  linkProgram: jest.fn(),
  useProgram: jest.fn(),
  
  // State
  viewport: jest.fn(),
  clear: jest.fn(),
  clearColor: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  
  // Error checking
  getError: jest.fn(() => 0), // GL_NO_ERROR
  
  // Extensions
  getExtension: jest.fn(),
  getSupportedExtensions: jest.fn(() => [])
});

// Mock canvas and WebGL
(HTMLCanvasElement.prototype.getContext as jest.Mock) = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    return createMockWebGLContext() as unknown as WebGLRenderingContext;
  }
  if (contextType === 'webgl2') {
    return {
      ...createMockWebGLContext(),
      createVertexArray: jest.fn(() => ({ id: Math.random() })),
      deleteVertexArray: jest.fn(),
      bindVertexArray: jest.fn()
    } as unknown as WebGL2RenderingContext;
  }
  return null;
});

// Mock Chrome APIs for extension testing
const mockStorageData: { [key: string]: any } = {};

(global as any).chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    } as Partial<chrome.events.Event<any>>,
    sendMessage: jest.fn(),
    getURL: jest.fn((path: string) => `chrome-extension://mock-id/${path}`)
  } as Partial<typeof chrome.runtime>,
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  } as Partial<typeof chrome.tabs>,
  storage: {
    local: {
      get: jest.fn().mockImplementation((keys?: string | string[] | null, callback?: (result: { [key: string]: any }) => void) => {
        const result: { [key: string]: any } = {};
        if (typeof keys === 'string') {
          if (mockStorageData[keys] !== undefined) {
            result[keys] = mockStorageData[keys];
          }
        } else if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (mockStorageData[key] !== undefined) {
              result[key] = mockStorageData[key];
            }
          });
        } else {
          Object.assign(result, mockStorageData);
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: jest.fn().mockImplementation((items: { [key: string]: any }, callback?: () => void) => {
        Object.assign(mockStorageData, items);
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn().mockImplementation((keys: string | string[], callback?: () => void) => {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => delete mockStorageData[key]);
        if (callback) callback();
        return Promise.resolve();
      }),
      clear: jest.fn().mockImplementation((callback?: () => void) => {
        Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
        if (callback) callback();
        return Promise.resolve();
      })
    } as Partial<chrome.storage.LocalStorageArea>,
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined)
    } as Partial<chrome.storage.SyncStorageArea>
  } as Partial<typeof chrome.storage>
};

// Console override for test cleanup
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // Suppress console.log in tests unless explicitly needed
  log: process.env.JEST_VERBOSE === 'true' ? originalConsole.log : jest.fn(),
  info: process.env.JEST_VERBOSE === 'true' ? originalConsole.info : jest.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error,
  debug: process.env.JEST_VERBOSE === 'true' ? originalConsole.debug : jest.fn()
};

// Increase timeout for integration tests and slower CI environments
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create mock DNA sequences
  createMockDNA: (length: number = 16) => {
    const bases = ['A', 'T', 'C', 'G'];
    return Array.from({ length }, () => bases[Math.floor(Math.random() * bases.length)]).join('');
  },
  
  // Helper to create valid organism traits
  createMockTraits: () => ({
    curiosity: Math.random(),
    focus: Math.random(),
    rhythm: Math.random(),
    empathy: Math.random(),
    creativity: Math.random(),
    resilience: Math.random(),
    adaptability: Math.random(),
    memory: Math.random(),
    intuition: Math.random() * 0.2 // Intuition is typically lower
  }),
  
  // Helper to suppress console output during tests
  suppressConsole: () => {
    const spy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {})
    };
    
    return () => {
      Object.values(spy).forEach(s => s.mockRestore());
    };
  }
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  
  // Clear mock storage data
  Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
  
  // Reset performance mock if it exists and is a Jest mock
  if (global.performance.now && typeof (global.performance.now as any).mockClear === 'function') {
    (global.performance.now as jest.Mock).mockClear();
  }
  
  // Reset RAF mocks if they exist and are Jest mocks
  if (global.requestAnimationFrame && typeof (global.requestAnimationFrame as any).mockClear === 'function') {
    (global.requestAnimationFrame as jest.Mock).mockClear();
  }
  if (global.cancelAnimationFrame && typeof (global.cancelAnimationFrame as any).mockClear === 'function') {
    (global.cancelAnimationFrame as jest.Mock).mockClear();
  }
});

// Global mock setup that needs to be done before imports
beforeAll(() => {
  // Mock the service-worker-adapter module
  jest.doMock('../src/background/service-worker-adapter', () => ({
    swCryptoAPI: {
      subtle: cryptoSubtle,
      getRandomValues: cryptoGetRandomValues
    }
  }));
});

// TypeScript declarations for global test utilities
declare global {
  var testUtils: {
    waitFor: (ms: number) => Promise<void>;
    createMockDNA: (length?: number) => string;
    createMockTraits: () => any;
    suppressConsole: () => () => void;
  };
} 