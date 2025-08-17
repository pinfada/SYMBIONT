module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  
  // Test files patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  
  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        target: 'ES2020',
        module: 'CommonJS'
      }
    }],
  },
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@background/(.*)$': '<rootDir>/src/background/$1',
    '^@content/(.*)$': '<rootDir>/src/content/$1',
    '^@popup/(.*)$': '<rootDir>/src/popup/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.ts'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/index.ts',
    '!src/workers/**/*', // Workers tested separately
    '!src/popup/**/*',   // UI components tested separately
    '!src/content/**/*', // Content scripts tested separately
    '!src/background/**/*' // Background scripts tested separately
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover',
    'json',
    ['html', { subdir: 'html' }],
    ['json', { file: 'coverage-final.json' }],
    ['text', { file: 'coverage.txt' }]
  ],
  
  // Coverage thresholds - Objectifs de stabilisation
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Specific thresholds for core components
    'src/core/**/*.ts': {
      branches: 85,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/shared/utils/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Test timeout - Augmenté pour la stabilité des tests WebCrypto/SecureRandom
  testTimeout: 60000,
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost',
    resources: 'usable',
    runScripts: 'dangerously',
    pretendToBeVisual: true
  },
  
  // Verbose output for CI
  verbose: process.env.CI === 'true',
  
  // Watch plugins for development
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Performance optimizations
  maxWorkers: process.env.CI ? '50%' : '75%',
  maxConcurrency: 5,
  
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Faster test execution
  detectOpenHandles: true,
  forceExit: false,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ]
};
