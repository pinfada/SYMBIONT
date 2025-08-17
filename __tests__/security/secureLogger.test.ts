/**
 * Tests pour le système de logging sécurisé
 */

import { SecureLogger, LogLevel } from '../../src/shared/utils/secureLogger';

describe('SecureLogger', () => {
  let logger: SecureLogger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset singleton instance for each test
    (SecureLogger as any).instance = undefined;
    
    // Mock console methods
    consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
    
    // Mock process.env
    Object.defineProperty(process, 'env', {
      value: { NODE_ENV: 'test' },
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getInstance()', () => {
    it('should return singleton instance', () => {
      const instance1 = SecureLogger.getInstance();
      const instance2 = SecureLogger.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should configure logger with provided config', () => {
      const config = {
        level: LogLevel.WARN,
        enableConsole: false,
        enableStorage: false,
      };
      logger = SecureLogger.getInstance(config);
      
      // Log at DEBUG level (should be filtered out)
      logger.debug('test message');
      expect(consoleSpy).not.toHaveBeenCalled();
      
      // Log at WARN level (should pass through)
      logger.warn('warn message');
      expect(consoleSpy).not.toHaveBeenCalled(); // Console disabled
    });
  });

  describe('Data Sanitization', () => {
    beforeEach(() => {
      logger = SecureLogger.getInstance({
        level: LogLevel.DEBUG,
        enableConsole: true,
        enableStorage: true,
      });
    });

    it('should sanitize sensitive strings', () => {
      const sensitiveData = {
        password: 'secret123',
        token: 'abc123token',
        apiKey: 'sk-1234567890abcdef',
        email: 'user@example.com',
        normalData: 'this is fine',
      };

      logger.info('Test with sensitive data', sensitiveData);
      
      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      expect(lastLog.data.password).toBe('[REDACTED]');
      expect(lastLog.data.token).toBe('[REDACTED]');
      expect(lastLog.data.apiKey).toBe('[REDACTED]');
      expect(lastLog.data.normalData).toBe('this is fine');
      expect(lastLog.sanitized).toBe(true);
    });

    it('should detect and sanitize pattern-based sensitive data', () => {
      const sensitiveString = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      
      logger.warn(sensitiveString);
      
      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      expect(lastLog.message).toContain('[REDACTED]');
    });

    it('should sanitize nested objects', () => {
      const nestedData = {
        user: {
          name: 'John',
          password: 'secret',
          settings: {
            apiToken: 'token123',
            theme: 'dark',
          },
        },
      };

      logger.info('Nested data test', nestedData);
      
      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      expect(lastLog.data.user.name).toBe('John');
      expect(lastLog.data.user.password).toBe('[REDACTED]');
      expect(lastLog.data.user.settings.apiToken).toBe('[REDACTED]');
      expect(lastLog.data.user.settings.theme).toBe('dark');
    });

    it('should sanitize arrays', () => {
      const arrayData = [
        { id: 1, secret: 'hidden' },
        { id: 2, name: 'visible' },
      ];

      logger.info('Array data test', arrayData);
      
      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1];
      
      expect(lastLog.data[0].id).toBe(1);
      expect(lastLog.data[0].secret).toBe('[REDACTED]');
      expect(lastLog.data[1].name).toBe('visible');
    });
  });

  describe('Log Levels', () => {
    beforeEach(() => {
      logger = SecureLogger.getInstance({
        level: LogLevel.INFO,
        enableConsole: true,
        enableStorage: true,
      });
    });

    it('should respect log level filtering', () => {
      logger.debug('debug message'); // Should be filtered
      logger.info('info message');   // Should pass
      logger.warn('warn message');   // Should pass
      logger.error('error message'); // Should pass

      const logs = logger.getLogs();
      expect(logs.length).toBe(3); // debug filtered out
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[1].level).toBe(LogLevel.WARN);
      expect(logs[2].level).toBe(LogLevel.ERROR);
    });

    it('should log to appropriate console methods', () => {
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const infoSpy = jest.spyOn(console, 'info').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      logger.setLevel(LogLevel.DEBUG);
      
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      logger.fatal('fatal');

      expect(debugSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(2); // error + fatal
    });
  });

  describe('Log Storage', () => {
    beforeEach(() => {
      logger = SecureLogger.getInstance({
        level: LogLevel.DEBUG,
        enableConsole: false,
        enableStorage: true,
        maxStorageEntries: 3,
      });
    });

    it('should store logs with proper structure', () => {
      logger.info('test message', { name: 'value' }, 'TestContext');
      
      const logs = logger.getLogs();
      const log = logs[0];
      
      expect(log.timestamp).toBeGreaterThan(0);
      expect(log.level).toBe(LogLevel.INFO);
      expect(log.message).toBe('test message');
      expect(log.data).toEqual({ name: 'value' });
      expect(log.context).toBe('TestContext');
      expect(log.sanitized).toBe(true);
    });

    it('should limit stored entries', () => {
      logger.info('message 1');
      logger.info('message 2');
      logger.info('message 3');
      logger.info('message 4'); // Should cause oldest to be removed
      
      const logs = logger.getLogs();
      expect(logs.length).toBe(3);
      expect(logs[0].message).toBe('message 2');
      expect(logs[2].message).toBe('message 4');
    });

    it('should filter logs by level when retrieving', () => {
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      const errorLogs = logger.getLogs(LogLevel.ERROR);
      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].level).toBe(LogLevel.ERROR);

      const warnAndAbove = logger.getLogs(LogLevel.WARN);
      expect(warnAndAbove.length).toBe(2);
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      // Mock production environment
      Object.defineProperty(process, 'env', {
        value: { NODE_ENV: 'production' },
        writable: true,
      });
      
      // Mock Chrome extension environment
      Object.defineProperty(global, 'chrome', {
        value: {
          runtime: {
            getManifest: () => ({ name: 'test' }),
          },
        },
        writable: true,
      });
    });

    afterEach(() => {
      delete (global as any).chrome;
    });

    it('should disable console in production by default', () => {
      logger = SecureLogger.getInstance();
      
      logger.info('production message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      const logs = logger.getLogs();
      expect(logs.length).toBe(1); // Still stored
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      logger = SecureLogger.getInstance({
        level: LogLevel.DEBUG,
        enableConsole: true,
        enableStorage: true,
      });
    });

    it('should change log level dynamically', () => {
      logger.setLevel(LogLevel.WARN);
      
      logger.debug('debug'); // Should be filtered
      logger.info('info');   // Should be filtered
      logger.warn('warn');   // Should pass
      
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe(LogLevel.WARN);
    });

    it('should enable/disable console dynamically', () => {
      logger.enableConsole(false);
      logger.info('test');
      expect(consoleSpy).not.toHaveBeenCalled();
      
      logger.enableConsole(true);
      logger.info('test2');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should clear logs', () => {
      logger.info('message 1');
      logger.info('message 2');
      
      expect(logger.getLogs().length).toBe(2);
      
      logger.clearLogs();
      
      expect(logger.getLogs().length).toBe(0);
    });

    it('should export logs as JSON', () => {
      logger.info('message 1', { data: 'test' });
      logger.warn('message 2');
      
      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0].message).toBe('message 1');
      expect(parsed[1].message).toBe('message 2');
    });
  });
});