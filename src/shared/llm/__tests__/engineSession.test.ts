// Régression couverte : la réactivation automatique du modèle rend activate()
// déclenchable au montage du panneau ; un démontage/remontage (changement
// d'onglet) pendant un chargement lançait alors deux engine.load() concurrents
// sur le même moteur — aucune couche en aval n'est réentrante. loadEngine()
// dé-duplique : les appels concurrents pour le même modèle partagent la même
// promesse, chacun avec son propre rapport de progression.

import { loadEngine, resetEngineSession } from '../engineSession';
import type { CognitiveEngine } from '../cognitiveEngine';

jest.mock('../cognitiveEngine', () => {
  const actual = jest.requireActual('../cognitiveEngine');
  return {
    ...actual,
    createCognitiveEngine: jest.fn(),
  };
});

import { createCognitiveEngine } from '../cognitiveEngine';

type ProgressCb = (p: { progress: number; text: string }) => void;

function makeFakeEngine() {
  let resolveLoad: (() => void) | null = null;
  let rejectLoad: ((e: Error) => void) | null = null;
  let progressCb: ProgressCb | null = null;
  const load = jest.fn((_modelId: string, onProgress?: ProgressCb) => {
    progressCb = onProgress ?? null;
    return new Promise<void>((resolve, reject) => {
      resolveLoad = resolve;
      rejectLoad = reject;
    });
  });
  const engine = {
    location: 'popup',
    load,
    chat: jest.fn(),
    analyze: jest.fn(),
    isReady: jest.fn(() => false),
    getStatus: jest.fn(() => 'loading'),
    getModelId: jest.fn(() => null),
  } as unknown as CognitiveEngine;
  return {
    engine,
    load,
    finishLoad: () => resolveLoad?.(),
    failLoad: (e: Error) => rejectLoad?.(e),
    emitProgress: (p: { progress: number; text: string }) => progressCb?.(p),
  };
}

/**
 * Attend (en microtâches) que la condition devienne vraie. loadEngine passe
 * par plusieurs `await` internes avant d'appeler engine.load() : résoudre le
 * faux load() trop tôt laisserait la promesse pendante pour toujours.
 */
async function until(condition: () => boolean, what: string): Promise<void> {
  for (let i = 0; i < 100 && !condition(); i++) {
    await Promise.resolve();
  }
  if (!condition()) {
    throw new Error(`Condition jamais atteinte : ${what}`);
  }
}

describe('engineSession.loadEngine — dé-duplication des chargements', () => {
  beforeEach(() => {
    resetEngineSession();
    jest.clearAllMocks();
  });

  it('les appels concurrents pour le même modèle partagent un seul load()', async () => {
    // Arrange
    const fake = makeFakeEngine();
    (createCognitiveEngine as jest.Mock).mockResolvedValue(fake.engine);

    // Act — premier montage, puis remontage pendant le chargement
    const first = loadEngine('model-a');
    const second = loadEngine('model-a');
    await until(() => fake.load.mock.calls.length === 1, 'load() démarré');
    fake.finishLoad();

    // Assert — même promesse résolue pour les deux, un seul load() émis
    await expect(first).resolves.toBe(fake.engine);
    await expect(second).resolves.toBe(fake.engine);
    expect(fake.load).toHaveBeenCalledTimes(1);
  });

  it('chaque appelant concurrent reçoit la progression', async () => {
    // Arrange
    const fake = makeFakeEngine();
    (createCognitiveEngine as jest.Mock).mockResolvedValue(fake.engine);
    const seenByFirst: number[] = [];
    const seenBySecond: number[] = [];

    // Act
    const first = loadEngine('model-a', (p) => seenByFirst.push(p.progress));
    const second = loadEngine('model-a', (p) => seenBySecond.push(p.progress));
    await until(() => fake.load.mock.calls.length === 1, 'load() démarré');
    fake.emitProgress({ progress: 0.5, text: 'halfway' });
    fake.finishLoad();
    await Promise.all([first, second]);

    // Assert
    expect(seenByFirst).toEqual([0.5]);
    expect(seenBySecond).toEqual([0.5]);
  });

  it('après un échec, un nouvel appel relance réellement le chargement', async () => {
    // Arrange
    const fake = makeFakeEngine();
    (createCognitiveEngine as jest.Mock).mockResolvedValue(fake.engine);

    // Act — premier chargement échoue
    const first = loadEngine('model-a');
    await until(() => fake.load.mock.calls.length === 1, 'premier load() démarré');
    fake.failLoad(new Error('GPU indisponible'));
    await expect(first).rejects.toThrow('GPU indisponible');
    // Laisser le finally interne libérer le verrou de chargement
    await Promise.resolve();
    await Promise.resolve();

    // Un nouvel appel ne doit pas rejouer la promesse échouée
    const retry = loadEngine('model-a');
    await until(() => fake.load.mock.calls.length === 2, 'second load() démarré');
    fake.finishLoad();

    // Assert
    await expect(retry).resolves.toBe(fake.engine);
    expect(fake.load).toHaveBeenCalledTimes(2);
  });
});
