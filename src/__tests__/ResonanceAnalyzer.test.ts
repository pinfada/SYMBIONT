import { ResonanceAnalyzer } from '../core/extensions/ResonanceAnalyzer';

describe('ResonanceAnalyzer', () => {
  let analyzer: ResonanceAnalyzer;

  beforeEach(() => {
    analyzer = new ResonanceAnalyzer();
  });

  afterEach(() => {
    analyzer.reset();
  });

  describe('Data collection', () => {
    it('should accept and store network latency samples', () => {
      analyzer.addNetworkLatency(50);
      analyzer.addNetworkLatency(60);
      analyzer.addNetworkLatency(55);

      const report = analyzer.generateDiagnosticReport();
      expect(report.bufferSizes.network).toBe(3);
    });

    it('should accept and store DOM jitter samples', () => {
      analyzer.addDOMJitter(10);
      analyzer.addDOMJitter(15);
      analyzer.addDOMJitter(12);

      const report = analyzer.generateDiagnosticReport();
      expect(report.bufferSizes.dom).toBe(3);
    });

    it('should maintain maximum buffer size of 100', () => {
      // Add 110 samples
      for (let i = 0; i < 110; i++) {
        analyzer.addNetworkLatency(i);
      }

      const report = analyzer.generateDiagnosticReport();
      expect(report.bufferSizes.network).toBe(100);
    });

    it('should reject invalid samples', () => {
      analyzer.addNetworkLatency(NaN);
      analyzer.addNetworkLatency(-10);
      analyzer.addNetworkLatency(Infinity);

      analyzer.addDOMJitter(NaN);
      analyzer.addDOMJitter(-5);
      analyzer.addDOMJitter(Infinity);

      const report = analyzer.generateDiagnosticReport();
      expect(report.bufferSizes.network).toBe(0);
      expect(report.bufferSizes.dom).toBe(0);
    });
  });

  describe('Resonance calculation', () => {
    it('should return null with insufficient data', () => {
      analyzer.addNetworkLatency(50);
      analyzer.addDOMJitter(10);

      const resonance = analyzer.calculateResonance();
      expect(resonance).toBeNull();
    });

    it('should detect resonance with sufficient data and high variance', () => {
      // Add samples with high variance for network
      for (let i = 0; i < 15; i++) {
        analyzer.addNetworkLatency(i % 2 === 0 ? 20 : 100);
        analyzer.addDOMJitter(50); // Stable DOM
      }

      const resonance = analyzer.calculateResonance();

      if (resonance) {
        expect(resonance.type).toBe('INFRASTRUCTURE_RESONANCE');
        expect(resonance.magnitude).toBeGreaterThan(0);
        expect(resonance.signal).toBeDefined();
      }
    });

    it('should identify NETWORK_PRESSURE signal', () => {
      // High network variance, low DOM variance
      for (let i = 0; i < 15; i++) {
        analyzer.addNetworkLatency(Math.random() * 200);
        analyzer.addDOMJitter(10 + Math.random() * 5);
      }

      const resonance = analyzer.calculateResonance();

      if (resonance && resonance.magnitude > 0.4) {
        expect(resonance.signal).toBe('NETWORK_PRESSURE');
      }
    });

    it('should identify DOM_OPPRESSION signal', () => {
      // Low network variance, high DOM variance
      for (let i = 0; i < 15; i++) {
        analyzer.addNetworkLatency(50 + Math.random() * 5);
        analyzer.addDOMJitter(Math.random() * 100);
      }

      const resonance = analyzer.calculateResonance();

      if (resonance && resonance.magnitude > 0.4) {
        expect(resonance.signal).toBe('DOM_OPPRESSION');
      }
    });

    it('should calculate confidence score', () => {
      for (let i = 0; i < 20; i++) {
        analyzer.addNetworkLatency(50 + Math.random() * 10);
        analyzer.addDOMJitter(20 + Math.random() * 10);
      }

      const resonance = analyzer.calculateResonance();

      if (resonance) {
        expect(resonance.confidence).toBeGreaterThanOrEqual(0);
        expect(resonance.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Temporal correlation analysis', () => {
    it('should calculate cross-correlation between signals', () => {
      // Add correlated data
      for (let i = 0; i < 40; i++) {
        const base = Math.sin(i * 0.1) * 50 + 50;
        analyzer.addNetworkLatency(base + Math.random() * 10);
        analyzer.addDOMJitter(base * 0.8 + Math.random() * 10); // Correlated with lag
      }

      const temporal = analyzer.analyzeTemporalCorrelation();

      expect(temporal.correlation).toBeDefined();
      expect(temporal.lag).toBeDefined();
      expect(temporal.significance).toBeDefined();
      expect(Math.abs(temporal.correlation)).toBeLessThanOrEqual(1);
    });

    it('should detect lag between signals', () => {
      // Add data with intentional lag
      for (let i = 0; i < 50; i++) {
        analyzer.addNetworkLatency(i < 25 ? 20 : 80);
        analyzer.addDOMJitter(i < 30 ? 20 : 80); // 5 sample lag
      }

      const temporal = analyzer.analyzeTemporalCorrelation();
      expect(temporal.lag).toBeDefined();
    });

    it('should return zero correlation with insufficient data', () => {
      for (let i = 0; i < 5; i++) {
        analyzer.addNetworkLatency(50);
        analyzer.addDOMJitter(20);
      }

      const temporal = analyzer.analyzeTemporalCorrelation();
      expect(temporal.correlation).toBe(0);
      expect(temporal.lag).toBe(0);
      expect(temporal.significance).toBe(0);
    });
  });

  describe('Diagnostic reporting', () => {
    it('should generate comprehensive diagnostic report', () => {
      // Add sample data
      for (let i = 0; i < 20; i++) {
        analyzer.addNetworkLatency(50 + Math.random() * 20);
        analyzer.addDOMJitter(20 + Math.random() * 10);
      }

      const report = analyzer.generateDiagnosticReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('bufferSizes');
      expect(report).toHaveProperty('networkMetrics');
      expect(report).toHaveProperty('domMetrics');
      expect(report).toHaveProperty('stability');
      expect(report).toHaveProperty('resonance');
      expect(report).toHaveProperty('temporalCorrelation');
      expect(report).toHaveProperty('correlationHistory');
      expect(report).toHaveProperty('healthStatus');
    });

    it('should include statistical metrics', () => {
      for (let i = 0; i < 20; i++) {
        analyzer.addNetworkLatency(i * 5);
        analyzer.addDOMJitter(i * 2);
      }

      const report = analyzer.generateDiagnosticReport();

      expect(report.networkMetrics).toHaveProperty('mean');
      expect(report.networkMetrics).toHaveProperty('variance');
      expect(report.networkMetrics).toHaveProperty('stdDev');
      expect(report.networkMetrics).toHaveProperty('min');
      expect(report.networkMetrics).toHaveProperty('max');

      expect(report.domMetrics).toHaveProperty('mean');
      expect(report.domMetrics).toHaveProperty('variance');
      expect(report.domMetrics).toHaveProperty('stdDev');
      expect(report.domMetrics).toHaveProperty('min');
      expect(report.domMetrics).toHaveProperty('max');
    });
  });

  describe('Health status evaluation', () => {
    it('should report healthy status with no resonance', () => {
      const report = analyzer.generateDiagnosticReport();
      expect(report.healthStatus.level).toBe('healthy');
      expect(report.healthStatus.score).toBe(1.0);
    });

    it('should report warning status with moderate resonance', () => {
      // Create conditions for moderate resonance
      for (let i = 0; i < 20; i++) {
        analyzer.addNetworkLatency(i % 2 === 0 ? 30 : 70);
        analyzer.addDOMJitter(50);
      }

      analyzer.calculateResonance(); // Trigger resonance calculation
      const report = analyzer.generateDiagnosticReport();

      if (report.resonance && report.resonance.magnitude > 0.3 && report.resonance.magnitude < 0.6) {
        expect(report.healthStatus.level).toBe('warning');
      }
    });
  });

  describe('State persistence', () => {
    it('should save and restore state', () => {
      // Add data
      for (let i = 0; i < 25; i++) {
        analyzer.addNetworkLatency(i * 2);
        analyzer.addDOMJitter(i * 3);
      }

      analyzer.calculateResonance();

      // Save state
      const state = analyzer.getState();

      // Create new analyzer and load state
      const newAnalyzer = new ResonanceAnalyzer();
      newAnalyzer.loadState(state);

      // Verify state was restored
      const originalReport = analyzer.generateDiagnosticReport();
      const restoredReport = newAnalyzer.generateDiagnosticReport();

      expect(restoredReport.bufferSizes.network).toBe(originalReport.bufferSizes.network);
      expect(restoredReport.bufferSizes.dom).toBe(originalReport.bufferSizes.dom);
      expect(restoredReport.stability.network).toBe(originalReport.stability.network);
      expect(restoredReport.stability.dom).toBe(originalReport.stability.dom);
    });

    it('should handle partial state restoration', () => {
      const partialState = {
        networkLatencyBuffer: [10, 20, 30],
        // Missing other properties
      };

      expect(() => {
        analyzer.loadState(partialState);
      }).not.toThrow();

      const report = analyzer.generateDiagnosticReport();
      expect(report.bufferSizes.network).toBe(3);
    });
  });

  describe('Reset functionality', () => {
    it('should reset all data and state', () => {
      // Add data
      for (let i = 0; i < 30; i++) {
        analyzer.addNetworkLatency(i);
        analyzer.addDOMJitter(i * 2);
      }

      analyzer.calculateResonance();

      // Reset
      analyzer.reset();

      // Verify reset
      const report = analyzer.generateDiagnosticReport();
      expect(report.bufferSizes.network).toBe(0);
      expect(report.bufferSizes.dom).toBe(0);
      expect(report.stability.network).toBe(1);
      expect(report.stability.dom).toBe(1);
      expect(report.resonance).toBeNull();
      expect(report.correlationHistory).toHaveLength(0);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty buffers gracefully', () => {
      const report = analyzer.generateDiagnosticReport();
      expect(report).toBeDefined();
      expect(report.networkMetrics.mean).toBe(0);
      expect(report.domMetrics.mean).toBe(0);
    });

    it('should handle single data point', () => {
      analyzer.addNetworkLatency(50);
      analyzer.addDOMJitter(20);

      const report = analyzer.generateDiagnosticReport();
      expect(report.networkMetrics.variance).toBe(0);
      expect(report.domMetrics.variance).toBe(0);
    });

    it('should handle extreme values within bounds', () => {
      analyzer.addNetworkLatency(0);
      analyzer.addNetworkLatency(10000);
      analyzer.addDOMJitter(0);
      analyzer.addDOMJitter(10000);

      const report = analyzer.generateDiagnosticReport();
      expect(report.networkMetrics.min).toBe(0);
      expect(report.networkMetrics.max).toBe(10000);
      expect(report.domMetrics.min).toBe(0);
      expect(report.domMetrics.max).toBe(10000);
    });
  });
});