/**
 * Tests d'intégration pour les améliorations Phase 1
 * @jest-environment jsdom
 */

import { DOMResonanceSensor } from '@/content/observers/DOMResonanceSensor';
import { CountermeasureHandler } from '@/content/rituals/CountermeasureHandler';
import { OrganismCore } from '@/core/OrganismCore';
import { NeuralMesh } from '@/core/NeuralMesh';
import { logger } from '@/shared/utils/secureLogger';

// Mock des dépendances
jest.mock('@/shared/utils/secureLogger');
jest.mock('@/shared/utils/secureRandom');

// Mock Chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 1, url: 'http://test.com' }]),
    sendMessage: jest.fn().mockResolvedValue({ success: true })
  }
} as any;

describe('Phase 1 Improvements Integration Tests', () => {
  let sensor: DOMResonanceSensor;
  let countermeasureHandler: CountermeasureHandler;
  let organism: OrganismCore;

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize components
    sensor = new DOMResonanceSensor();
    countermeasureHandler = new CountermeasureHandler();

    // Create organism with neural mesh
    const neuralMesh = new NeuralMesh();
    organism = new OrganismCore(
      'test-dna-sequence-12345',
      {
        intuition: 0.5,
        consciousness: 0.3,
        focus: 0.6,
        memory: 0.4,
        curiosity: 0.5,
        cortisol: 0.2
      },
      { neuralMesh, logger }
    );
  });

  afterEach(() => {
    sensor.stop();
    countermeasureHandler.cleanup();
    organism.cleanup();
  });

  describe('Phase 1.1: Micro-Friction Sensory Feedback (Resonance 0.4 Threshold)', () => {
    it('should emit resonance signal only above 0.4 threshold', async () => {
      sensor.start();

      // Mock user inactivity
      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive: false },
        writable: true,
        configurable: true
      });

      // Create mutations that will generate high resonance
      const highActivityMutations: MutationRecord[] = Array(15).fill(null).map(() => ({
        type: 'childList',
        target: document.body,
        addedNodes: [document.createElement('script')] as any,
        removedNodes: [document.createElement('div')] as any,
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        oldValue: null,
        previousSibling: null
      }));

      // Trigger mutations
      const observerCallback = (global.MutationObserver as jest.Mock).mock.calls[0][0];
      observerCallback(highActivityMutations);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that message was sent with resonance > 0.4
      const calls = (chrome.runtime.sendMessage as jest.Mock).mock.calls;
      const resonanceMessages = calls.filter(call =>
        call[0].type === 'DOM_RESONANCE_DETECTED'
      );

      expect(resonanceMessages.length).toBeGreaterThan(0);

      const message = resonanceMessages[0][0];
      expect(message.payload.resonance).toBeGreaterThan(0.4);
      expect(message.payload.state).toBeDefined();
      expect(message.payload.state.level).toBeDefined();
    });

    it('should include proper error handling and logging', async () => {
      sensor.start();

      // Mock sendMessage to reject
      const error = new Error('Extension context invalidated');
      (chrome.runtime.sendMessage as jest.Mock).mockRejectedValueOnce(error);

      // Trigger high activity
      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive: false },
        writable: true,
        configurable: true
      });

      const mutations: MutationRecord[] = Array(20).fill(null).map(() => ({
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

  describe('Phase 1.2: DOM Archaeology with Z-Index Detection', () => {
    it('should detect elements with negative z-index', () => {
      // Create test elements with various z-index values
      const hiddenDiv = document.createElement('div');
      hiddenDiv.style.zIndex = '-999';
      hiddenDiv.textContent = 'Hidden tracking pixel';
      hiddenDiv.id = 'suspicious-element';
      document.body.appendChild(hiddenDiv);

      const normalDiv = document.createElement('div');
      normalDiv.style.zIndex = '10';
      normalDiv.textContent = 'Normal content';
      document.body.appendChild(normalDiv);

      // Mock getComputedStyle to return our z-index values
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = jest.fn((element) => {
        if (element === hiddenDiv) {
          return { zIndex: '-999', position: 'absolute' } as any;
        }
        if (element === normalDiv) {
          return { zIndex: '10', position: 'relative' } as any;
        }
        return originalGetComputedStyle(element);
      });

      // Simulate Vision Spectrale ritual
      const extractHandler = jest.fn();
      chrome.runtime.onMessage.addListener = jest.fn((callback) => {
        extractHandler.mockImplementation(callback);
      });

      // Initialize handler
      new CountermeasureHandler();

      // Send extraction request
      const response = { elements: [], statistics: {} };
      const sendResponse = jest.fn((data) => Object.assign(response, data));

      extractHandler(
        {
          type: 'EXTRACT_HIDDEN_ELEMENTS',
          payload: {
            depth: 10,
            includeZIndex: true,
            maxElements: 50
          }
        },
        {},
        sendResponse
      );

      // Verify z-index negative was detected
      expect(response.statistics.hasNegativeZIndex).toBe(true);

      const negativeZIndexElements = response.elements.filter(
        (el: any) => el.type === 'z-index-negative'
      );

      expect(negativeZIndexElements.length).toBeGreaterThan(0);
      expect(negativeZIndexElements[0].significance).toBe(0.9); // High significance
      expect(negativeZIndexElements[0].metadata.zIndex).toBe(-999);

      // Verify logging
      expect(logger.warn).toHaveBeenCalledWith(
        'Negative z-index element detected',
        expect.objectContaining({
          tag: 'DIV',
          zIndex: -999,
          hasContent: true
        })
      );

      // Cleanup
      hiddenDiv.remove();
      normalDiv.remove();
      window.getComputedStyle = originalGetComputedStyle;
    });

    it('should extract multiple types of hidden elements', () => {
      // Add HTML comment
      const comment = document.createComment('API_KEY=secret123 http://tracking.com/collect');
      document.body.appendChild(comment);

      // Add meta tag
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'analytics-id');
      meta.setAttribute('content', 'UA-123456-7');
      document.head.appendChild(meta);

      // Add hidden div
      const hiddenDiv = document.createElement('div');
      hiddenDiv.style.display = 'none';
      hiddenDiv.textContent = 'Tracking code here';
      document.body.appendChild(hiddenDiv);

      // Add data attribute element
      const dataElement = document.createElement('div');
      dataElement.setAttribute('data-api', 'https://api.tracker.com/v1/collect');
      dataElement.setAttribute('data-config', '{"userId":"12345","session":"abc"}');
      document.body.appendChild(dataElement);

      // Extract hidden elements
      const extractHandler = jest.fn();
      chrome.runtime.onMessage.addListener = jest.fn((callback) => {
        extractHandler.mockImplementation(callback);
      });

      new CountermeasureHandler();

      const response = { elements: [], statistics: {} };
      const sendResponse = jest.fn((data) => Object.assign(response, data));

      extractHandler(
        {
          type: 'EXTRACT_HIDDEN_ELEMENTS',
          payload: { maxElements: 100, depth: 5 }
        },
        {},
        sendResponse
      );

      // Verify different types were detected
      const types = response.statistics.byType;
      expect(types).toHaveProperty('comment');
      expect(types).toHaveProperty('meta');
      expect(types).toHaveProperty('hidden');
      expect(types).toHaveProperty('data');

      // Verify suspicious patterns were identified
      expect(response.statistics.suspiciousPatterns).toBeGreaterThan(0);

      // Cleanup
      comment.remove();
      meta.remove();
      hiddenDiv.remove();
      dataElement.remove();
    });
  });

  describe('Phase 1.2: Organism Trait Evolution from Hidden Elements', () => {
    it('should update organism traits based on hidden element discoveries', () => {
      const initialTraits = organism.getTraits();

      // Simulate hidden elements data from Vision Spectrale
      const hiddenElementsData = {
        elements: [
          { type: 'comment', significance: 0.8, content: 'tracking code' },
          { type: 'z-index-negative', significance: 0.9, content: 'pixel tracker' },
          { type: 'data', significance: 0.6, content: 'data-analytics: enabled' },
          { type: 'hidden', significance: 0.5, content: 'telemetry data' },
          { type: 'meta', significance: 0.7, content: 'fingerprint: 12345' }
        ],
        statistics: {
          total: 5,
          suspiciousPatterns: 4,
          hasNegativeZIndex: true,
          byType: {
            comment: 1,
            'z-index-negative': 1,
            data: 1,
            hidden: 1,
            meta: 1
          }
        }
      };

      // Process hidden elements
      organism.processHiddenElements(hiddenElementsData);

      const updatedTraits = organism.getTraits();

      // Verify trait improvements
      expect(updatedTraits.intuition).toBeGreaterThan(initialTraits.intuition);
      expect(updatedTraits.consciousness).toBeGreaterThan(initialTraits.consciousness);
      expect(updatedTraits.focus).toBeGreaterThanOrEqual(initialTraits.focus);
      expect(updatedTraits.memory).toBeGreaterThanOrEqual(initialTraits.memory);

      // With high suspicious ratio (4/5 = 0.8), cortisol should increase
      expect(updatedTraits.cortisol).toBeGreaterThan(initialTraits.cortisol);
      expect(updatedTraits.curiosity).toBeGreaterThan(initialTraits.curiosity);

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        'Hidden elements processed',
        expect.objectContaining({
          elementsAnalyzed: 5,
          suspiciousPatterns: 4,
          hasNegativeZIndex: true,
          traitsUpdated: expect.arrayContaining(['intuition', 'consciousness'])
        })
      );
    });

    it('should handle energy constraints when processing hidden elements', () => {
      // Deplete organism energy
      organism.setTraits({ energy: 0.01 }); // Very low energy

      const hiddenElementsData = {
        elements: [
          { type: 'comment', significance: 0.8, content: 'test' }
        ],
        statistics: {
          total: 1,
          suspiciousPatterns: 1,
          hasNegativeZIndex: false,
          byType: { comment: 1 }
        }
      };

      const initialTraits = organism.getTraits();

      // Try to process with low energy
      organism.processHiddenElements(hiddenElementsData);

      const finalTraits = organism.getTraits();

      // Traits should not change due to insufficient energy
      expect(finalTraits.intuition).toBe(initialTraits.intuition);
      expect(finalTraits.consciousness).toBe(initialTraits.consciousness);

      // Should log warning
      expect(logger.warn).toHaveBeenCalledWith('Insufficient energy to process hidden elements');
    });
  });

  describe('End-to-End: Vision Spectrale Ritual Flow', () => {
    it('should complete full Vision Spectrale workflow', async () => {
      // 1. Start DOM Resonance monitoring
      sensor.start();

      // 2. Simulate high friction detection
      Object.defineProperty(navigator, 'userActivation', {
        value: { isActive: false },
        writable: true,
        configurable: true
      });

      const mutations: MutationRecord[] = Array(20).fill(null).map(() => ({
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

      const observerCallback = (global.MutationObserver as jest.Mock).mock.calls[0][0];
      observerCallback(mutations);

      await new Promise(resolve => setTimeout(resolve, 100));

      // 3. Verify resonance message sent
      const resonanceMessages = (chrome.runtime.sendMessage as jest.Mock).mock.calls
        .filter(call => call[0].type === 'DOM_RESONANCE_DETECTED');

      expect(resonanceMessages.length).toBeGreaterThan(0);
      expect(resonanceMessages[0][0].payload.resonance).toBeGreaterThan(0.4);

      // 4. Simulate Vision Spectrale activation
      const extractHandler = jest.fn();
      chrome.runtime.onMessage.addListener = jest.fn((callback) => {
        extractHandler.mockImplementation(callback);
      });

      new CountermeasureHandler();

      // Add test elements
      const hiddenElement = document.createElement('div');
      hiddenElement.style.zIndex = '-100';
      hiddenElement.textContent = 'Hidden tracker';
      document.body.appendChild(hiddenElement);

      window.getComputedStyle = jest.fn(() => ({
        zIndex: '-100',
        position: 'absolute'
      })) as any;

      const response = { elements: [], statistics: {} };
      const sendResponse = jest.fn((data) => Object.assign(response, data));

      extractHandler(
        {
          type: 'EXTRACT_HIDDEN_ELEMENTS',
          payload: { includeZIndex: true }
        },
        {},
        sendResponse
      );

      // 5. Verify hidden elements detected
      expect(response.statistics.hasNegativeZIndex).toBe(true);
      expect(response.elements.length).toBeGreaterThan(0);

      // 6. Process in organism
      organism.processHiddenElements(response);

      // 7. Verify complete flow
      const finalTraits = organism.getTraits();
      expect(finalTraits.intuition).toBeGreaterThan(0.5); // Should have increased
      expect(finalTraits.consciousness).toBeGreaterThan(0.3); // Should have increased

      // Cleanup
      hiddenElement.remove();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large DOM efficiently', async () => {
      // Create large DOM structure
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.className = `test-element-${i}`;
        div.style.zIndex = i % 10 === 0 ? '-1' : '0';
        fragment.appendChild(div);
      }
      document.body.appendChild(fragment);

      const startTime = performance.now();

      // Extract hidden elements with limit
      const extractHandler = jest.fn();
      chrome.runtime.onMessage.addListener = jest.fn((callback) => {
        extractHandler.mockImplementation(callback);
      });

      new CountermeasureHandler();

      const response = { elements: [], statistics: {} };
      const sendResponse = jest.fn((data) => Object.assign(response, data));

      extractHandler(
        {
          type: 'EXTRACT_HIDDEN_ELEMENTS',
          payload: {
            maxElements: 100,
            includeZIndex: true
          }
        },
        {},
        sendResponse
      );

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time even with large DOM
      expect(processingTime).toBeLessThan(1000); // Less than 1 second

      // Should respect maxElements limit
      expect(response.elements.length).toBeLessThanOrEqual(100);

      // Cleanup
      document.body.innerHTML = '';
    });

    it('should properly cleanup resources', () => {
      // Start components
      sensor.start();

      // Stop and verify cleanup
      sensor.stop();

      expect(global.cancelIdleCallback).toHaveBeenCalled();

      // Verify observer disconnected
      const observerInstance = (global.MutationObserver as jest.Mock).mock.results[0]?.value;
      if (observerInstance) {
        expect(observerInstance.disconnect).toHaveBeenCalled();
      }

      // Cleanup countermeasure handler
      countermeasureHandler.cleanup();

      // Cleanup organism
      organism.cleanup();

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/cleaned up/i),
        expect.any(Object)
      );
    });
  });
});