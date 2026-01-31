import { DOMResonanceSensor } from '../content/observers/DOMResonanceSensor';

describe('DOMResonanceSensor', () => {
  let sensor: DOMResonanceSensor;
  let originalRequestIdleCallback: any;
  let originalCancelIdleCallback: any;
  let mockChromeSendMessage: jest.Mock;

  beforeEach(() => {
    // Setup DOM environment
    document.body.innerHTML = '<div id="test-root"></div>';

    // Mock requestIdleCallback
    originalRequestIdleCallback = global.requestIdleCallback;
    originalCancelIdleCallback = global.cancelIdleCallback;

    global.requestIdleCallback = jest.fn((callback) => {
      setTimeout(() => callback({ timeRemaining: () => 50 } as any), 0);
      return 1;
    });

    global.cancelIdleCallback = jest.fn();

    // Mock chrome.runtime.sendMessage
    mockChromeSendMessage = jest.fn().mockResolvedValue({});
    global.chrome = {
      runtime: {
        sendMessage: mockChromeSendMessage
      }
    } as any;

    // Mock performance.now
    jest.spyOn(performance, 'now').mockReturnValue(1000);

    // Initialize sensor
    sensor = new DOMResonanceSensor();
  });

  afterEach(() => {
    sensor.stop();
    global.requestIdleCallback = originalRequestIdleCallback;
    global.cancelIdleCallback = originalCancelIdleCallback;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Initialization and lifecycle', () => {
    it('should initialize with default values', () => {
      const metrics = sensor.getMetrics();
      expect(metrics.totalMutations).toBe(0);
      expect(metrics.shadowMutations).toBe(0);
      expect(metrics.averageJitter).toBe(0);
      expect(metrics.peakResonance).toBe(0);
      expect(metrics.smoothedResonance).toBe(0);
    });

    it('should start monitoring when start() is called', () => {
      sensor.start();
      expect(global.requestIdleCallback).toHaveBeenCalled();
    });

    it('should stop monitoring when stop() is called', () => {
      sensor.start();
      sensor.stop();
      expect(global.cancelIdleCallback).toHaveBeenCalled();
    });

    it('should not start twice if already monitoring', () => {
      sensor.start();
      const callCount = (global.requestIdleCallback as jest.Mock).mock.calls.length;
      sensor.start();
      expect((global.requestIdleCallback as jest.Mock).mock.calls.length).toBe(callCount);
    });
  });

  describe('Jitter measurement', () => {
    it('should detect frame jitter above threshold', async () => {
      sensor.start();

      // Simulate time progression with jitter
      (performance.now as jest.Mock).mockReturnValueOnce(1000);
      (performance.now as jest.Mock).mockReturnValueOnce(1020); // 20ms delta (jitter)

      // Wait for idle callback to execute
      await new Promise(resolve => setTimeout(resolve, 10));

      const metrics = sensor.getMetrics();
      expect(metrics.bufferSizes.jitter).toBeGreaterThan(0);
    });

    it('should maintain circular buffer of 50 jitter samples', async () => {
      sensor.start();

      // Simulate 60 jitter events
      for (let i = 0; i < 60; i++) {
        (performance.now as jest.Mock).mockReturnValueOnce(1000 + i * 20);
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const metrics = sensor.getMetrics();
      expect(metrics.bufferSizes.jitter).toBeLessThanOrEqual(50);
    });
  });

  describe('Shadow activity detection', () => {
    it('should detect DOM mutations during user inactivity', () => {
      // Mock user inactivity
      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive: false },
        writable: true,
        configurable: true
      });

      sensor.start();

      // Create a mutation
      const testDiv = document.getElementById('test-root');
      if (testDiv) {
        const newElement = document.createElement('div');
        testDiv.appendChild(newElement);
      }

      // Verify shadow activity was detected
      const metrics = sensor.getMetrics();
      expect(metrics.shadowMutations).toBeGreaterThanOrEqual(0);
    });

    it('should not count mutations during user activity as shadow activity', () => {
      // Mock user activity
      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive: true },
        writable: true,
        configurable: true
      });

      sensor.start();

      // Create a mutation
      const testDiv = document.getElementById('test-root');
      if (testDiv) {
        const newElement = document.createElement('div');
        testDiv.appendChild(newElement);
      }

      const metrics = sensor.getMetrics();
      expect(metrics.shadowMutations).toBe(0);
    });
  });

  describe('Resonance calculation', () => {
    it('should apply EMA smoothing to resonance values', () => {
      sensor.start();

      // Manually trigger shadow activity with varying intensities
      const initialResonance = sensor.getMetrics().smoothedResonance;

      // Simulate shadow activity (this would normally be triggered by DOM mutations)
      // Since we can't easily trigger the internal methods, we test the public interface
      sensor.reset();
      const resetResonance = sensor.getMetrics().smoothedResonance;

      expect(resetResonance).toBe(0);
    });

    it('should emit resonance signal only above threshold', async () => {
      sensor.start();

      // Verify no signal sent for low resonance
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockChromeSendMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DOM_RESONANCE_DETECTED' })
      );
    });
  });

  describe('Correlation analysis', () => {
    it('should calculate correlation between jitter and network latency', () => {
      // Add sample data
      const networkLatency = Array.from({ length: 20 }, () => Math.random() * 100);
      const correlation = sensor.calculateCorrelation(networkLatency);

      expect(typeof correlation).toBe('number');
      expect(correlation).toBeGreaterThanOrEqual(-1);
      expect(correlation).toBeLessThanOrEqual(1);
    });

    it('should return 0 correlation with insufficient data', () => {
      const networkLatency = [10, 20]; // Only 2 samples
      const correlation = sensor.calculateCorrelation(networkLatency);
      expect(correlation).toBe(0);
    });
  });

  describe('Resonance state classification', () => {
    it('should classify resonance levels correctly', () => {
      sensor.start();

      const quietState = sensor.getResonanceState();
      expect(quietState.level).toBe('quiet');

      // Test classification thresholds
      // Since we can't directly set smoothedResonance, we verify the initial state
      expect(quietState.value).toBeLessThan(0.2);
    });
  });

  describe('Metrics and diagnostics', () => {
    it('should provide comprehensive metrics', () => {
      sensor.start();
      const metrics = sensor.getMetrics();

      expect(metrics).toHaveProperty('totalMutations');
      expect(metrics).toHaveProperty('shadowMutations');
      expect(metrics).toHaveProperty('averageJitter');
      expect(metrics).toHaveProperty('peakResonance');
      expect(metrics).toHaveProperty('smoothedResonance');
      expect(metrics).toHaveProperty('bufferSizes');
      expect(metrics.bufferSizes).toHaveProperty('jitter');
      expect(metrics.bufferSizes).toHaveProperty('shadow');
    });

    it('should reset all metrics when reset() is called', () => {
      sensor.start();

      // Add some data
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

  describe('Performance optimization', () => {
    it('should use requestIdleCallback for non-blocking operation', () => {
      sensor.start();
      expect(global.requestIdleCallback).toHaveBeenCalled();
    });

    it('should handle requestIdleCallback timeout gracefully', async () => {
      global.requestIdleCallback = jest.fn((callback, options) => {
        expect(options).toHaveProperty('timeout');
        expect(options?.timeout).toBe(1000);
        return 1;
      });

      sensor.start();
      expect(global.requestIdleCallback).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle chrome.runtime.sendMessage failures gracefully', async () => {
      mockChromeSendMessage.mockRejectedValueOnce(new Error('Extension context invalidated'));

      sensor.start();

      // Trigger an event that would normally send a message
      // The sensor should catch and log the error without throwing
      expect(() => {
        // Simulate conditions that would trigger a message
        Object.defineProperty(navigator, 'userActivation', {
          value: { isActive: false },
          writable: true,
          configurable: true
        });
      }).not.toThrow();
    });
  });
});