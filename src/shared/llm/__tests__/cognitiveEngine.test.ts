import { createCognitiveEngine, type CognitiveEngine } from '../cognitiveEngine';

function stubEngine(location: 'offscreen' | 'popup'): CognitiveEngine {
  return {
    location,
    load: jest.fn(async () => {}),
    chat: jest.fn(async () => ''),
    analyze: jest.fn(async () => ({ score: 50, level: 'moyenne', summary: '', signals: [] })),
    isReady: () => true,
    getStatus: () => 'ready',
    getModelId: () => null,
  };
}

describe('createCognitiveEngine', () => {
  it('uses the offscreen engine when ensure() succeeds', async () => {
    const offscreen = { ...stubEngine('offscreen'), ensure: jest.fn(async () => {}) };
    const engine = await createCognitiveEngine({
      makeOffscreen: () => offscreen,
      makePopup: () => stubEngine('popup'),
    });
    expect(offscreen.ensure).toHaveBeenCalled();
    expect(engine.location).toBe('offscreen');
  });

  it('falls back to the popup engine when ensure() fails', async () => {
    const offscreen = {
      ...stubEngine('offscreen'),
      ensure: jest.fn(async () => {
        throw new Error('no offscreen');
      }),
    };
    const engine = await createCognitiveEngine({
      makeOffscreen: () => offscreen,
      makePopup: () => stubEngine('popup'),
    });
    expect(engine.location).toBe('popup');
  });
});
