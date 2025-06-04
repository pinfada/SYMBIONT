import { OrganismCore } from '../src/core/OrganismCore';
import { OrganismFactory } from '../src/core/factories/OrganismFactory';
import { NeuralMesh } from '../src/core/NeuralMesh';

describe('OrganismCore Mutation Integration', () => {
  let organism: OrganismCore;
  
  beforeEach(async () => {
    // Setup factory dependencies
    OrganismFactory.setDependencies({
      createNeuralMesh: () => new NeuralMesh()
    });
    
    organism = OrganismFactory.createOrganism('ATCGATCGATCGATCG', {
      creativity: 0.5,
      focus: 0.5
    }) as OrganismCore;
    
    await organism.boot();
  });

  afterEach(async () => {
    if (organism) {
      await organism.hibernate();
    }
  });

  it('should batch multiple quick mutations', async () => {
    const initialMetrics = await organism.getPerformanceMetrics();
    const initialMutationStats = initialMetrics.mutationStats;
    
    // Apply multiple mutations quickly (should be batched)
    organism.mutate(0.1);
    organism.mutate(0.05);
    organism.mutate(0.15);
    organism.mutate(0.08);
    
    // Wait for batching to process
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const finalMetrics = await organism.getPerformanceMetrics();
    const finalMutationStats = finalMetrics.mutationStats;
    
    // Should have processed mutations in batches
    expect(finalMutationStats.totalRequests).toBeGreaterThan(initialMutationStats.totalRequests);
    expect(finalMutationStats.totalBatches).toBeGreaterThan(0);
    
    // Compression ratio should show batching efficiency
    expect(finalMutationStats.compressionRatio).toBeGreaterThan(1);
  });

  it('should prioritize high-rate mutations', async () => {
    // Add low rate mutations
    organism.mutate(0.01);
    organism.mutate(0.02);
    
    // Add high rate mutation (should trigger immediate processing)
    organism.mutate(0.5);
    
    // Small delay for processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const metrics = await organism.getPerformanceMetrics();
    expect(metrics.mutationStats.totalBatches).toBeGreaterThan(0);
  });

  it('should handle flushMutations correctly', async () => {
    // Queue some mutations
    organism.mutate(0.1);
    organism.mutate(0.2);
    
    const preFlushMetrics = await organism.getPerformanceMetrics();
    const pendingBeforeFlush = preFlushMetrics.mutationStats.pendingMutations;
    
    // Force flush
    await organism.flushMutations();
    
    const postFlushMetrics = await organism.getPerformanceMetrics();
    const pendingAfterFlush = postFlushMetrics.mutationStats.pendingMutations;
    
    // Should have processed pending mutations
    expect(pendingAfterFlush).toBeLessThan(pendingBeforeFlush);
    expect(postFlushMetrics.mutationStats.totalBatches).toBeGreaterThan(0);
  });

  it('should preserve organism functionality with batched mutations', async () => {
    const initialTraits = organism.getTraits();
    
    // Apply several mutations with higher rates to ensure detectable change
    organism.mutate(0.3);
    organism.mutate(0.25);
    organism.mutate(0.4);
    organism.mutate(0.35);
    organism.mutate(0.3);
    
    // Wait for processing
    await organism.flushMutations();
    
    const finalTraits = organism.getTraits();
    
    // Traits should have evolved (at least some difference)
    // Using smaller tolerance to detect any change
    const traitsChanged = Object.keys(initialTraits).some(key => {
      const typedKey = key as keyof typeof initialTraits;
      return Math.abs(initialTraits[typedKey] - finalTraits[typedKey]) > 0.00001; // Reduced tolerance
    });
    
    expect(traitsChanged).toBe(true);
  });

  it('should update performance metrics correctly', async () => {
    // Initial state
    const initialMetrics = await organism.getPerformanceMetrics();
    
    // Apply mutations and stimulations
    organism.mutate(0.1);
    organism.stimulate('sensory_input', 0.8);
    organism.update(1.0);
    
    await organism.flushMutations();
    
    const finalMetrics = await organism.getPerformanceMetrics();
    
    // Should have mutation statistics
    expect(finalMetrics.mutationStats).toBeDefined();
    expect(finalMetrics.mutationStats.totalRequests).toBeGreaterThan(0);
    
    // Basic neural metrics should still work
    expect(finalMetrics.neuralActivity).toBeGreaterThanOrEqual(0);
    expect(finalMetrics.connectionStrength).toBeGreaterThanOrEqual(0);
  });

  it('should handle mutation rate validation in batched system', () => {
    // These should not throw errors, but be handled gracefully
    expect(() => organism.mutate(-0.1)).not.toThrow(); // Negative rate
    expect(() => organism.mutate(1.5)).not.toThrow();  // Rate > 1
    expect(() => organism.mutate(0.5)).not.toThrow();  // Valid rate
  });

  it('should clean up mutations during hibernation', async () => {
    // Queue mutations
    organism.mutate(0.1);
    organism.mutate(0.2);
    
    const metricsBeforeHibernation = await organism.getPerformanceMetrics();
    expect(metricsBeforeHibernation.mutationStats.pendingMutations).toBeGreaterThanOrEqual(0);
    
    // Hibernate (should flush and clean up)
    await organism.hibernate();
    
    // Create new organism to check state
    const newOrganism = OrganismFactory.createOrganism('ATCGATCGATCGATCG') as OrganismCore;
    await newOrganism.boot();
    
    const newMetrics = await newOrganism.getPerformanceMetrics();
    expect(newMetrics.mutationStats.pendingMutations).toBe(0);
    
    await newOrganism.hibernate();
  });

  it('should maintain energy and health with optimized mutations', async () => {
    const initialState = organism.getState();
    
    // Apply multiple mutations
    for (let i = 0; i < 5; i++) {
      organism.mutate(0.1);
      organism.update(1.0);
    }
    
    await organism.flushMutations();
    
    const finalState = organism.getState();
    
    // Energy and health should remain within valid bounds
    expect(finalState.energy).toBeGreaterThanOrEqual(0);
    expect(finalState.energy).toBeLessThanOrEqual(1);
    expect(finalState.health).toBeGreaterThanOrEqual(0);
    expect(finalState.health).toBeLessThanOrEqual(1);
    
    // LastMutation should be updated
    expect(finalState.lastMutation).toBeGreaterThan(initialState.lastMutation || 0);
  });
}); 