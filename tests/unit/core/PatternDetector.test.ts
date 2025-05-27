import { PatternDetector, SequenceEvent } from '../../../../src/core/PatternDetector';

describe('PatternDetector', () => {
  it('détecte les répétitions', () => {
    const events: SequenceEvent[] = [
      { type: 'A', timestamp: 1 },
      { type: 'A', timestamp: 2 },
      { type: 'A', timestamp: 3 },
      { type: 'B', timestamp: 4 }
    ];
    const patterns = PatternDetector.detectRepetition(events, 3);
    expect(patterns.length).toBe(1);
    expect(patterns[0].type).toBe('repetition');
    expect(patterns[0].details.eventType).toBe('A');
  });

  it('ne détecte pas de répétition si seuil non atteint', () => {
    const events: SequenceEvent[] = [
      { type: 'A', timestamp: 1 },
      { type: 'A', timestamp: 2 },
      { type: 'B', timestamp: 3 }
    ];
    const patterns = PatternDetector.detectRepetition(events, 3);
    expect(patterns.length).toBe(0);
  });

  it('détecte une alternance', () => {
    const events: SequenceEvent[] = [
      { type: 'A', timestamp: 1 },
      { type: 'B', timestamp: 2 },
      { type: 'A', timestamp: 3 },
      { type: 'B', timestamp: 4 }
    ];
    const patterns = PatternDetector.detectAlternance(events, 'A', 'B', 4);
    expect(patterns.length).toBe(1);
    expect(patterns[0].type).toBe('alternance');
  });

  it('ne détecte pas d alternance si séquence trop courte', () => {
    const events: SequenceEvent[] = [
      { type: 'A', timestamp: 1 },
      { type: 'B', timestamp: 2 },
      { type: 'A', timestamp: 3 }
    ];
    const patterns = PatternDetector.detectAlternance(events, 'A', 'B', 4);
    expect(patterns.length).toBe(0);
  });

  it('détecte un burst temporel', () => {
    const now = Date.now();
    const events: SequenceEvent[] = [
      { type: 'A', timestamp: now },
      { type: 'A', timestamp: now + 100 },
      { type: 'A', timestamp: now + 200 },
      { type: 'A', timestamp: now + 2000 }
    ];
    const patterns = PatternDetector.detectBurst(events, 500, 3);
    expect(patterns.length).toBe(1);
    expect(patterns[0].type).toBe('burst');
  });

  it('ne détecte pas de burst si intervalle trop grand', () => {
    const now = Date.now();
    const events: SequenceEvent[] = [
      { type: 'A', timestamp: now },
      { type: 'A', timestamp: now + 1000 },
      { type: 'A', timestamp: now + 2000 }
    ];
    const patterns = PatternDetector.detectBurst(events, 500, 3);
    expect(patterns.length).toBe(0);
  });

  it('détecte un motif temporel périodique', () => {
    const now = Date.now();
    const events: SequenceEvent[] = [
      { type: 'A', timestamp: now },
      { type: 'A', timestamp: now + 1000 },
      { type: 'A', timestamp: now + 2000 },
      { type: 'A', timestamp: now + 3000 }
    ];
    const patterns = PatternDetector.detectTemporalPattern(events, 900, 0.1);
    expect(patterns.length).toBe(1);
    expect(patterns[0].type).toBe('temporal');
  });

  it('ne détecte pas de motif temporel si variance trop forte', () => {
    const now = Date.now();
    const events: SequenceEvent[] = [
      { type: 'A', timestamp: now },
      { type: 'A', timestamp: now + 1000 },
      { type: 'A', timestamp: now + 3000 },
      { type: 'A', timestamp: now + 6000 }
    ];
    const patterns = PatternDetector.detectTemporalPattern(events, 900, 0.1);
    expect(patterns.length).toBe(0);
  });

  it('gère les cas limites (séquence vide, un seul événement)', () => {
    expect(PatternDetector.detectRepetition([], 2)).toEqual([]);
    expect(PatternDetector.detectAlternance([], 'A', 'B')).toEqual([]);
    expect(PatternDetector.detectBurst([], 1000, 2)).toEqual([]);
    expect(PatternDetector.detectTemporalPattern([], 1000, 0.1)).toEqual([]);
    expect(PatternDetector.detectRepetition([{ type: 'A', timestamp: 1 }], 2)).toEqual([]);
  });
}); 