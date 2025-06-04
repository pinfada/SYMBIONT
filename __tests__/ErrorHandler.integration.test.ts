import { errorHandler } from '../src/core/utils/ErrorHandler';
import { OrganismCore } from '../src/core/OrganismCore';
import { NeuralMesh } from '../src/core/NeuralMesh';

describe('ErrorHandler Integration Tests', () => {
  beforeEach(() => {
    // Reset error handler state before each test
    errorHandler.reset();
    errorHandler.setLogLevel('debug');
  });

  describe('Integration with OrganismCore', () => {
    it('should handle organism creation errors gracefully', async () => {
      const initialMetrics = errorHandler.getMetrics();
      
      // Try to create organism with invalid DNA
      expect(() => {
        new OrganismCore('', {}, () => new NeuralMesh());
      }).toThrow();

      const finalMetrics = errorHandler.getMetrics();
      expect(finalMetrics.errorCount).toBeGreaterThan(initialMetrics.errorCount);
    });

    it('should track errors across organism lifecycle', async () => {
      const organism = new OrganismCore('ATCGATCGATCGATCG', {}, () => new NeuralMesh());
      
      await organism.boot();
      
      // Perform operations that might generate errors
      organism.stimulate('invalid_node', 0.5);
      organism.mutate(-0.1); // Invalid mutation rate
      organism.setTraits({ creativity: 2.0 } as any); // Invalid trait value
      
      const metrics = errorHandler.getMetrics();
      expect(metrics.errorCount).toBeGreaterThan(0);
      
      await organism.hibernate();
    });

    it('should provide fallback values when organism operations fail', async () => {
      const organism = new OrganismCore('ATCGATCGATCGATCG');
      await organism.boot();
      
      // This should return default metrics even if internal errors occur
      const metrics = await organism.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.cpu).toBeGreaterThanOrEqual(0);
      expect(metrics.memory).toBeGreaterThanOrEqual(0);
      expect(metrics.mutationStats).toBeDefined();
      
      await organism.hibernate();
    });
  });

  describe('Retry Mechanisms', () => {
    it('should retry failed operations successfully', async () => {
      let attemptCount = 0;
      
      const flakeyOperation = async (): Promise<string> => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return 'Success!';
      };

      const result = await errorHandler.withRetry(
        flakeyOperation,
        {
          maxRetries: 5,
          backoffMs: 10,
          shouldRetry: (error, attempt) => attempt < 5
        },
        { component: 'Test', method: 'flakeyOperation' }
      );

      expect(result).toBe('Success!');
      expect(attemptCount).toBe(3);
      
      const metrics = errorHandler.getMetrics();
      expect(metrics.recoveryAttempts).toBe(3);
      expect(metrics.recoverySuccesses).toBe(1);
    });

    it('should use fallback when all retries fail', async () => {
      const alwaysFailingOperation = async (): Promise<string> => {
        throw new Error('Always fails');
      };

      const result = await errorHandler.withRetry(
        alwaysFailingOperation,
        {
          maxRetries: 3,
          backoffMs: 1,
          shouldRetry: () => true,
          fallbackValue: 'Fallback used'
        },
        { component: 'Test', method: 'alwaysFailingOperation' }
      );

      expect(result).toBe('Fallback used');
      
      const metrics = errorHandler.getMetrics();
      expect(metrics.recoveryAttempts).toBe(3);
      expect(metrics.recoverySuccesses).toBe(0);
    });

    it('should respect shouldRetry conditions', async () => {
      let attemptCount = 0;
      
      const selectiveFailureOperation = async (): Promise<string> => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Retryable error');
        } else if (attemptCount === 2) {
          throw new Error('Fatal error');
        }
        return 'Success';
      };

      try {
        await errorHandler.withRetry(
          selectiveFailureOperation,
          {
            maxRetries: 5,
            backoffMs: 1,
            shouldRetry: (error, attempt) => !error.message.includes('Fatal')
          },
          { component: 'Test', method: 'selectiveFailureOperation' }
        );
      } catch (error) {
        expect((error as Error).message).toContain('Fatal error');
      }

      expect(attemptCount).toBe(2); // Should stop after fatal error
    });
  });

  describe('Validation Integration', () => {
    it('should validate complex nested objects', () => {
      const complexObject = {
        user: {
          name: 'test',
          age: 25,
          preferences: {
            theme: 'dark',
            volume: 0.8
          }
        }
      };

      const nameValidation = errorHandler.validateType(
        complexObject.user.name,
        'string',
        { required: true, min: 1 },
        'user.name',
        'TestComponent',
        'validateComplexObject'
      );

      const ageValidation = errorHandler.validateType(
        complexObject.user.age,
        'number',
        { required: true, min: 0, max: 120 },
        'user.age',
        'TestComponent',
        'validateComplexObject'
      );

      const volumeValidation = errorHandler.validateType(
        complexObject.user.preferences.volume,
        'number',
        { required: true, min: 0, max: 1 },
        'user.preferences.volume',
        'TestComponent',
        'validateComplexObject'
      );

      expect(nameValidation.isValid).toBe(true);
      expect(ageValidation.isValid).toBe(true);
      expect(volumeValidation.isValid).toBe(true);
    });

    it('should accumulate validation errors across multiple fields', () => {
      const invalidData = {
        email: '', // Required but empty
        age: -5,   // Invalid negative
        score: 150 // Out of range
      };

      const emailValidation = errorHandler.validateType(
        invalidData.email,
        'string',
        { required: true, min: 1 },
        'email',
        'TestComponent',
        'validateUser'
      );

      const ageValidation = errorHandler.validateType(
        invalidData.age,
        'number',
        { required: true, min: 0, max: 120 },
        'age',
        'TestComponent',
        'validateUser'
      );

      const scoreValidation = errorHandler.validateType(
        invalidData.score,
        'number',
        { required: true, min: 0, max: 100 },
        'score',
        'TestComponent',
        'validateUser'
      );

      expect(emailValidation.isValid).toBe(false);
      expect(ageValidation.isValid).toBe(false);
      expect(scoreValidation.isValid).toBe(false);

      const metrics = errorHandler.getMetrics();
      expect(metrics.errorCount).toBe(3);
    });
  });

  describe('Concurrent Error Handling', () => {
    it('should handle multiple concurrent errors', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => 
        errorHandler.safeExecuteAsync(
          async () => {
            if (i % 2 === 0) {
              throw new Error(`Error ${i}`);
            }
            return `Success ${i}`;
          },
          `Fallback ${i}`,
          { component: 'ConcurrentTest', method: `operation${i}` }
        )
      );

      const results = await Promise.all(concurrentOperations);
      
      // Should have mix of successes and fallbacks
      const successes = results.filter(r => r.startsWith('Success'));
      const fallbacks = results.filter(r => r.startsWith('Fallback'));
      
      expect(successes.length).toBe(5);
      expect(fallbacks.length).toBe(5);
      
      const metrics = errorHandler.getMetrics();
      expect(metrics.errorCount).toBe(5);
    });
  });

  describe('Memory and Performance', () => {
    it('should not consume excessive memory with many errors', () => {
      const initialMetrics = errorHandler.getMetrics();
      
      // Generate many errors
      for (let i = 0; i < 2000; i++) {
        errorHandler.logSimpleError(
          'MemoryTest',
          'generateManyErrors',
          new Error(`Error ${i}`),
          'warning'
        );
      }

      const recentErrors = errorHandler.getRecentErrors(100);
      expect(recentErrors.length).toBeLessThanOrEqual(100);
      
      const finalMetrics = errorHandler.getMetrics();
      expect(finalMetrics.errorCount).toBe(initialMetrics.errorCount + 2000);
    });

    it('should maintain reasonable performance under load', () => {
      const startTime = performance.now();
      
      // Perform many error operations
      for (let i = 0; i < 1000; i++) {
        errorHandler.safeExecute(
          () => {
            if (i % 10 === 0) throw new Error(`Error ${i}`);
            return i;
          },
          0,
          { component: 'PerformanceTest', method: 'highVolumeTest' }
        );
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe('Error Pattern Analysis', () => {
    it('should track error patterns by component', () => {
      // Generate errors from different components
      errorHandler.logSimpleError('ComponentA', 'method1', new Error('Error 1'));
      errorHandler.logSimpleError('ComponentA', 'method2', new Error('Error 2'));
      errorHandler.logSimpleError('ComponentB', 'method1', new Error('Error 3'));
      errorHandler.logSimpleError('ComponentA', 'method1', new Error('Error 4'));

      const metrics = errorHandler.getMetrics();
      
      expect(metrics.errorsByComponent.get('ComponentA')).toBe(3);
      expect(metrics.errorsByComponent.get('ComponentB')).toBe(1);
      expect(metrics.errorsByMethod.get('ComponentA.method1')).toBe(2);
      expect(metrics.errorsByMethod.get('ComponentA.method2')).toBe(1);
      expect(metrics.errorsByMethod.get('ComponentB.method1')).toBe(1);
    });

    it('should identify error hotspots', () => {
      // Simulate error hotspot
      for (let i = 0; i < 10; i++) {
        errorHandler.logSimpleError('HotspotComponent', 'problematicMethod', 
          new Error(`Hotspot error ${i}`));
      }

      // Normal errors in other components
      errorHandler.logSimpleError('NormalComponent', 'normalMethod', new Error('Normal error'));
      
      const metrics = errorHandler.getMetrics();
      const hotspotErrors = metrics.errorsByComponent.get('HotspotComponent') || 0;
      const normalErrors = metrics.errorsByComponent.get('NormalComponent') || 0;
      
      expect(hotspotErrors).toBe(10);
      expect(normalErrors).toBe(1);
      expect(hotspotErrors / metrics.errorCount).toBeGreaterThan(0.8); // 80%+ of errors
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle cascading failures gracefully', async () => {
      const organism = new OrganismCore('ATCGATCGATCGATCG');
      
      try {
        await organism.boot();
        
        // Simulate cascading failures
        organism.stimulate('invalid_input', NaN);
        organism.mutate(Infinity);
        organism.setTraits({ invalid: 'trait' } as any);
        
        // System should still be functional
        const state = organism.getState();
        expect(state).toBeDefined();
        expect(state.health).toBeGreaterThanOrEqual(0);
        expect(state.energy).toBeGreaterThanOrEqual(0);
        
      } finally {
        await organism.hibernate();
      }
      
      const metrics = errorHandler.getMetrics();
      expect(metrics.errorCount).toBeGreaterThan(0);
    });
  });
}); 