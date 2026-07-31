/**
 * Tests du service de préférences : garantit que les réglages de la page
 * Paramètres sont réellement persistés et propagés (outils fonctionnels).
 */

describe('OrganismPreferences', () => {
  const store: Record<string, unknown> = {};

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    (global as { chrome?: unknown }).chrome = {
      storage: {
        local: {
          get: (keys: string[]) =>
            Promise.resolve(
              (Array.isArray(keys) ? keys : [keys]).reduce((r: Record<string, unknown>, k) => {
                if (store[k] !== undefined) r[k] = store[k];
                return r;
              }, {}),
            ),
          set: (items: Record<string, unknown>) => {
            Object.assign(store, items);
            return Promise.resolve();
          },
        },
      },
    };
  });

  function freshModule() {
    let mod: typeof import('./OrganismPreferences');
    jest.isolateModules(() => { mod = require('./OrganismPreferences'); });
    // @ts-expect-error assigned within isolateModules
    return mod;
  }

  it('expose des valeurs par défaut cohérentes', () => {
    const { organismPreferences } = freshModule();
    const p = organismPreferences.get();
    expect(p.renderQuality).toBe('high');
    expect(typeof p.reduceMotion).toBe('boolean');
  });

  it('persiste une mise à jour dans chrome.storage.local', async () => {
    const { organismPreferences } = freshModule();
    await organismPreferences.load();
    await organismPreferences.update({ renderQuality: 'eco' });
    expect((store['symbiont_preferences'] as { renderQuality: string }).renderQuality).toBe('eco');
    expect(organismPreferences.get().renderQuality).toBe('eco');
  });

  it('recharge les préférences stockées', async () => {
    store['symbiont_preferences'] = { reduceMotion: true, renderQuality: 'standard' };
    const { organismPreferences } = freshModule();
    await organismPreferences.load();
    expect(organismPreferences.get().reduceMotion).toBe(true);
    expect(organismPreferences.get().renderQuality).toBe('standard');
  });

  it('notifie les abonnés lors d\'un changement, puis plus après désabonnement', async () => {
    const { organismPreferences } = freshModule();
    await organismPreferences.load();
    const seen: string[] = [];
    const unsub = organismPreferences.subscribe((p) => seen.push(p.renderQuality));
    // subscribe notifie immédiatement avec la valeur courante
    expect(seen).toEqual(['high']);
    await organismPreferences.update({ renderQuality: 'eco' });
    expect(seen).toEqual(['high', 'eco']);
    unsub();
    await organismPreferences.update({ renderQuality: 'standard' });
    expect(seen).toEqual(['high', 'eco']); // aucun ajout après désabonnement
  });

  it('mappe la qualité vers un facteur de supersampling', () => {
    const { RENDER_SCALE } = freshModule();
    expect(RENDER_SCALE.high).toBeGreaterThan(RENDER_SCALE.standard);
    expect(RENDER_SCALE.standard).toBeGreaterThan(RENDER_SCALE.eco);
  });
});
