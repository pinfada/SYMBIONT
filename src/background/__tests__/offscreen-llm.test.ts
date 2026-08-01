import { installOffscreenLLM } from '../offscreen-llm';
import { LLM_TARGET, type LLMRequest, type LLMResponse } from '@/shared/llm/offscreenProtocol';

// Installe un faux chrome.runtime, capture le listener de installOffscreenLLM et
// les réponses envoyées.
function setup(engine: unknown, embeddingFactory?: (id: string) => Promise<unknown>) {
  let handler: ((m: unknown) => unknown) | undefined;
  const sent: LLMResponse[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).chrome = {
    runtime: {
      onMessage: { addListener: (cb: (m: unknown) => unknown) => (handler = cb) },
      sendMessage: (m: LLMResponse) => {
        sent.push(m);
        return Promise.resolve();
      },
    },
  };
  installOffscreenLLM(() => engine as never, embeddingFactory as never);
  return { dispatch: (r: LLMRequest) => handler?.(r), sent };
}

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('installOffscreenLLM', () => {
  it('handles a load request with progress then done', async () => {
    const engine = {
      load: jest.fn(async (_id: string, onP?: (p: { progress: number; text: string }) => void) => {
        onP?.({ progress: 0.5, text: 'x' });
      }),
      chat: jest.fn(),
      getStatus: () => 'ready',
      getModelId: () => 'Qwen',
    };
    const { dispatch, sent } = setup(engine);
    dispatch({ target: LLM_TARGET, kind: 'load', id: '1', modelId: 'Qwen' });
    await flush();
    expect(engine.load).toHaveBeenCalled();
    expect(sent.some((m) => m.event === 'progress')).toBe(true);
    const done = sent.find((m) => m.event === 'done');
    expect(done && done.event === 'done' && done.result).toEqual({ kind: 'load', modelId: 'Qwen' });
  });

  it('streams chat tokens and returns the full text', async () => {
    const engine = {
      load: jest.fn(),
      chat: jest.fn(async (_m: unknown, opts?: { onToken?: (d: string) => void }) => {
        opts?.onToken?.('a');
        opts?.onToken?.('b');
        return 'ab';
      }),
      getStatus: () => 'ready',
      getModelId: () => 'Qwen',
    };
    const { dispatch, sent } = setup(engine);
    dispatch({ target: LLM_TARGET, kind: 'chat', id: '2', messages: [{ role: 'user', content: 'hi' }] });
    await flush();
    const tokens = sent.filter((m) => m.event === 'token');
    expect(tokens).toHaveLength(2);
    const done = sent.find((m) => m.event === 'done');
    expect(done && done.event === 'done' && done.result).toEqual({ kind: 'chat', text: 'ab' });
  });

  it('replies with an error event when the engine throws', async () => {
    const engine = {
      load: jest.fn(async () => {
        throw new Error('gpu boom');
      }),
      chat: jest.fn(),
      getStatus: () => 'error',
      getModelId: () => null,
    };
    const { dispatch, sent } = setup(engine);
    dispatch({ target: LLM_TARGET, kind: 'load', id: '3', modelId: 'X' });
    await flush();
    const err = sent.find((m) => m.event === 'error');
    expect(err && err.event === 'error' && err.message).toBe('gpu boom');
  });

  it('handles an embed request via a lazily-loaded embedding engine', async () => {
    const engine = { load: jest.fn(), chat: jest.fn(), getStatus: () => 'idle', getModelId: () => null };
    const embeddingFactory = jest.fn(async () => ({
      embeddings: { create: async () => ({ data: [{ embedding: [0.5, 0.6] }] }) },
    }));
    const { dispatch, sent } = setup(engine, embeddingFactory);
    dispatch({ target: LLM_TARGET, kind: 'embed', id: '9', text: 'vectorise-moi' });
    await flush();
    expect(embeddingFactory).toHaveBeenCalled();
    const done = sent.find((m) => m.event === 'done');
    expect(done && done.event === 'done' && done.result).toEqual({ kind: 'embed', embedding: [0.5, 0.6] });
  });

  it('ignores messages that are not LLM requests', () => {
    const engine = { load: jest.fn(), chat: jest.fn(), getStatus: () => 'idle', getModelId: () => null };
    const { dispatch } = setup(engine);
    expect(dispatch({ foo: 'bar' } as never)).toBe(false);
  });
});
