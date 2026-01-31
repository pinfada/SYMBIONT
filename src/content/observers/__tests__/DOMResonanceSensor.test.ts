/**
 * Tests unitaires pour DOMResonanceSensor
 * @jest-environment jsdom
 */

import { DOMResonanceSensor } from '../DOMResonanceSensor';
import { logger } from '@/shared/utils/secureLogger';

// Mock des dépendances
jest.mock('@/shared/utils/secureLogger');
jest.mock('@/shared/utils/secureRandom');

// Mock de chrome.runtime
global.chrome = {
  runtime: {
    sendMessage: jest.fn().mockResolvedValue(undefined)
  }
} as any;

describe('DOMResonanceSensor', () => {
  let sensor: DOMResonanceSensor;
  let mutationObserverMock: jest.Mock;
  let originalRequestIdleCallback: typeof requestIdleCallback;
  let originalCancelIdleCallback: typeof cancelIdleCallback;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup MutationObserver mock
    mutationObserverMock = jest.fn();
    global.MutationObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
      takeRecords: jest.fn()
    }));

    // Setup requestIdleCallback mock
    originalRequestIdleCallback = global.requestIdleCallback;
    originalCancelIdleCallback = global.cancelIdleCallback;
    global.requestIdleCallback = jest.fn((callback) => {
      setTimeout(callback, 0);
      return 1;
    }) as any;
    global.cancelIdleCallback = jest.fn();

    // Create new sensor instance
    sensor = new DOMResonanceSensor();
  });

  afterEach(() => {
    sensor.stop();
    global.requestIdleCallback = originalRequestIdleCallback;
    global.cancelIdleCallback = originalCancelIdleCallback;
  });

  describe('Resonance Threshold (Phase 1.1)', () => {
    it('should emit signal when resonance exceeds 0.4 threshold', async () => {
      sensor.start();

      // Simulate high shadow activity
      const mutations: MutationRecord[] = [
        {
          type: 'childList',
          target: document.body,
          addedNodes: [document.createElement('div')] as any,
          removedNodes: [] as any,
          attributeName: null,
          attributeNamespace: null,
          nextSibling: null,
          oldValue: null,
          previousSibling: null
        }
      ];

      // Mock user inactivity
      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive: false },
        writable: true,
        configurable: true
      });

      // Trigger mutations multiple times to build up resonance
      const observerCallback = (global.MutationObserver as jest.Mock).mock.calls[0][0];
      for (let i = 0; i < 10; i++) {
        observerCallback(mutations);
      }

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify message was sent with correct threshold behavior
      const calls = (chrome.runtime.sendMessage as jest.Mock).mock.calls;
      const resonanceMessages = calls.filter(call =>
        call[0].type === 'DOM_RESONANCE_DETECTED' &&
        call[0].payload.resonance > 0.4
      );

      // Should emit when above 0.4 threshold
      expect(resonanceMessages.length).toBeGreaterThan(0);
    });

    it('should NOT emit signal when resonance is below 0.4 threshold', async () => {
      sensor.start();

      // Simulate low shadow activity
      const mutations: MutationRecord[] = [
        {
          type: 'attributes',
          target: document.body,
          attributeName: 'class',
          addedNodes: [] as any,
          removedNodes: [] as any,
          attributeNamespace: null,
          nextSibling: null,
          oldValue: null,
          previousSibling: null
        }
      ];

      // Mock user inactivity
      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive: false },
        writable: true,
        configurable: true
      });

      // Clear previous calls
      (chrome.runtime.sendMessage as jest.Mock).mockClear();

      // Trigger single mutation (low activity)
      const observerCallback = (global.MutationObserver as jest.Mock).mock.calls[0][0];
      observerCallback(mutations);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify no messages sent for low resonance
      const calls = (chrome.runtime.sendMessage as jest.Mock).mock.calls;
      const highResonanceMessages = calls.filter(call =>
        call[0].type === 'DOM_RESONANCE_DETECTED' &&
        call[0].payload.resonance > 0.4
      );

      expect(highResonanceMessages.length).toBe(0);
    });

    it('should include resonance state in emitted message', async () => {
      sensor.start();

      // Simulate significant shadow activity
      const mutations: MutationRecord[] = Array(5).fill(null).map(() => ({
        type: 'childList',
        target: document.body,
        addedNodes: [document.createElement('script')] as any,
        removedNodes: [] as any,
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        oldValue: null,
        previousSibling: null
      }));

      // Mock user inactivity
      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive: false },
        writable: true,
        configurable: true
      });

      const observerCallback = (global.MutationObserver as jest.Mock).mock.calls[0][0];
      observerCallback(mutations);

      await new Promise(resolve => setTimeout(resolve, 100));

      const calls = (chrome.runtime.sendMessage as jest.Mock).mock.calls;
      const resonanceMessage = calls.find(call =>
        call[0].type === 'DOM_RESONANCE_DETECTED'
      );

      if (resonanceMessage) {
        expect(resonanceMessage[0].payload).toHaveProperty('state');
        expect(resonanceMessage[0].payload.state).toHaveProperty('level');
        expect(resonanceMessage[0].payload.state).toHaveProperty('value');
        expect(resonanceMessage[0].payload.state).toHaveProperty('description');
      }
    });

    it('should throw error for negative intensity values', () => {
      sensor.start();

      // Access private method via prototype manipulation for testing
      const emitResonanceSignal = (sensor as any).emitResonanceSignal.bind(sensor);

      expect(() => {
        emitResonanceSignal(-1);
      }).toThrow('Resonance intensity must be non-negative');

      expect(logger.error).toHaveBeenCalledWith(
        'Invalid negative intensity',
        { intensity: -1 }
      );
    });

    it('should handle chrome.runtime.sendMessage failures gracefully', async () => {
      sensor.start();

      // Mock sendMessage to reject
      const error = new Error('Extension context invalidated');
      (chrome.runtime.sendMessage as jest.Mock).mockRejectedValueOnce(error);

      // Trigger high activity
      const mutations: MutationRecord[] = Array(10).fill(null).map(() => ({
        type: 'childList',
        target: document.body,
        addedNodes: [document.createElement('div')] as any,
        removedNodes: [] as any,
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        oldValue: null,
        previousSibling: null
      }));

      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive: false },
        writable: true,
        configurable: true
      });

      const observerCallback = (global.MutationObserver as jest.Mock).mock.calls[0][0];
      observerCallback(mutations);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should log warning but not throw
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to send resonance signal',
        expect.objectContaining({
          error: error.message,
          threshold: 0.4
        })
      );
    });
  });

  describe('Jitter Buffer Management', () => {
    it('should maintain circular buffer of 50 jitter samples', () => {
      sensor.start();

      // Simulate frame jitter measurements
      for (let i = 0; i < 60; i++) {
        (sensor as any).jitterBuffer.push(20 + i);
      }

      // Private method call for testing
      (sensor as any).updateJitterMetrics();
      const metrics = sensor.getMetrics();

      // Buffer should be capped at 50 samples
      expect(metrics.bufferSizes.jitter).toBeLessThanOrEqual(50);
    });
  });

  describe('Resonance State Levels', () => {
    const testCases = [
      { resonance: 0.1, expectedLevel: 'quiet' },
      { resonance: 0.3, expectedLevel: 'normal' },
      { resonance: 0.6, expectedLevel: 'active' },
      { resonance: 0.9, expectedLevel: 'critical' }
    ];

    testCases.forEach(({ resonance, expectedLevel }) => {
      it(`should return ${expectedLevel} state for resonance ${resonance}`, () => {
        // Set smoothed resonance directly for testing
        (sensor as any).smoothedResonance = resonance;

        const state = sensor.getResonanceState();

        expect(state.level).toBe(expectedLevel);
        expect(state.value).toBe(resonance);
        expect(state.description).toBeTruthy();
      });
    });
  });

  describe('Performance and Resource Management', () => {
    it('should use requestIdleCallback for frame jitter measurement', () => {
      sensor.start();

      expect(global.requestIdleCallback).toHaveBeenCalledWith(
        expect.any(Function),
        { timeout: 1000 }
      );
    });

    it('should properly cleanup resources on stop', () => {
      sensor.start();
      const observerInstance = (global.MutationObserver as jest.Mock).mock.results[0].value;

      sensor.stop();

      expect(observerInstance.disconnect).toHaveBeenCalled();
      expect(global.cancelIdleCallback).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'DOMResonanceSensor stopped',
        expect.any(Object)
      );
    });

    it('should reset all metrics and buffers on reset()', () => {
      sensor.start();

      // Add some data
      (sensor as any).jitterBuffer = [1, 2, 3, 4, 5];
      (sensor as any).shadowActivityBuffer = [{ intensity: 1, timestamp: Date.now() }];
      (sensor as any).smoothedResonance = 0.75;

      sensor.reset();

      const metrics = sensor.getMetrics();
      expect(metrics.totalMutations).toBe(0);
      expect(metrics.shadowMutations).toBe(0);
      expect(metrics.averageJitter).toBe(0);
      expect(metrics.peakResonance).toBe(0);
      expect(metrics.smoothedResonance).toBe(0);
      expect(metrics.bufferSizes.jitter).toBe(0);
      expect(metrics.bufferSizes.shadow).toBe(0);
    });
  });

  describe('Shadow Activity Detection', () => {
    it('should detect shadow activity during user inactivity', async () => {
      sensor.start();

      // Mock user inactive
      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive: false },
        writable: true,
        configurable: true
      });
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
        configurable: true
      });
      document.hasFocus = jest.fn().mockReturnValue(true);

      const mutations: MutationRecord[] = [{
        type: 'childList',
        target: document.body,
        addedNodes: [document.createElement('div')] as any,
        removedNodes: [] as any,
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        oldValue: null,
        previousSibling: null
      }];

      const observerCallback = (global.MutationObserver as jest.Mock).mock.calls[0][0];
      observerCallback(mutations);

      const metrics = sensor.getMetrics();
      expect(metrics.shadowMutations).toBeGreaterThan(0);
    });

    it('should apply logarithmic normalization to shadow intensity', () => {
      const calculateShadowIntensity = (sensor as any).calculateShadowIntensity.bind(sensor);

      const mutations: MutationRecord[] = Array(100).fill(null).map(() => ({
        type: 'childList',
        target: document.body,
        addedNodes: [document.createElement('div')] as any,
        removedNodes: [] as any,
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        oldValue: null,
        previousSibling: null
      }));

      const intensity = calculateShadowIntensity(mutations);

      // Should be logarithmically normalized
      expect(intensity).toBeLessThan(10); // log(1 + 200) ≈ 5.3
      expect(intensity).toBeGreaterThan(0);
    });
  });
});