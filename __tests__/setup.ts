/**
 * Global test setup
 * Mocks for browser APIs and global objects
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getManifest: jest.fn(() => ({ version: '1.0.0' })),
    id: 'test-extension-id'
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  }
} as any;

// Mock IndexedDB
class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;

  constructor(result?: any) {
    this.result = result;
    // Simulate async success
    setTimeout(() => {
      if (this.onsuccess) {
        this.onsuccess({ target: { result: this.result } });
      }
    }, 0);
  }
}

class MockIDBObjectStore {
  add = jest.fn(() => new MockIDBRequest());
  put = jest.fn(() => new MockIDBRequest());
  get = jest.fn(() => new MockIDBRequest());
  delete = jest.fn(() => new MockIDBRequest());
  clear = jest.fn(() => new MockIDBRequest());
  openCursor = jest.fn(() => new MockIDBRequest(null));
  createIndex = jest.fn();
  index = jest.fn(() => this);
  count = jest.fn(() => new MockIDBRequest(0));
}

class MockIDBTransaction {
  objectStore = jest.fn(() => new MockIDBObjectStore());
  oncomplete: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;

  constructor() {
    // Simulate async complete
    setTimeout(() => {
      if (this.oncomplete) {
        this.oncomplete();
      }
    }, 0);
  }
}

class MockIDBDatabase {
  objectStoreNames = { contains: jest.fn(() => false), length: 0 };
  createObjectStore = jest.fn(() => new MockIDBObjectStore());
  deleteObjectStore = jest.fn();
  transaction = jest.fn(() => new MockIDBTransaction());
  close = jest.fn();
}

global.indexedDB = {
  open: jest.fn((name: string, version?: number) => {
    const db = new MockIDBDatabase();
    const request = new MockIDBRequest(db);
    (request as any).onupgradeneeded = null;
    (request as any).onsuccess = null;
    (request as any).onerror = null;

    // Simulate async behavior
    setTimeout(() => {
      if ((request as any).onsuccess) {
        (request as any).onsuccess({ target: { result: db } });
      }
    }, 0);

    return request;
  }),
  deleteDatabase: jest.fn((name: string) => {
    const request = new MockIDBRequest();
    (request as any).onsuccess = null;
    (request as any).onerror = null;

    setTimeout(() => {
      if ((request as any).onsuccess) {
        (request as any).onsuccess({ target: { result: undefined } });
      }
    }, 0);

    return request;
  })
} as any;

// Mock WebGL
class MockWebGLRenderingContext {
  canvas = { width: 800, height: 600 };
  createShader = jest.fn(() => ({}));
  shaderSource = jest.fn();
  compileShader = jest.fn();
  getShaderParameter = jest.fn(() => true);
  createProgram = jest.fn(() => ({}));
  attachShader = jest.fn();
  linkProgram = jest.fn();
  getProgramParameter = jest.fn(() => true);
  useProgram = jest.fn();
  getAttribLocation = jest.fn(() => 0);
  getUniformLocation = jest.fn(() => 0);
  enableVertexAttribArray = jest.fn();
  createBuffer = jest.fn(() => ({}));
  bindBuffer = jest.fn();
  bufferData = jest.fn();
  vertexAttribPointer = jest.fn();
  uniform1f = jest.fn();
  uniform2f = jest.fn();
  uniform3f = jest.fn();
  uniform4f = jest.fn();
  uniformMatrix4fv = jest.fn();
  viewport = jest.fn();
  clearColor = jest.fn();
  clear = jest.fn();
  enable = jest.fn();
  disable = jest.fn();
  blendFunc = jest.fn();
  drawArrays = jest.fn();
  drawElements = jest.fn();
  createTexture = jest.fn(() => ({}));
  bindTexture = jest.fn();
  texImage2D = jest.fn();
  texParameteri = jest.fn();
  deleteShader = jest.fn();
  deleteProgram = jest.fn();
  deleteBuffer = jest.fn();
  deleteTexture = jest.fn();
  getError = jest.fn(() => 0);
  ARRAY_BUFFER = 0x8892;
  ELEMENT_ARRAY_BUFFER = 0x8893;
  STATIC_DRAW = 0x88E4;
  FLOAT = 0x1406;
  VERTEX_SHADER = 0x8B31;
  FRAGMENT_SHADER = 0x8B30;
  COMPILE_STATUS = 0x8B81;
  LINK_STATUS = 0x8B82;
  COLOR_BUFFER_BIT = 0x00004000;
  DEPTH_BUFFER_BIT = 0x00000100;
  BLEND = 0x0BE2;
  SRC_ALPHA = 0x0302;
  ONE_MINUS_SRC_ALPHA = 0x0303;
  TRIANGLES = 0x0004;
  TEXTURE_2D = 0x0DE1;
  TEXTURE0 = 0x84C0;
  RGBA = 0x1908;
  UNSIGNED_BYTE = 0x1401;
  TEXTURE_WRAP_S = 0x2802;
  TEXTURE_WRAP_T = 0x2803;
  TEXTURE_MIN_FILTER = 0x2801;
  TEXTURE_MAG_FILTER = 0x2800;
  CLAMP_TO_EDGE = 0x812F;
  LINEAR = 0x2601;
  NO_ERROR = 0;
}

HTMLCanvasElement.prototype.getContext = jest.fn((contextType: string) => {
  if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    return new MockWebGLRenderingContext();
  }
  return null;
}) as any;

// Mock crypto for secure random
global.crypto = {
  getRandomValues: jest.fn((array: Uint8Array | Uint32Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  randomUUID: jest.fn(() => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }))
} as any;

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
} as any;

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Headers(),
    status: 200,
    statusText: 'OK'
  })
) as any;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
global.sessionStorage = localStorageMock as any;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
}) as any;

global.cancelAnimationFrame = jest.fn();

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();

  constructor(callback: any, options?: any) {}
}
global.IntersectionObserver = MockIntersectionObserver as any;

// Mock MutationObserver
class MockMutationObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);

  constructor(callback: any) {}
}
global.MutationObserver = MockMutationObserver as any;

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();

  constructor(callback: any) {}
}
global.ResizeObserver = MockResizeObserver as any;

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn()
};

// Restore original console for debugging if needed
(global as any).originalConsole = originalConsole;