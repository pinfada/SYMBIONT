/**
 * Tests pour les utilitaires de génération sécurisée de nombres aléatoires
 */

import { SecureRandom } from '../../src/shared/utils/secureRandom';

// Mock crypto.getRandomValues pour les tests
const mockGetRandomValues = jest.fn();
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: mockGetRandomValues,
  },
  writable: true,
});

describe('SecureRandom', () => {
  beforeEach(() => {
    mockGetRandomValues.mockClear();
  });

  describe('random()', () => {
    it('should return a number between 0 and 1', () => {
      // Mock crypto.getRandomValues to return a known value
      mockGetRandomValues.mockImplementation((array) => {
        array[0] = 0x80000000; // Half of MAX_UINT32
        return array;
      });

      const result = SecureRandom.random();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
      expect(typeof result).toBe('number');
    });

    it('should use crypto.getRandomValues when available', () => {
      mockGetRandomValues.mockImplementation((array) => {
        array[0] = 0x12345678;
        return array;
      });

      SecureRandom.random();
      expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint32Array));
    });

    it('should fall back to Math.random when crypto is not available', () => {
      // Temporarily remove crypto
      const originalCrypto = global.crypto;
      delete (global as any).crypto;

      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = SecureRandom.random();

      expect(result).toBe(0.5);
      expect(mathRandomSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'SecureRandom: crypto.getRandomValues non disponible, utilisation de Math.random()'
      );

      // Restore
      global.crypto = originalCrypto;
      mathRandomSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('randomInt()', () => {
    beforeEach(() => {
      mockGetRandomValues.mockImplementation((array) => {
        array[0] = 0x40000000; // Quarter of MAX_UINT32
        return array;
      });
    });

    it('should return integer within specified range', () => {
      const result = SecureRandom.randomInt(5, 15);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(5);
      expect(result).toBeLessThan(15);
    });

    it('should throw error if min >= max', () => {
      expect(() => SecureRandom.randomInt(10, 5)).toThrow(
        'SecureRandom: min doit être inférieur à max'
      );
      expect(() => SecureRandom.randomInt(5, 5)).toThrow(
        'SecureRandom: min doit être inférieur à max'
      );
    });
  });

  describe('randomFloat()', () => {
    beforeEach(() => {
      mockGetRandomValues.mockImplementation((array) => {
        array[0] = 0x40000000; // Quarter of MAX_UINT32 (0.25)
        return array;
      });
    });

    it('should return float within specified range', () => {
      const result = SecureRandom.randomFloat(1.0, 3.0);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(1.0);
      expect(result).toBeLessThan(3.0);
    });

    it('should throw error if min >= max', () => {
      expect(() => SecureRandom.randomFloat(3.0, 1.0)).toThrow(
        'SecureRandom: min doit être inférieur à max'
      );
    });
  });

  describe('randomBytes()', () => {
    it('should return Uint8Array of specified length', () => {
      mockGetRandomValues.mockImplementation((array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = i % 256;
        }
        return array;
      });

      const result = SecureRandom.randomBytes(10);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(10);
      expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it('should fall back when crypto is not available', () => {
      const originalCrypto = global.crypto;
      delete (global as any).crypto;

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = SecureRandom.randomBytes(5);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(5);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'SecureRandom: crypto.getRandomValues non disponible, génération fallback'
      );

      // Restore
      global.crypto = originalCrypto;
      consoleWarnSpy.mockRestore();
      mathRandomSpy.mockRestore();
    });
  });

  describe('choice()', () => {
    beforeEach(() => {
      mockGetRandomValues.mockImplementation((array) => {
        array[0] = 0x40000000; // Should select index 1 of 4 elements
        return array;
      });
    });

    it('should return an element from the array', () => {
      const array = ['a', 'b', 'c', 'd'];
      const result = SecureRandom.choice(array);
      expect(array).toContain(result);
    });

    it('should throw error for empty array', () => {
      expect(() => SecureRandom.choice([])).toThrow(
        'SecureRandom: Le tableau ne peut pas être vide'
      );
    });
  });

  describe('uuid()', () => {
    it('should return valid UUID v4 format', () => {
      mockGetRandomValues.mockImplementation((array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = i + 0x10;
        }
        return array;
      });

      const result = SecureRandom.uuid();
      expect(typeof result).toBe('string');
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should fall back to Math.random when crypto is not available', () => {
      const originalCrypto = global.crypto;
      delete (global as any).crypto;

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = SecureRandom.uuid();
      
      expect(typeof result).toBe('string');
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'SecureRandom: crypto.getRandomValues non disponible, UUID fallback'
      );

      // Restore
      global.crypto = originalCrypto;
      consoleWarnSpy.mockRestore();
      mathRandomSpy.mockRestore();
    });
  });

  describe('randomString()', () => {
    beforeEach(() => {
      mockGetRandomValues.mockImplementation((array) => {
        array[0] = 0x10000000; // Should select predictable characters
        return array;
      });
    });

    it('should return string of specified length', () => {
      const result = SecureRandom.randomString(10);
      expect(typeof result).toBe('string');
      expect(result.length).toBe(10);
    });

    it('should use custom charset', () => {
      const charset = 'ABC';
      const result = SecureRandom.randomString(5, charset);
      expect(result.length).toBe(5);
      for (const char of result) {
        expect(charset).toContain(char);
      }
    });
  });

  describe('randomId()', () => {
    beforeEach(() => {
      mockGetRandomValues.mockImplementation((array) => {
        array[0] = 0x10000000;
        return array;
      });
    });

    it('should return ID with prefix', () => {
      const result = SecureRandom.randomId('test', 6);
      expect(result).toMatch(/^test_[A-Za-z0-9]{6}$/);
    });

    it('should return ID without prefix', () => {
      const result = SecureRandom.randomId('', 8);
      expect(result).toMatch(/^[A-Za-z0-9]{8}$/);
    });

    it('should use default length', () => {
      const result = SecureRandom.randomId('prefix');
      expect(result).toMatch(/^prefix_[A-Za-z0-9]{8}$/);
    });
  });
});