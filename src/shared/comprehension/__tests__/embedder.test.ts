import { HashingEmbedder, cosineSimilarity } from '../embedder';

describe('HashingEmbedder', () => {
  const emb = new HashingEmbedder(64);

  it('is deterministic', () => {
    expect(emb.embed('les vaccins sont sûrs')).toEqual(emb.embed('les vaccins sont sûrs'));
  });

  it('produces a normalized vector of the right dimension', () => {
    const v = emb.embed('un texte quelconque à encoder');
    expect(v).toHaveLength(64);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('returns a zero vector for empty / stopword-only text', () => {
    const v = emb.embed('le la de et');
    expect(v.every((x) => x === 0)).toBe(true);
  });

  it('is accent-insensitive', () => {
    expect(cosineSimilarity(emb.embed('déplacé'), emb.embed('deplace'))).toBeGreaterThan(0.9);
  });

  it('rates related texts closer than unrelated ones', () => {
    const a = emb.embed('la sûreté des vaccins est prouvée par les études');
    const related = emb.embed('les études prouvent que les vaccins sont sûrs');
    const unrelated = emb.embed('le cours du pétrole a chuté à Rotterdam');
    expect(cosineSimilarity(a, related)).toBeGreaterThan(cosineSimilarity(a, unrelated));
  });
});

describe('cosineSimilarity', () => {
  it('is 1 for identical normalized vectors', () => {
    const v = new HashingEmbedder().embed('quelque chose de concret');
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });
});
