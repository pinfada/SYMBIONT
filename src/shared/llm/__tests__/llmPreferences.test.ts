import { llmPreferences } from '../llmPreferences';
import { DEFAULT_MODEL_ID } from '../modelCatalog';

// chrome.storage.local fonctionnel en mémoire (les mocks de setup.ts sont des
// jest.fn nus vidés par resetMocks : on réinstalle un vrai comportement ici).
function installMemoryStorage(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: (key: string) =>
          Promise.resolve(key in store ? { [key]: store[key] } : {}),
        set: (obj: Record<string, unknown>) => {
          Object.assign(store, obj);
          return Promise.resolve();
        },
      },
    },
  };
  return store;
}

describe('llmPreferences', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it('loads defaults when nothing is stored', async () => {
    const p = await llmPreferences.load();
    expect(p.enabled).toBe(false);
    expect(p.downloadConsented).toBe(false);
    expect(p.modelId).toBe(DEFAULT_MODEL_ID);
  });

  it('persists updates and normalizes the model id', async () => {
    await llmPreferences.load();
    const updated = await llmPreferences.update({
      enabled: true,
      downloadConsented: true,
      modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    });
    expect(updated.enabled).toBe(true);
    expect(updated.modelId).toBe('Llama-3.2-1B-Instruct-q4f16_1-MLC');

    // Un id inconnu retombe sur le défaut.
    const normalized = await llmPreferences.update({ modelId: 'nope' });
    expect(normalized.modelId).toBe(DEFAULT_MODEL_ID);
  });

  it('reloads persisted values from storage', async () => {
    await llmPreferences.load();
    await llmPreferences.update({ enabled: true, modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC' });
    const reloaded = await llmPreferences.load();
    expect(reloaded.enabled).toBe(true);
    expect(reloaded.modelId).toBe('Qwen2.5-1.5B-Instruct-q4f16_1-MLC');
  });

  it('notifies subscribers on update', async () => {
    await llmPreferences.load();
    const seen: boolean[] = [];
    const unsub = llmPreferences.subscribe((p) => seen.push(p.enabled));
    await llmPreferences.update({ enabled: true });
    unsub();
    expect(seen[seen.length - 1]).toBe(true);
  });

  it('starts with an empty cached-models list', async () => {
    const p = await llmPreferences.load();
    expect(p.cachedModelIds).toEqual([]);
  });

  it('records a cached model exactly once and persists it', async () => {
    await llmPreferences.load();

    await llmPreferences.markModelCached('Llama-3.2-1B-Instruct-q4f16_1-MLC');
    await llmPreferences.markModelCached('Llama-3.2-1B-Instruct-q4f16_1-MLC');
    const p = llmPreferences.get();
    expect(p.cachedModelIds).toEqual(['Llama-3.2-1B-Instruct-q4f16_1-MLC']);

    // La liste survit à un rechargement depuis le stockage — c'est elle qui
    // permet la réactivation automatique après la perte du moteur.
    const reloaded = await llmPreferences.load();
    expect(reloaded.cachedModelIds).toEqual(['Llama-3.2-1B-Instruct-q4f16_1-MLC']);
  });

  it('sanitizes a corrupted cached-models list on load', async () => {
    installMemoryStorage({
      symbiont_llm_preferences: {
        enabled: true,
        downloadConsented: true,
        cachedModelIds: ['valid-id', 42, null, 'other-id'],
      },
    });

    const p = await llmPreferences.load();
    expect(p.cachedModelIds).toEqual(['valid-id', 'other-id']);
  });
});
