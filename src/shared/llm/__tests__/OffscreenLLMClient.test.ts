import { OffscreenLLMClient } from '../OffscreenLLMClient';
import { LLM_TARGET, isLLMRequest, type LLMResponse } from '../offscreenProtocol';

// Faux runtime chrome : capture les messages envoyés et laisse le test
// « répondre » en rejouant des LLMResponse vers les listeners enregistrés.
function installFakeRuntime() {
  const listeners = new Set<(m: unknown) => void>();
  const sent: unknown[] = [];
  const runtime = {
    sendMessage: (msg: unknown) => {
      sent.push(msg);
      // Répond immédiatement au ENSURE_OFFSCREEN_LLM.
      if ((msg as { type?: string }).type === 'ENSURE_OFFSCREEN_LLM') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve();
    },
    onMessage: {
      addListener: (cb: (m: unknown) => void) => listeners.add(cb),
      removeListener: (cb: (m: unknown) => void) => listeners.delete(cb),
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).chrome = { runtime };
  const emit = (r: LLMResponse) => listeners.forEach((l) => l(r));
  const lastRequestId = () => {
    const req = [...sent].reverse().find((m) => isLLMRequest(m));
    return req ? (req as { id: string }).id : undefined;
  };
  return { sent, emit, lastRequestId, listenerCount: () => listeners.size };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('OffscreenLLMClient', () => {
  it('loads a model, forwarding progress and resolving on done', async () => {
    const fake = installFakeRuntime();
    const client = new OffscreenLLMClient({ timeoutMs: 1000 });
    const progress: number[] = [];
    const p = client.load('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', (x) => progress.push(x.progress));
    // laisse le microtask envoyer la requête
    await tick();
    const id = fake.lastRequestId()!;
    fake.emit({ source: LLM_TARGET, id, event: 'progress', progress: 0.5, text: 'x' });
    fake.emit({ source: LLM_TARGET, id, event: 'done', result: { kind: 'load', modelId: 'M' } });
    await p;
    expect(progress).toContain(0.5);
    expect(client.isReady()).toBe(true);
    expect(client.getModelId()).toBe('M');
  });

  it('streams chat tokens and returns the full text', async () => {
    const fake = installFakeRuntime();
    const client = new OffscreenLLMClient({ timeoutMs: 1000 });
    await client.ensure();
    const tokens: string[] = [];
    const p = client.chat([{ role: 'user', content: 'hi' }], { onToken: (t) => tokens.push(t) });
    await tick();
    const id = fake.lastRequestId()!;
    fake.emit({ source: LLM_TARGET, id, event: 'token', delta: 'a' });
    fake.emit({ source: LLM_TARGET, id, event: 'token', delta: 'b' });
    fake.emit({ source: LLM_TARGET, id, event: 'done', result: { kind: 'chat', text: 'ab' } });
    expect(await p).toBe('ab');
    expect(tokens).toEqual(['a', 'b']);
  });

  it('returns an analyze report', async () => {
    const fake = installFakeRuntime();
    const client = new OffscreenLLMClient({ timeoutMs: 1000 });
    await client.ensure();
    const p = client.analyze('texte', { domain: 'x.test' });
    await tick();
    const id = fake.lastRequestId()!;
    fake.emit({
      source: LLM_TARGET,
      id,
      event: 'done',
      result: { kind: 'analyze', report: { score: 20, level: 'faible', summary: 's', signals: [] } },
    });
    const report = await p;
    expect(report.level).toBe('faible');
  });

  it('returns a semantic embedding', async () => {
    const fake = installFakeRuntime();
    const client = new OffscreenLLMClient({ timeoutMs: 1000 });
    await client.ensure();
    const p = client.embed('texte à vectoriser');
    await tick();
    const id = fake.lastRequestId()!;
    fake.emit({ source: LLM_TARGET, id, event: 'done', result: { kind: 'embed', embedding: [0.1, 0.2, 0.3] } });
    expect(await p).toEqual([0.1, 0.2, 0.3]);
  });

  it('rejects on error event and removes its listener', async () => {
    const fake = installFakeRuntime();
    const client = new OffscreenLLMClient({ timeoutMs: 1000 });
    await client.ensure();
    const p = client.chat([{ role: 'user', content: 'hi' }]);
    await tick();
    const id = fake.lastRequestId()!;
    fake.emit({ source: LLM_TARGET, id, event: 'error', message: 'boom' });
    await expect(p).rejects.toThrow('boom');
    expect(fake.listenerCount()).toBe(0);
  });

  it('times out if the offscreen never answers', async () => {
    installFakeRuntime();
    const client = new OffscreenLLMClient({ timeoutMs: 30 });
    await client.ensure();
    await expect(client.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow(/délai/i);
  });
});
