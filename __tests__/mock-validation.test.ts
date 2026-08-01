/**
 * Test de sanité pour valider les mocks de base
 * Vérifie que l'environnement de test est stable
 */

describe('Mock Validation Tests', () => {
  it('should have working crypto mocks', () => {
    expect(global.crypto).toBeDefined();
    expect(global.crypto.getRandomValues).toBeDefined();
    expect(global.crypto.subtle).toBeDefined();
    
    // Test basic crypto functionality
    const arr = new Uint8Array(10);
    global.crypto.getRandomValues(arr);
    expect(arr).toBeDefined();
  });

  it('should have working observer mocks', () => {
    // setup.ts fournit des mocks pour ces observers du DOM (pas pour Worker).
    expect(global.IntersectionObserver).toBeDefined();
    expect(global.MutationObserver).toBeDefined();
    expect(global.ResizeObserver).toBeDefined();

    const io = new IntersectionObserver(() => {});
    expect(io.observe).toBeDefined();
    expect(io.disconnect).toBeDefined();

    const mo = new MutationObserver(() => {});
    expect(mo.observe).toBeDefined();
    expect(mo.disconnect).toBeDefined();
  });

  it('should have working performance mocks', () => {
    expect(global.performance).toBeDefined();
    expect(global.performance.now).toBeDefined();
    
    const time1 = performance.now();
    const time2 = performance.now();
    expect(typeof time1).toBe('number');
    expect(typeof time2).toBe('number');
  });

  it('should have working WebGL mocks', () => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    
    expect(gl).toBeDefined();
    expect(gl.createBuffer).toBeDefined();
    expect(gl.drawArrays).toBeDefined();
  });

  it('should have working Chrome extension mocks', () => {
    expect(global.chrome).toBeDefined();
    expect(global.chrome.storage).toBeDefined();
    expect(global.chrome.runtime).toBeDefined();
  });

  it('should complete within reasonable time', async () => {
    const start = Date.now();
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const end = Date.now();
    expect(end - start).toBeLessThan(1000); // Should be fast
  });
});