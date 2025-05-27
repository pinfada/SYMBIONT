import { NavigationCortex, NavigationEvent, PatternDetector } from '../../../../src/core/NavigationCortex';

describe('NavigationCortex', () => {
  let cortex: NavigationCortex;

  beforeEach(() => {
    cortex = new NavigationCortex();
  });

  it('enregistre des événements de navigation', () => {
    const event: NavigationEvent = { url: 'https://a.com', timestamp: 1, action: 'visit' };
    cortex.recordEvent(event);
    expect(cortex.toJSON().events.length).toBe(1);
    expect(cortex.toJSON().events[0].url).toBe('https://a.com');
  });

  it('ajoute et exécute un détecteur de routine', () => {
    // Détecteur simple : routine si même URL > 2 fois
    const routineDetector: PatternDetector = (events) => {
      const counts: Record<string, number> = {};
      for (const e of events) counts[e.url] = (counts[e.url] || 0) + 1;
      return Object.entries(counts)
        .filter(([_, c]) => c > 2)
        .map(([url, c]) => ({ type: 'routine', score: c, details: { url } }));
    };
    cortex.addDetector(routineDetector);
    cortex.recordEvent({ url: 'https://a.com', timestamp: 1, action: 'visit' });
    cortex.recordEvent({ url: 'https://a.com', timestamp: 2, action: 'visit' });
    cortex.recordEvent({ url: 'https://a.com', timestamp: 3, action: 'visit' });
    const patterns = cortex.getPatterns();
    expect(patterns.length).toBe(1);
    expect(patterns[0].type).toBe('routine');
    expect(patterns[0].details.url).toBe('https://a.com');
  });

  it('ajoute et exécute un détecteur d exploration', () => {
    // Exploration : >2 URLs différentes
    const explorationDetector: PatternDetector = (events) => {
      const unique = new Set(events.map(e => e.url));
      return unique.size > 2 ? [{ type: 'exploration', score: unique.size }] : [];
    };
    cortex.addDetector(explorationDetector);
    cortex.recordEvent({ url: 'https://a.com', timestamp: 1, action: 'visit' });
    cortex.recordEvent({ url: 'https://b.com', timestamp: 2, action: 'visit' });
    cortex.recordEvent({ url: 'https://c.com', timestamp: 3, action: 'visit' });
    const patterns = cortex.getPatterns();
    expect(patterns.length).toBe(1);
    expect(patterns[0].type).toBe('exploration');
  });

  it('reset réinitialise l historique', () => {
    cortex.recordEvent({ url: 'https://a.com', timestamp: 1, action: 'visit' });
    cortex.reset();
    expect(cortex.toJSON().events.length).toBe(0);
    expect(cortex.toJSON().lastPatterns.length).toBe(0);
  });

  it('toJSON exporte un objet cohérent', () => {
    cortex.recordEvent({ url: 'https://a.com', timestamp: 1, action: 'visit' });
    const json = cortex.toJSON();
    expect(Array.isArray(json.events)).toBe(true);
    expect(json.detectors).toBeGreaterThanOrEqual(0);
  });

  it('gère le cas sans événement ni détecteur', () => {
    expect(cortex.getPatterns()).toEqual([]);
    expect(cortex.toJSON().events).toEqual([]);
  });
}); 