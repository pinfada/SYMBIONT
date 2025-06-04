import { MutationBatcher, BatchedMutation } from '../src/core/utils/MutationBatcher';

describe('MutationBatcher', () => {
  let batcher: MutationBatcher;
  let processedBatches: BatchedMutation[] = [];

  const mockBatchProcessor = async (batch: BatchedMutation): Promise<void> => {
    processedBatches.push(batch);
    return Promise.resolve();
  };

  beforeEach(() => {
    processedBatches = [];
    batcher = new MutationBatcher(mockBatchProcessor, {
      debounceMs: 50,
      maxBatchSize: 3,
      maxWaitTimeMs: 200,
      combinationStrategy: 'average'
    });
  });

  afterEach(() => {
    if (batcher) {
      batcher.dispose();
    }
  });

  it('should batch multiple mutations with debouncing', async () => {
    // Add multiple mutations quickly
    batcher.addMutation(0.1, 'normal');
    batcher.addMutation(0.2, 'normal');
    batcher.addMutation(0.3, 'normal');

    // Wait for debounce to trigger
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(processedBatches).toHaveLength(1);
    expect(processedBatches[0].requestCount).toBe(3);
    expect(processedBatches[0].combinedRate).toBeCloseTo(0.2, 1); // Average of 0.1, 0.2, 0.3
  });

  it('should process immediately when max batch size is reached', async () => {
    batcher.addMutation(0.1, 'normal');
    batcher.addMutation(0.2, 'normal');
    batcher.addMutation(0.3, 'normal'); // Should trigger immediate processing

    // Small delay to allow async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(processedBatches).toHaveLength(1);
    expect(processedBatches[0].requestCount).toBe(3);
  });

  it('should prioritize high priority mutations', async () => {
    batcher.addMutation(0.1, 'low');
    batcher.addMutation(0.5, 'high'); // Should trigger immediate processing

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(processedBatches).toHaveLength(1);
    expect(processedBatches[0].priority).toBe('high');
    expect(processedBatches[0].requestCount).toBe(2);
  });

  it('should handle different combination strategies', async () => {
    // Test 'max' strategy
    const maxBatcher = new MutationBatcher(mockBatchProcessor, {
      combinationStrategy: 'max',
      debounceMs: 10
    });

    processedBatches = [];
    maxBatcher.addMutation(0.1, 'normal');
    maxBatcher.addMutation(0.3, 'normal');
    maxBatcher.addMutation(0.2, 'normal');

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(processedBatches).toHaveLength(1);
    expect(processedBatches[0].combinedRate).toBe(0.3); // Max value

    maxBatcher.dispose();
  });

  it('should respect max wait time', async () => {
    const fastBatcher = new MutationBatcher(mockBatchProcessor, {
      debounceMs: 1000, // Long debounce
      maxWaitTimeMs: 50  // But short max wait
    });

    processedBatches = [];
    fastBatcher.addMutation(0.1, 'normal');

    // Should process within max wait time, not debounce time
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(processedBatches).toHaveLength(1);
    expect(processedBatches[0].requestCount).toBe(1);

    fastBatcher.dispose();
  });

  it('should allow mutation cancellation', async () => {
    const mutationId = batcher.addMutation(0.1, 'normal');
    const cancelled = batcher.cancelMutation(mutationId);

    expect(cancelled).toBe(true);

    // Wait for potential processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(processedBatches).toHaveLength(0);
  });

  it('should handle flush batch correctly', async () => {
    batcher.addMutation(0.1, 'normal');
    batcher.addMutation(0.2, 'normal');

    // Force flush
    await batcher.flushBatch();

    expect(processedBatches).toHaveLength(1);
    expect(processedBatches[0].requestCount).toBe(2);
  });

  it('should track statistics correctly', async () => {
    batcher.addMutation(0.1, 'normal');
    batcher.addMutation(0.2, 'normal');
    await batcher.flushBatch();

    batcher.addMutation(0.3, 'normal');
    await batcher.flushBatch();

    const stats = batcher.getStatistics();
    expect(stats.totalRequests).toBe(3);
    expect(stats.totalBatches).toBe(2);
    expect(stats.compressionRatio).toBeCloseTo(1.5, 1); // 3 requests / 2 batches
  });

  it('should handle weighted combination strategy', async () => {
    const weightedBatcher = new MutationBatcher(mockBatchProcessor, {
      combinationStrategy: 'weighted',
      debounceMs: 10
    });

    processedBatches = [];
    
    // Add mutations with different priorities
    weightedBatcher.addMutation(0.1, 'low');
    weightedBatcher.addMutation(0.2, 'normal');
    weightedBatcher.addMutation(0.3, 'high');

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(processedBatches).toHaveLength(1);
    // Weighted average should favor higher priority mutations
    expect(processedBatches[0].combinedRate).toBeGreaterThan(0.2);
    expect(processedBatches[0].priority).toBe('high');

    weightedBatcher.dispose();
  });

  it('should handle error in batch processing gracefully', async () => {
    const errorBatcher = new MutationBatcher(
      async () => { throw new Error('Processing failed'); },
      { debounceMs: 10 }
    );

    errorBatcher.addMutation(0.1, 'normal');
    
    // Should not throw error
    await new Promise(resolve => setTimeout(resolve, 50));

    errorBatcher.dispose();
  });

  it('should validate mutation rate bounds', () => {
    // Rates should be clamped to 0-1 range
    const mutationId1 = batcher.addMutation(-0.5, 'normal'); // Should be clamped to 0
    const mutationId2 = batcher.addMutation(1.5, 'normal');  // Should be clamped to 1

    expect(mutationId1).toBeDefined();
    expect(mutationId2).toBeDefined();
  });
}); 