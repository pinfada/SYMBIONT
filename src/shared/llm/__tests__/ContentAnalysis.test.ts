import {
  analyzeContent,
  buildAnalysisPrompt,
  parseReport,
  levelFromScore,
  type ChatCapable,
} from '../ContentAnalysis';

describe('levelFromScore', () => {
  it('maps score ranges to levels', () => {
    expect(levelFromScore(90)).toBe('élevée');
    expect(levelFromScore(67)).toBe('élevée');
    expect(levelFromScore(50)).toBe('moyenne');
    expect(levelFromScore(34)).toBe('moyenne');
    expect(levelFromScore(20)).toBe('faible');
    expect(levelFromScore(0)).toBe('faible');
  });
});

describe('buildAnalysisPrompt', () => {
  it('produces a system + user message and includes the domain', () => {
    const msgs = buildAnalysisPrompt('bonjour', { domain: 'exemple.test' });
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[1].role).toBe('user');
    expect(msgs[1].content).toContain('exemple.test');
    expect(msgs[1].content).toContain('bonjour');
  });

  it('truncates content to maxChars', () => {
    const long = 'a'.repeat(10000);
    const msgs = buildAnalysisPrompt(long, { maxChars: 100 });
    expect(msgs[1].content).toContain('a'.repeat(100));
    expect(msgs[1].content).not.toContain('a'.repeat(101));
  });
});

describe('parseReport', () => {
  it('parses a clean JSON response', () => {
    const r = parseReport('{"score": 82, "summary": "Source fiable", "signals": ["sources citées"]}', 'x.test');
    expect(r.score).toBe(82);
    expect(r.level).toBe('élevée');
    expect(r.summary).toBe('Source fiable');
    expect(r.signals).toEqual(['sources citées']);
    expect(r.domain).toBe('x.test');
  });

  it('extracts JSON embedded in surrounding prose', () => {
    const raw = 'Voici mon analyse : {"score": 15, "summary": "Désinfo", "signals": ["complot","peur"]} voilà.';
    const r = parseReport(raw);
    expect(r.score).toBe(15);
    expect(r.level).toBe('faible');
    expect(r.signals).toEqual(['complot', 'peur']);
  });

  it('clamps out-of-range scores and filters non-string signals', () => {
    const r = parseReport('{"score": 250, "summary": "x", "signals": ["ok", 5, null]}');
    expect(r.score).toBe(100);
    expect(r.signals).toEqual(['ok']);
  });

  it('falls back to a neutral report on unparsable output', () => {
    const r = parseReport('je ne sais pas répondre en JSON');
    expect(r.score).toBe(50);
    expect(r.level).toBe('moyenne');
    expect(r.signals).toEqual([]);
  });
});

describe('analyzeContent', () => {
  it('calls the engine and returns a parsed report', async () => {
    const engine: ChatCapable = {
      chat: jest.fn(async () => '{"score": 12, "summary": "Manipulation", "signals": ["sensationnalisme"]}'),
    };
    const report = await analyzeContent(engine, 'texte suspect', { domain: 'faux.test' });
    expect(engine.chat).toHaveBeenCalledTimes(1);
    expect(report.level).toBe('faible');
    expect(report.score).toBe(12);
    expect(report.domain).toBe('faux.test');
  });
});
