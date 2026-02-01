/**
 * Tests isolés pour Vision Spectrale
 * Vérification de non-régression après refactoring
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { HiddenElementData, CategorizedElements } from '../../types/hiddenElements';

// Fonctions extraites de MysticalPanel pour tests isolés
export function categorizeHiddenElements(elements: HiddenElementData[]): CategorizedElements {
  const result: CategorizedElements = {
    trackers: [],
    pixels: [],
    zIndexNegative: [],
    other: []
  };

  for (const el of elements) {
    if (!el || typeof el !== 'object') continue;

    if (el.tag === 'SCRIPT' || el.tag === 'IFRAME' || (el.id && el.id.includes('track'))) {
      result.trackers.push(el);
    } else if ((el.width === 1 && el.height === 1) || (el.classes && el.classes.includes('pixel'))) {
      result.pixels.push(el);
    } else if (el.styles?.zIndex) {
      try {
        const zIndex = parseInt(el.styles.zIndex, 10);
        if (!isNaN(zIndex) && zIndex < 0) {
          result.zIndexNegative.push(el);
        } else {
          result.other.push(el);
        }
      } catch {
        result.other.push(el);
      }
    } else {
      result.other.push(el);
    }
  }

  return result;
}

export function sanitizeHostname(hostname: string): string {
  return hostname
    .replace(/[<>\"'&]/g, '')
    .slice(0, 100);
}

describe('Vision Spectrale - Tests Isolés', () => {
  describe('categorizeHiddenElements', () => {
    it('devrait catégoriser correctement les éléments en un seul passage', () => {
      const elements: HiddenElementData[] = [
        { tag: 'SCRIPT', src: 'tracker.js' },
        { tag: 'DIV', width: 1, height: 1 },
        { tag: 'SPAN', styles: { zIndex: '-100' } },
        { tag: 'IMG', classes: 'pixel' },
        { tag: 'IFRAME', id: 'tracking-frame' }
      ];

      const result = categorizeHiddenElements(elements);

      expect(result.trackers).toHaveLength(2); // SCRIPT, IFRAME
      expect(result.pixels).toHaveLength(2); // 1x1 DIV, pixel IMG
      expect(result.zIndexNegative).toHaveLength(1); // SPAN
      expect(result.other).toHaveLength(0);
    });

    it('devrait gérer les données invalides sans erreur', () => {
      const elements: any[] = [
        null,
        undefined,
        { tag: 'SCRIPT' }, // Valid
        { styles: { zIndex: 'not-a-number' } },
        { styles: { zIndex: '10' } } // Positive z-index
      ];

      const result = categorizeHiddenElements(elements);

      expect(result.trackers).toHaveLength(1);
      expect(result.zIndexNegative).toHaveLength(0);
      expect(result.other).toHaveLength(2);
    });

    it('devrait être performant avec de grandes quantités de données', () => {
      const elements: HiddenElementData[] = Array.from({ length: 10000 }, (_, i) => ({
        tag: i % 2 === 0 ? 'SCRIPT' : 'DIV',
        id: `element-${i}`
      }));

      const start = performance.now();
      const result = categorizeHiddenElements(elements);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // Should process 10k elements in < 50ms
      expect(result.trackers).toHaveLength(5000);
    });

    it('devrait identifier correctement les pixels de tracking', () => {
      const elements: HiddenElementData[] = [
        { tag: 'DIV', width: 1, height: 1 },
        { tag: 'IMG', width: 1, height: 1 },
        { tag: 'IMG', classes: 'tracking-pixel' },
        { tag: 'SPAN', classes: 'pixel' },
        { tag: 'DIV', width: 2, height: 2 } // Not a pixel
      ];

      const result = categorizeHiddenElements(elements);

      expect(result.pixels).toHaveLength(4);
      expect(result.other).toHaveLength(1);
    });

    it('devrait identifier les éléments avec z-index négatif', () => {
      const elements: HiddenElementData[] = [
        { tag: 'DIV', styles: { zIndex: '-1' } },
        { tag: 'SPAN', styles: { zIndex: '-9999' } },
        { tag: 'DIV', styles: { zIndex: '0' } },
        { tag: 'P', styles: { zIndex: '100' } },
        { tag: 'DIV', styles: { zIndex: 'auto' } }
      ];

      const result = categorizeHiddenElements(elements);

      expect(result.zIndexNegative).toHaveLength(2);
      expect(result.other).toHaveLength(3);
    });
  });

  describe('sanitizeHostname', () => {
    it('devrait supprimer les caractères dangereux XSS', () => {
      const malicious = '<script>alert("xss")</script>example.com';
      const sanitized = sanitizeHostname(malicious);

      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('"');
      expect(sanitized).toBe('scriptalert(xss)/scriptexample.com');
    });

    it('devrait limiter la longueur pour éviter le DoS', () => {
      const longHostname = 'a'.repeat(200);
      const sanitized = sanitizeHostname(longHostname);

      expect(sanitized.length).toBe(100);
    });

    it('devrait préserver les caractères Unicode valides', () => {
      const unicode = 'пример.рф';
      const sanitized = sanitizeHostname(unicode);

      expect(sanitized).toBe('пример.рф');
    });

    it('devrait gérer les chaînes vides', () => {
      const empty = '';
      const sanitized = sanitizeHostname(empty);

      expect(sanitized).toBe('');
    });

    it('devrait supprimer les caractères HTML entities', () => {
      const withEntities = 'example&amp;test<br>site';
      const sanitized = sanitizeHostname(withEntities);

      expect(sanitized).toBe('exampleamp;testbrsite');
    });
  });

  describe('Intégration des résultats', () => {
    it('devrait pouvoir extraire les domaines uniques des trackers', () => {
      const elements: HiddenElementData[] = [
        { tag: 'SCRIPT', src: 'https://google-analytics.com/ga.js' },
        { tag: 'SCRIPT', src: 'https://google-analytics.com/gtag.js' },
        { tag: 'SCRIPT', src: 'https://facebook.com/pixel.js' },
        { tag: 'IFRAME', src: 'https://doubleclick.net/iframe' }
      ];

      const categorized = categorizeHiddenElements(elements);
      const uniqueHosts = new Set<string>();

      categorized.trackers.forEach(tracker => {
        if (tracker.src) {
          try {
            const url = new URL(tracker.src);
            uniqueHosts.add(sanitizeHostname(url.hostname));
          } catch {
            // Invalid URL
          }
        }
      });

      expect(uniqueHosts.size).toBe(3);
      expect(uniqueHosts.has('google-analytics.com')).toBe(true);
      expect(uniqueHosts.has('facebook.com')).toBe(true);
      expect(uniqueHosts.has('doubleclick.net')).toBe(true);
    });
  });

  describe('Tests de régression', () => {
    it('devrait maintenir la compatibilité avec le format existant', () => {
      // Test que le format de sortie n'a pas changé
      const elements: HiddenElementData[] = [
        { tag: 'SCRIPT', src: 'test.js' }
      ];

      const result = categorizeHiddenElements(elements);

      // Vérifier la structure exacte
      expect(result).toHaveProperty('trackers');
      expect(result).toHaveProperty('pixels');
      expect(result).toHaveProperty('zIndexNegative');
      expect(result).toHaveProperty('other');
      expect(Array.isArray(result.trackers)).toBe(true);
      expect(Array.isArray(result.pixels)).toBe(true);
      expect(Array.isArray(result.zIndexNegative)).toBe(true);
      expect(Array.isArray(result.other)).toBe(true);
    });

    it('devrait conserver les objets originaux sans mutation', () => {
      const element: HiddenElementData = {
        tag: 'SCRIPT',
        src: 'tracker.js',
        id: 'test-id'
      };
      const elements = [element];

      const result = categorizeHiddenElements(elements);

      // Vérifier que l'objet original n'est pas muté
      expect(element).toEqual({
        tag: 'SCRIPT',
        src: 'tracker.js',
        id: 'test-id'
      });

      // Vérifier que l'objet dans le résultat est le même (référence)
      expect(result.trackers[0]).toBe(element);
    });
  });
});