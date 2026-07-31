/**
 * Tests pour les utilitaires de génération sécurisée de nombres aléatoires
 *
 * jsdom expose déjà un vrai `crypto.getRandomValues` (et l'installe via un
 * getter non remplaçable par simple affectation). On teste donc les propriétés
 * observables — format, plage, distribution — plutôt que d'espionner un mock
 * privé qui ne s'appliquerait pas de façon fiable. Pour les scénarios
 * « fallback », on retire temporairement `crypto` et on vérifie le repli
 * déterministe ainsi que l'avertissement émis via le `logger` (et non
 * `console.warn`, conformément à l'implémentation courante).
 */

import { SecureRandom } from '../../src/shared/utils/secureRandom';
import { logger } from '../../src/shared/utils/secureLogger';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Exécute `fn` avec `crypto` temporairement indisponible, puis restaure le
 * descripteur d'origine (le getter jsdom).
 */
function withoutCrypto(fn: () => void): void {
  const originalDesc = Object.getOwnPropertyDescriptor(global, 'crypto');
  Object.defineProperty(global, 'crypto', {
    value: undefined,
    configurable: true,
    writable: true,
  });
  try {
    fn();
  } finally {
    if (originalDesc) {
      Object.defineProperty(global, 'crypto', originalDesc);
    }
  }
}

describe('SecureRandom', () => {
  describe('random()', () => {
    it('should return a number between 0 and 1', () => {
      const result = SecureRandom.random();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });

    it('should use crypto.getRandomValues when available', () => {
      const spy = jest.spyOn(global.crypto, 'getRandomValues');
      SecureRandom.random();
      expect(spy).toHaveBeenCalledWith(expect.any(Uint32Array));
      spy.mockRestore();
    });

    it('should produce a broad spread of distinct values', () => {
      const values = new Set<number>();
      for (let i = 0; i < 200; i++) {
        values.add(SecureRandom.random());
      }
      // Un vrai CSPRNG ne doit pas se répéter ; on tolère de rares collisions.
      expect(values.size).toBeGreaterThan(190);
    });

    it('should use a deterministic fallback and warn when crypto is unavailable', () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation();

      withoutCrypto(() => {
        const result = SecureRandom.random();
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(1);
        expect(errorSpy).toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalled();
      });

      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('randomInt()', () => {
    it('should return integer within specified range', () => {
      for (let i = 0; i < 50; i++) {
        const result = SecureRandom.randomInt(5, 15);
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(5);
        expect(result).toBeLessThan(15);
      }
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
    it('should return float within specified range', () => {
      for (let i = 0; i < 50; i++) {
        const result = SecureRandom.randomFloat(1.0, 3.0);
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(1.0);
        expect(result).toBeLessThan(3.0);
      }
    });

    it('should throw error if min >= max', () => {
      expect(() => SecureRandom.randomFloat(3.0, 1.0)).toThrow(
        'SecureRandom: min doit être inférieur à max'
      );
    });
  });

  describe('randomBytes()', () => {
    it('should return Uint8Array of specified length', () => {
      const spy = jest.spyOn(global.crypto, 'getRandomValues');
      const result = SecureRandom.randomBytes(10);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(10);
      expect(spy).toHaveBeenCalledWith(expect.any(Uint8Array));
      spy.mockRestore();
    });

    it('should use a deterministic fallback and warn when crypto is unavailable', () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation();

      withoutCrypto(() => {
        const result = SecureRandom.randomBytes(5);
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(5);
        expect(errorSpy).toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalled();
      });

      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('choice()', () => {
    it('should return an element from the array', () => {
      const array = ['a', 'b', 'c', 'd'];
      for (let i = 0; i < 50; i++) {
        const result = SecureRandom.choice(array);
        expect(array).toContain(result);
      }
    });

    it('should throw error for empty array', () => {
      expect(() => SecureRandom.choice([])).toThrow(
        'SecureRandom: Le tableau ne peut pas être vide'
      );
    });
  });

  describe('uuid()', () => {
    it('should return valid UUID v4 format', () => {
      const result = SecureRandom.uuid();
      expect(typeof result).toBe('string');
      expect(result).toMatch(UUID_V4_REGEX);
    });

    it('should produce unique UUIDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(SecureRandom.uuid());
      }
      expect(ids.size).toBe(100);
    });

    it('should use a deterministic fallback and warn when crypto is unavailable', () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation();

      withoutCrypto(() => {
        const result = SecureRandom.uuid();
        expect(typeof result).toBe('string');
        expect(result).toMatch(UUID_V4_REGEX);
        expect(errorSpy).toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalled();
      });

      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('randomString()', () => {
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
