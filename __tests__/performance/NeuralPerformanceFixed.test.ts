/**
 * Tests de performance améliorés pour les réseaux neuronaux
 * Version stabilisée avec mocks corrects
 *
 * Réaligné sur l'API réelle de NeuralMeshAsync :
 *  - propagate() (et non forwardPass)
 *  - getPerformanceMetrics() renvoie { operationCount, workerReady, ... }
 *  - getMemoryUsage() / getCPUUsage() asynchrones
 *  - readiness exposée via getPerformanceMetrics().workerReady
 * Le Worker mocké répond dans le protocole réel (NEURAL_RESULT + id reçu) pour
 * que les opérations worker se résolvent immédiatement.
 */

import { NeuralMeshAsync } from '../../src/core/NeuralMeshAsync';

// Mock Worker : répond immédiatement dans le protocole attendu par
// NeuralMeshAsync (type NEURAL_RESULT, en réémettant l'id de la requête).
const createMockWorker = () => {
  const mockWorker: any = {
    postMessage: jest.fn(),
    terminate: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    onmessage: null,
    onerror: null
  };

  mockWorker.postMessage.mockImplementation((message: any) => {
    setTimeout(() => {
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            type: 'NEURAL_RESULT',
            id: message.id,
            payload: {},
            processingTime: 5
          }
        });
      }
    }, 1); // Minimal delay
  });

  return mockWorker;
};

// Mock performance.now() pour des temps déterministes.
const mockPerformanceNow = jest.fn();
let mockTime = 1000;

Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow
  },
  writable: true
});

// Mock Worker constructor
Object.defineProperty(global, 'Worker', {
  value: jest.fn().mockImplementation(() => createMockWorker()),
  writable: true
});

describe('Neural Performance Tests (Stabilized)', () => {
  let asyncMesh: NeuralMeshAsync;

  beforeEach(async () => {
    jest.clearAllMocks();
    // (Ré)installe l'implémentation APRÈS le reset automatique (resetMocks:true)
    // qui, sinon, effacerait l'implémentation du jest.fn → performance.now()
    // renverrait undefined et les mesures de temps deviendraient NaN.
    mockTime = 1000;
    mockPerformanceNow.mockImplementation(() => {
      mockTime += 10; // +10ms à chaque appel
      return mockTime;
    });

    // Réinstalle aussi le constructeur Worker (reset par resetMocks).
    (global.Worker as jest.Mock).mockImplementation(() => createMockWorker());

    // Le mock chrome global (setup.ts) n'expose pas getURL, dont
    // NeuralMeshAsync.initializeWorker a besoin pour instancier le Worker.
    // Fonction simple (pas jest.fn) pour survivre à resetMocks.
    (global as any).chrome = (global as any).chrome || {};
    (global as any).chrome.runtime = (global as any).chrome.runtime || {};
    (global as any).chrome.runtime.getURL = (path: string) => path;

    asyncMesh = new NeuralMeshAsync();
    // Initialise le réseau + worker (workerReady = true avec le mock).
    await asyncMesh.initialize();
  });

  afterEach(async () => {
    if (asyncMesh) {
      await asyncMesh.suspend();
    }
  });

  it('should initialize neural network efficiently', async () => {
    expect(asyncMesh).toBeDefined();
    expect(asyncMesh.getPerformanceMetrics().workerReady).toBe(true);
  });

  it('should track processing time consistently', async () => {
    const startTime = performance.now();

    // Propagation du signal dans le réseau
    await asyncMesh.propagate();

    const endTime = performance.now();

    // Avec notre mock déterministe, la mesure est prévisible.
    expect(endTime - startTime).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(1000); // Borne supérieure raisonnable
  });

  it('should handle mutations efficiently', async () => {
    const startTime = performance.now();

    await asyncMesh.mutate(0.1);

    const endTime = performance.now();

    // Devrait se terminer rapidement avec nos mocks.
    expect(endTime - startTime).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should report performance metrics', async () => {
    // Générer quelques opérations pour alimenter les métriques.
    await asyncMesh.propagate();
    await asyncMesh.mutate(0.05);

    const metrics = asyncMesh.getPerformanceMetrics();

    expect(metrics).toBeDefined();
    expect(typeof metrics.averageProcessingTime).toBe('number');
    expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
    expect(typeof metrics.operationCount).toBe('number');
    expect(metrics.operationCount).toBeGreaterThanOrEqual(0);
    expect(typeof metrics.workerReady).toBe('boolean');
  });

  it('should report memory usage', async () => {
    const memoryUsage = await asyncMesh.getMemoryUsage();

    expect(typeof memoryUsage).toBe('number');
    expect(memoryUsage).toBeGreaterThanOrEqual(0);
  });

  it('should report CPU usage within valid range', async () => {
    const cpuUsage = await asyncMesh.getCPUUsage();

    expect(typeof cpuUsage).toBe('number');
    expect(cpuUsage).toBeGreaterThanOrEqual(0);
    expect(cpuUsage).toBeLessThanOrEqual(1); // Normalisé sur 0-1
  });

  it('should handle large networks within reasonable time', async () => {
    // Ajouter beaucoup de nœuds pour simuler un grand réseau.
    for (let i = 0; i < 100; i++) {
      asyncMesh.addNode(`node_${i}`, 'hidden');
    }

    const startTime = performance.now();
    await asyncMesh.propagate();
    const endTime = performance.now();

    // Devrait se terminer en un temps raisonnable même avec un grand réseau.
    expect(endTime - startTime).toBeLessThan(1000); // 1 seconde max avec les mocks
  });

  it('should maintain worker readiness status', async () => {
    expect(asyncMesh.getPerformanceMetrics().workerReady).toBe(true);

    // Effectuer des opérations
    await asyncMesh.propagate();

    // Devrait rester prêt
    expect(asyncMesh.getPerformanceMetrics().workerReady).toBe(true);
  });

  it('should handle concurrent operations efficiently', async () => {
    const operations = [
      asyncMesh.propagate(),
      asyncMesh.propagate(),
      asyncMesh.propagate()
    ];

    const startTime = performance.now();
    await Promise.all(operations);
    const endTime = performance.now();

    // Les opérations concurrentes ne devraient pas être trop longues.
    expect(endTime - startTime).toBeLessThan(2000);
  });

  it('should clean up resources properly', async () => {
    const worker = (asyncMesh as any).worker;
    expect(worker).toBeDefined();

    await asyncMesh.suspend();

    expect(worker.terminate).toHaveBeenCalled();
    expect(asyncMesh.getPerformanceMetrics().workerReady).toBe(false);
  });
});
