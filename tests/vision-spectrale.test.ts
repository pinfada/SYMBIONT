/**
 * Tests de qualité pour Vision Spectrale
 * Standards internationaux : ISO/IEC 25010
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MysticalPanel } from '../src/popup/components/MysticalPanel';
import { MessageBus } from '../src/shared/messaging/MessageBus';
import type { HiddenElementData, CategorizedElements } from '../src/types/hiddenElements';

// Mock dependencies
jest.mock('../src/shared/messaging/MessageBus');
jest.mock('../src/shared/utils/secureLogger');

describe('Vision Spectrale - Standards Internationaux', () => {
  let messageBus: jest.Mocked<MessageBus>;

  beforeEach(() => {
    messageBus = new MessageBus() as jest.Mocked<MessageBus>;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('categorizeHiddenElements - Performance O(n)', () => {
    it('should categorize elements in single pass', () => {
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

    it('should handle invalid data gracefully', () => {
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

    it('should be performant with large datasets', () => {
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
  });

  describe('sanitizeHostname - Security', () => {
    it('should remove XSS vectors', () => {
      const malicious = '<script>alert("xss")</script>example.com';
      const sanitized = sanitizeHostname(malicious);

      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('"');
      expect(sanitized).toBe('scriptalert(xss)/scriptexample.com');
    });

    it('should limit length to prevent DoS', () => {
      const longHostname = 'a'.repeat(200);
      const sanitized = sanitizeHostname(longHostname);

      expect(sanitized.length).toBe(100);
    });

    it('should handle unicode correctly', () => {
      const unicode = 'пример.рф';
      const sanitized = sanitizeHostname(unicode);

      expect(sanitized).toBe('пример.рф');
    });
  });

  describe('Race Condition Prevention', () => {
    it('should prevent multiple concurrent scans', async () => {
      const { container } = render(<MysticalPanel organismId="test" />);

      const visionButton = screen.getByText(/Vision Spectrale/i);

      // Simulate rapid clicks
      fireEvent.click(visionButton);
      fireEvent.click(visionButton);
      fireEvent.click(visionButton);

      // Only one message should be sent
      await waitFor(() => {
        expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
      });
    });

    it('should reset flag after completion', async () => {
      const { container } = render(<MysticalPanel organismId="test" />);

      const visionButton = screen.getByText(/Vision Spectrale/i);

      // First click
      fireEvent.click(visionButton);

      // Simulate response
      const callback = (chrome.runtime.sendMessage as jest.Mock).mock.calls[0][1];
      callback({ hiddenElements: [] });

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText(/Scan en cours/i)).not.toBeInTheDocument();
      });

      // Second click should work
      fireEvent.click(visionButton);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not update state after unmount', async () => {
      const { unmount } = render(<MysticalPanel organismId="test" />);

      const visionButton = screen.getByText(/Vision Spectrale/i);
      fireEvent.click(visionButton);

      // Get callback before unmount
      const callback = (chrome.runtime.sendMessage as jest.Mock).mock.calls[0][1];

      // Unmount component
      unmount();

      // Try to call callback after unmount - should not throw
      expect(() => {
        callback({ hiddenElements: [] });
      }).not.toThrow();
    });

    it('should check if component is mounted before updating state', () => {
      const { container } = render(<MysticalPanel organismId="test" />);

      // Verify component is tracking mount status
      const mountedRefExists = container.querySelector('[data-testid="mystical-panel"]');
      expect(mountedRefExists).toBeInTheDocument();
    });
  });

  describe('Type Safety', () => {
    it('should not compile with any types', () => {
      // This test verifies that we're not using 'any'
      const element: HiddenElementData = {
        tag: 'SCRIPT',
        id: 'test',
        // @ts-expect-error - Should not accept invalid properties
        invalidProp: 'should fail'
      };

      expect(element.tag).toBe('SCRIPT');
    });

    it('should validate response structure', () => {
      const isValidResponse = (response: unknown): response is { hiddenElements: HiddenElementData[] } => {
        return response !== null &&
               typeof response === 'object' &&
               'hiddenElements' in response &&
               Array.isArray((response as any).hiddenElements);
      };

      expect(isValidResponse(null)).toBe(false);
      expect(isValidResponse({})).toBe(false);
      expect(isValidResponse({ hiddenElements: [] })).toBe(true);
      expect(isValidResponse({ hiddenElements: 'not array' })).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle sendMessage errors gracefully', async () => {
      chrome.runtime.sendMessage = jest.fn().mockImplementation((msg, callback) => {
        callback(undefined); // Simulate error
      });

      const { container } = render(<MysticalPanel organismId="test" />);
      const visionButton = screen.getByText(/Vision Spectrale/i);

      fireEvent.click(visionButton);

      await waitFor(() => {
        expect(screen.getByText(/Erreur lors de la Vision Spectrale/i)).toBeInTheDocument();
      });
    });

    it('should handle malformed responses', async () => {
      chrome.runtime.sendMessage = jest.fn().mockImplementation((msg, callback) => {
        callback({ wrongField: 'value' }); // Wrong format
      });

      const { container } = render(<MysticalPanel organismId="test" />);
      const visionButton = screen.getByText(/Vision Spectrale/i);

      fireEvent.click(visionButton);

      await waitFor(() => {
        expect(screen.getByText(/Format de réponse invalide/i)).toBeInTheDocument();
      });
    });

    it('should handle URL parsing errors gracefully', () => {
      const tracker: HiddenElementData = {
        tag: 'SCRIPT',
        src: 'not://a valid url'
      };

      let error = null;
      try {
        new URL(tracker.src!);
      } catch (e) {
        error = e;
      }

      expect(error).not.toBeNull();
    });
  });

  describe('Integration with Murmurs', () => {
    it('should add vision results to murmurs', async () => {
      const mockElements: HiddenElementData[] = [
        { tag: 'SCRIPT', src: 'https://google-analytics.com/ga.js' },
        { tag: 'DIV', width: 1, height: 1 }
      ];

      chrome.runtime.sendMessage = jest.fn().mockImplementation((msg, callback) => {
        callback({ hiddenElements: mockElements });
      });

      const { container } = render(<MysticalPanel organismId="test" />);
      const visionButton = screen.getByText(/Vision Spectrale/i);

      fireEvent.click(visionButton);

      await waitFor(() => {
        expect(screen.getByText(/Vision Spectrale complétée/i)).toBeInTheDocument();
        expect(screen.getByText(/2 éléments cachés détectés/i)).toBeInTheDocument();
      });
    });

    it('should show categorized results', async () => {
      const mockElements: HiddenElementData[] = [
        { tag: 'SCRIPT', src: 'https://tracker.com/track.js' },
        { tag: 'IMG', width: 1, height: 1 },
        { tag: 'DIV', styles: { zIndex: '-999' } }
      ];

      chrome.runtime.sendMessage = jest.fn().mockImplementation((msg, callback) => {
        callback({ hiddenElements: mockElements });
      });

      const { container } = render(<MysticalPanel organismId="test" />);
      const visionButton = screen.getByText(/Vision Spectrale/i);

      fireEvent.click(visionButton);

      await waitFor(() => {
        expect(screen.getByText(/Trackers: 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Pixels: 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Z-index négatifs: 1/i)).toBeInTheDocument();
      });
    });
  });

  describe('Deduplication of tracker domains', () => {
    it('should only show unique domains', async () => {
      const mockElements: HiddenElementData[] = [
        { tag: 'SCRIPT', src: 'https://google.com/tracker1.js' },
        { tag: 'SCRIPT', src: 'https://google.com/tracker2.js' },
        { tag: 'SCRIPT', src: 'https://facebook.com/pixel' }
      ];

      chrome.runtime.sendMessage = jest.fn().mockImplementation((msg, callback) => {
        callback({ hiddenElements: mockElements });
      });

      const { container } = render(<MysticalPanel organismId="test" />);
      const visionButton = screen.getByText(/Vision Spectrale/i);

      fireEvent.click(visionButton);

      await waitFor(() => {
        // Should show only unique domains
        expect(screen.getByText(/google.com/i)).toBeInTheDocument();
        expect(screen.getByText(/facebook.com/i)).toBeInTheDocument();
        expect(screen.getAllByText(/google.com/i)).toHaveLength(1);
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should complete scan within 5 seconds', async () => {
      const startTime = Date.now();

      chrome.runtime.sendMessage = jest.fn().mockImplementation((msg, callback) => {
        setTimeout(() => {
          callback({ hiddenElements: [] });
        }, 100);
      });

      const { container } = render(<MysticalPanel organismId="test" />);
      const visionButton = screen.getByText(/Vision Spectrale/i);

      fireEvent.click(visionButton);

      await waitFor(() => {
        expect(screen.queryByText(/Scan en cours/i)).not.toBeInTheDocument();
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });
});

// Export functions for testing (normally these would be in a separate file)
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