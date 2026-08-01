import { SemanticEmbedder, type EmbeddingEngine } from '../SemanticEmbedder';
import { HashingEmbedder } from '../embedder';
import { hashingEmbedFn } from '../embedFn';

function fakeEngine(vectors: Record<string, number[]>, onCall?: () => void): EmbeddingEngine {
  return {
    embeddings: {
      create: async ({ input }) => {
        onCall?.();
        const text = Array.isArray(input) ? input[0] : input;
        const vec = vectors[text];
        return { data: vec ? [{ embedding: vec }] : [] };
      },
    },
  };
}

describe('SemanticEmbedder', () => {
  it('returns the model embedding', async () => {
    const se = new SemanticEmbedder(fakeEngine({ bonjour: [1, 2, 3] }));
    expect(await se.embed('bonjour')).toEqual([1, 2, 3]);
  });

  it('caches (calls the engine once per distinct text)', async () => {
    let calls = 0;
    const se = new SemanticEmbedder(fakeEngine({ x: [0.1, 0.2] }, () => (calls += 1)));
    await se.embed('x');
    await se.embed('x');
    expect(calls).toBe(1);
  });

  it('falls back to the provided EmbedFn when the engine yields nothing', async () => {
    const fallback = hashingEmbedFn(new HashingEmbedder(8));
    const se = new SemanticEmbedder(fakeEngine({}), fallback); // moteur renvoie vide
    const vec = await se.embed('un texte concret quelconque');
    expect(vec).toHaveLength(8); // vient du fallback de hachage
  });

  it('rejects when the engine fails and no fallback is set', async () => {
    const engine: EmbeddingEngine = {
      embeddings: {
        create: async () => {
          throw new Error('gpu down');
        },
      },
    };
    const se = new SemanticEmbedder(engine);
    await expect(se.embed('x')).rejects.toThrow('gpu down');
  });
});
