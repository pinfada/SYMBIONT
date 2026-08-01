import { LocalLLMEngine, type CreateEngineFn } from '../LocalLLMEngine';

// Fabrique un moteur factice qui streame les deltas fournis.
function fakeEngineFactory(deltas: string[], opts?: { unload?: () => Promise<void> }) {
  const create = jest.fn(async () => {
    return {
      async *[Symbol.asyncIterator]() {
        for (const d of deltas) {
          yield { choices: [{ delta: { content: d } }] };
        }
      },
    };
  });
  const interruptGenerate = jest.fn();
  const engine = {
    chat: { completions: { create } },
    interruptGenerate,
    unload: opts?.unload ?? (async () => {}),
  };
  const createEngine: CreateEngineFn = jest.fn(async (_modelId, initOpts) => {
    initOpts.initProgressCallback?.({ progress: 0.5, text: 'Fetching…' });
    initOpts.initProgressCallback?.({ progress: 1, text: 'Ready' });
    return engine as never;
  });
  return { createEngine, create, interruptGenerate, engine };
}

describe('LocalLLMEngine', () => {
  it('loads a model and reports progress', async () => {
    const { createEngine } = fakeEngineFactory(['hi']);
    const eng = new LocalLLMEngine({ createEngine });
    const progress: number[] = [];
    await eng.load('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', (p) => progress.push(p.progress));
    expect(eng.isReady()).toBe(true);
    expect(eng.getStatus()).toBe('ready');
    expect(eng.getModelId()).toBe('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
    expect(progress).toContain(1);
  });

  it('normalizes an unknown model id to the default', async () => {
    const { createEngine } = fakeEngineFactory([]);
    const eng = new LocalLLMEngine({ createEngine });
    await eng.load('bogus-model');
    expect(eng.getModelId()).toBe('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
  });

  it('is idempotent when the same model is already loaded', async () => {
    const { createEngine } = fakeEngineFactory([]);
    const eng = new LocalLLMEngine({ createEngine });
    await eng.load('Llama-3.2-1B-Instruct-q4f16_1-MLC');
    await eng.load('Llama-3.2-1B-Instruct-q4f16_1-MLC');
    expect(createEngine).toHaveBeenCalledTimes(1);
  });

  it('streams tokens and returns the full text', async () => {
    const { createEngine } = fakeEngineFactory(['Bon', 'jour', ' 👋']);
    const eng = new LocalLLMEngine({ createEngine });
    await eng.load('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
    const tokens: string[] = [];
    const full = await eng.chat([{ role: 'user', content: 'salut' }], {
      onToken: (d) => tokens.push(d),
    });
    expect(tokens).toEqual(['Bon', 'jour', ' 👋']);
    expect(full).toBe('Bonjour 👋');
    expect(eng.getStatus()).toBe('ready');
  });

  it('supports a non-streaming engine response', async () => {
    const createEngine: CreateEngineFn = async () =>
      ({
        chat: {
          completions: {
            create: async () => ({ choices: [{ message: { content: 'complete answer' } }] }),
          },
        },
      }) as never;
    const eng = new LocalLLMEngine({ createEngine });
    await eng.load('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
    const full = await eng.chat([{ role: 'user', content: 'x' }]);
    expect(full).toBe('complete answer');
  });

  it('throws when chat is called before load', async () => {
    const eng = new LocalLLMEngine({ createEngine: fakeEngineFactory([]).createEngine });
    await expect(eng.chat([{ role: 'user', content: 'x' }])).rejects.toThrow(/aucun modèle/i);
  });

  it('stops streaming when the signal aborts', async () => {
    const { createEngine, interruptGenerate } = fakeEngineFactory(['a', 'b', 'c', 'd']);
    const eng = new LocalLLMEngine({ createEngine });
    await eng.load('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
    const ac = new AbortController();
    const tokens: string[] = [];
    const full = await eng.chat([{ role: 'user', content: 'x' }], {
      signal: ac.signal,
      onToken: (d) => {
        tokens.push(d);
        if (tokens.length === 2) ac.abort();
      },
    });
    expect(tokens.length).toBeLessThan(4);
    expect(interruptGenerate).toHaveBeenCalled();
    expect(full).toBe('ab');
  });

  it('sets error status and rethrows on load failure', async () => {
    const createEngine: CreateEngineFn = async () => {
      throw new Error('webgpu boom');
    };
    const eng = new LocalLLMEngine({ createEngine });
    await expect(eng.load('Qwen2.5-0.5B-Instruct-q4f16_1-MLC')).rejects.toThrow('webgpu boom');
    expect(eng.getStatus()).toBe('error');
    expect(eng.isReady()).toBe(false);
  });

  it('unload releases the engine and resets status', async () => {
    const unload = jest.fn(async () => {});
    const { createEngine } = fakeEngineFactory([], { unload });
    const eng = new LocalLLMEngine({ createEngine });
    await eng.load('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
    await eng.unload();
    expect(unload).toHaveBeenCalled();
    expect(eng.getStatus()).toBe('idle');
    expect(eng.getModelId()).toBeNull();
  });
});
