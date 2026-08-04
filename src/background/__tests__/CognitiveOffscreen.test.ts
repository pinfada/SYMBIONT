// Régression couverte : le bail LLM sur le document offscreen était une
// variable mémoire du service worker MV3. Chrome tue le SW après ~30 s
// d'inactivité ; au réveil le bail repartait à false alors que le document
// offscreen gardait le modèle chargé — le pont WebGL pouvait alors fermer le
// document et détruire le modèle (« perte de contexte alors que le modèle a
// déjà été téléchargé »). Le bail est désormais persisté dans
// chrome.storage.session, dont la durée de vie correspond à celle du document.

type CognitiveOffscreenModule = typeof import('../CognitiveOffscreen');

const LEASE_KEY = 'symbiont_offscreen_llm_lease';

function installChrome(sessionStore: Record<string, unknown>, opts: { offscreen?: boolean } = {}) {
  const withOffscreen = opts.offscreen ?? true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).chrome = {
    storage: {
      session: {
        get: (key: string) =>
          Promise.resolve(key in sessionStore ? { [key]: sessionStore[key] } : {}),
        set: (obj: Record<string, unknown>) => {
          Object.assign(sessionStore, obj);
          return Promise.resolve();
        },
        remove: (key: string) => {
          delete sessionStore[key];
          return Promise.resolve();
        },
      },
    },
    ...(withOffscreen
      ? {
          offscreen: {
            createDocument: jest.fn(() => Promise.resolve()),
            hasDocument: jest.fn(() => Promise.resolve(false)),
          },
        }
      : {}),
    runtime: {
      getURL: (p: string) => `chrome-extension://test/${p}`,
      onMessage: { addListener: jest.fn() },
    },
  };
}

/** Import frais du module — simule un (re)démarrage du service worker. */
async function freshModule(): Promise<CognitiveOffscreenModule> {
  jest.resetModules();
  return import('../CognitiveOffscreen');
}

describe('CognitiveOffscreen — bail LLM persistant', () => {
  it('pose le bail et le persiste dans storage.session', async () => {
    // Arrange
    const sessionStore: Record<string, unknown> = {};
    installChrome(sessionStore);
    const mod = await freshModule();

    // Act
    await mod.ensureOffscreenForLLM();

    // Assert
    await expect(mod.isOffscreenLLMLeaseHeld()).resolves.toBe(true);
    expect(sessionStore[LEASE_KEY]).toBe(true);
  });

  it('retrouve le bail après un redémarrage du service worker', async () => {
    // Arrange — un premier « service worker » pose le bail
    const sessionStore: Record<string, unknown> = {};
    installChrome(sessionStore);
    const first = await freshModule();
    await first.ensureOffscreenForLLM();

    // Act — le SW est tué puis réveillé : module réimporté, mémoire vierge,
    // même storage.session
    const second = await freshModule();

    // Assert — sans persistance, ce serait false et le pont WebGL fermerait
    // le document offscreen avec le modèle chargé dedans
    await expect(second.isOffscreenLLMLeaseHeld()).resolves.toBe(true);
  });

  it('releaseOffscreenLLMLease efface le bail, y compris pour un futur réveil', async () => {
    // Arrange
    const sessionStore: Record<string, unknown> = {};
    installChrome(sessionStore);
    const mod = await freshModule();
    await mod.ensureOffscreenForLLM();

    // Act
    mod.releaseOffscreenLLMLease();
    // persistLease est asynchrone derrière un void — laisser la microtâche s'exécuter
    await Promise.resolve();
    await Promise.resolve();

    // Assert — le module courant ET un module réveillé voient le bail libéré
    await expect(mod.isOffscreenLLMLeaseHeld()).resolves.toBe(false);
    const rewoken = await freshModule();
    await expect(rewoken.isOffscreenLLMLeaseHeld()).resolves.toBe(false);
  });

  it('ne pose pas de bail quand l’API offscreen est absente (Firefox)', async () => {
    // Arrange — Firefox : pas de chrome.offscreen
    const sessionStore: Record<string, unknown> = {};
    installChrome(sessionStore, { offscreen: false });
    const mod = await freshModule();

    // Act / Assert
    await expect(mod.ensureOffscreenForLLM()).rejects.toThrow('API offscreen indisponible.');
    await expect(mod.isOffscreenLLMLeaseHeld()).resolves.toBe(false);
    expect(sessionStore[LEASE_KEY]).toBeUndefined();
  });
});
