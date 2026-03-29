import {
  CortexState,
  isTransitionValid,
  cosineSimilarity,
  FEATURE_VECTOR_SIZE,
  createEmptySignaturePattern,
} from '../../src/cortex/CortexTypes';

describe('CortexTypes utilities', () => {
  describe('isTransitionValid', () => {
    it('allows IDLE → REFLEX_OBSERVATION', () => {
      expect(isTransitionValid(CortexState.IDLE, CortexState.REFLEX_OBSERVATION)).toBe(true);
    });

    it('allows REFLEX → QUICK_ANALYSIS', () => {
      expect(isTransitionValid(CortexState.REFLEX_OBSERVATION, CortexState.QUICK_ANALYSIS)).toBe(true);
    });

    it('allows QUICK_ANALYSIS → DEEP_ANALYSIS', () => {
      expect(isTransitionValid(CortexState.QUICK_ANALYSIS, CortexState.DEEP_ANALYSIS)).toBe(true);
    });

    it('allows DEEP_ANALYSIS → CONTROLLED_LEARNING', () => {
      expect(isTransitionValid(CortexState.DEEP_ANALYSIS, CortexState.CONTROLLED_LEARNING)).toBe(true);
    });

    it('allows COGNITIVE_HIBERNATION → GRADUAL_RECOVERY', () => {
      expect(isTransitionValid(CortexState.COGNITIVE_HIBERNATION, CortexState.GRADUAL_RECOVERY)).toBe(true);
    });

    it('rejects IDLE → DEEP_ANALYSIS', () => {
      expect(isTransitionValid(CortexState.IDLE, CortexState.DEEP_ANALYSIS)).toBe(false);
    });

    it('rejects COGNITIVE_HIBERNATION → DEEP_ANALYSIS', () => {
      expect(isTransitionValid(CortexState.COGNITIVE_HIBERNATION, CortexState.DEEP_ANALYSIS)).toBe(false);
    });

    it('rejects CONTROLLED_LEARNING → DEEP_ANALYSIS', () => {
      expect(isTransitionValid(CortexState.CONTROLLED_LEARNING, CortexState.DEEP_ANALYSIS)).toBe(false);
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const a = new Float32Array([1, 2, 3]);
      expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5);
    });

    it('returns 0 for orthogonal vectors', () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([0, 1]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });

    it('returns 0 for zero vectors', () => {
      const a = new Float32Array([0, 0, 0]);
      const b = new Float32Array([1, 2, 3]);
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('returns 0 for mismatched lengths', () => {
      const a = new Float32Array([1, 2]);
      const b = new Float32Array([1, 2, 3]);
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('handles 48-dimensional vectors', () => {
      const a = new Float32Array(FEATURE_VECTOR_SIZE);
      const b = new Float32Array(FEATURE_VECTOR_SIZE);
      a[0] = 1;
      b[0] = 1;
      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
    });
  });

  describe('createEmptySignaturePattern', () => {
    it('creates pattern with correct vector size', () => {
      const pattern = createEmptySignaturePattern();
      expect(pattern.featureVector.length).toBe(FEATURE_VECTOR_SIZE);
      expect(pattern.version).toBe(1);
      expect(pattern.dominantCategory).toBe('unknown');
    });
  });
});
