// Jest setup file for SYMBIONT tests
import '@testing-library/jest-dom';

// Mock global objects that might not be available in test environment
global.performance = global.performance || {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  getEntries: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => [])
};

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16); // ~60fps
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock URL.createObjectURL for Web Workers
global.URL = global.URL || {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
};

// Mock Worker constructor
global.Worker = jest.fn().mockImplementation(() => ({
  postMessage: jest.fn(),
  terminate: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onmessage: null,
  onerror: null
}));

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
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    } as Partial<chrome.storage.LocalStorageArea>,
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
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

// Increase timeout for integration tests
jest.setTimeout(10000);

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
    energy: Math.random(),
    harmony: Math.random(),
    wisdom: Math.random() * 0.2 // Wisdom is typically lower
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

// TypeScript declarations for global test utilities
declare global {
  var testUtils: {
    waitFor: (ms: number) => Promise<void>;
    createMockDNA: (length?: number) => string;
    createMockTraits: () => any;
    suppressConsole: () => () => void;
  };
} 