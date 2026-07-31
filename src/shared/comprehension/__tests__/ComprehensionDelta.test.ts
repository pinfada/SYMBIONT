import { KnowledgeModel } from '../KnowledgeModel';
import { HashingEmbedder } from '../embedder';
import { parseClaims } from '../ClaimExtractor';
import { assessDelta } from '../ComprehensionDelta';
import { digestPage } from '../digest';
import type { ChatCapable } from '../../llm/ContentAnalysis';

const emb = new HashingEmbedder(64);

// Faux moteur : répond aux extractions de claims et aux classements de relation
// selon une config, en lisant le prompt.
function makeEngine(cfg: {
  claims: string[];
  relations?: Record<string, { kind: string; related: number; confidence: number }>;
}): ChatCapable {
  return {
    chat: async (messages) => {
      const sys = messages[0]?.content ?? '';
      const user = messages[1]?.content ?? '';
      if (sys.includes('extrais les affirmations')) {
        return JSON.stringify({ claims: cfg.claims });
      }
      const m = user.match(/AFFIRMATION :\n([\s\S]*?)\n\nCROYANCES/);
      const claim = m ? m[1].trim() : '';
      const rel = cfg.relations?.[claim] ?? { kind: 'nouveau', related: -1, confidence: 0.3 };
      return JSON.stringify({ ...rel, rationale: 'test' });
    },
  };
}

describe('parseClaims', () => {
  it('parses a claims array and drops fragments', () => {
    expect(parseClaims('{"claims":["une affirmation valable","ok","une autre affirmation"]}')).toEqual([
      'une affirmation valable',
      'une autre affirmation',
    ]);
  });
  it('returns [] on garbage', () => {
    expect(parseClaims('pas du json')).toEqual([]);
  });
});

describe('assessDelta', () => {
  function seededModel() {
    const m = new KnowledgeModel(emb);
    m.assimilate('la sûreté des vaccins est prouvée', { now: 1 });
    return m;
  }

  it('CONFIRME → does not surface (score 0)', async () => {
    const model = seededModel();
    const claim = 'la sûreté des vaccins est prouvée';
    const engine = makeEngine({ claims: [claim], relations: { [claim]: { kind: 'confirme', related: 0, confidence: 0.9 } } });
    const report = await assessDelta(engine, model, [claim]);
    expect(report.surface).toBe(false);
    expect(report.score).toBe(0);
  });

  it('CONTREDIT → surfaces with high score', async () => {
    const model = seededModel();
    const claim = 'la sûreté des vaccins est un mensonge';
    const engine = makeEngine({ claims: [claim], relations: { [claim]: { kind: 'contredit', related: 0, confidence: 0.9 } } });
    const report = await assessDelta(engine, model, [claim], { domain: 'x.test' });
    expect(report.surface).toBe(true);
    expect(report.dominantKind).toBe('contredit');
    expect(report.revisions).toHaveLength(1);
    expect(report.revisions[0].relatedClaimId).toBeDefined();
    expect(report.domain).toBe('x.test');
  });

  it('ANTI-FEED: pure novelty (even highly confident) does NOT surface', async () => {
    const model = seededModel();
    const claim = 'le cours du cacao a doublé en Côte d’Ivoire cette année';
    const engine = makeEngine({ claims: [claim], relations: { [claim]: { kind: 'nouveau', related: -1, confidence: 0.99 } } });
    const report = await assessDelta(engine, model, [claim]);
    expect(report.surface).toBe(false); // la nouveauté ne fait jamais surface
    expect(report.score).toBeLessThan(0.5);
  });

  it('COMPLÈTE above threshold → surfaces', async () => {
    const model = seededModel();
    const claim = 'la sûreté des vaccins vaut surtout pour les adultes';
    const engine = makeEngine({ claims: [claim], relations: { [claim]: { kind: 'complète', related: 0, confidence: 1 } } });
    const report = await assessDelta(engine, model, [claim]);
    expect(report.surface).toBe(true);
    expect(report.dominantKind).toBe('complète');
  });
});

describe('digestPage', () => {
  it('extracts, assesses, and always accretes to the model', async () => {
    const model = new KnowledgeModel(emb);
    model.assimilate('la sûreté des vaccins est prouvée', { now: 1 });
    const claim = 'la sûreté des vaccins est un mensonge';
    const engine = makeEngine({
      claims: [claim],
      relations: { [claim]: { kind: 'contredit', related: 0, confidence: 0.9 } },
    });
    const before = model.size();
    const res = await digestPage(engine, model, 'texte de page', { domain: 'x.test', now: 42 });
    expect(res.claimCount).toBe(1);
    expect(res.surface).toBe(true);
    expect(model.size()).toBe(before + 1); // la nouvelle affirmation est digérée
  });

  it('confirming content stays silent but reinforces the belief', async () => {
    const model = new KnowledgeModel(emb);
    model.assimilate('la sûreté des vaccins est prouvée', { now: 1 });
    const claim = 'la sûreté des vaccins est prouvée';
    const engine = makeEngine({ claims: [claim], relations: { [claim]: { kind: 'confirme', related: 0, confidence: 0.9 } } });
    const res = await digestPage(engine, model, 'texte', { now: 99 });
    expect(res.surface).toBe(false);
    expect(model.retrieve(claim, 1)[0].claim.salience).toBe(2); // renforcée, pas dupliquée
    expect(model.size()).toBe(1);
  });

  it('returns an empty digest when no claims are extracted', async () => {
    const model = new KnowledgeModel(emb);
    const engine = makeEngine({ claims: [] });
    const res = await digestPage(engine, model, '', { now: 1 });
    expect(res.claimCount).toBe(0);
    expect(res.surface).toBe(false);
  });
});
