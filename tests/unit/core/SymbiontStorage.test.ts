import { SymbiontStorage } from '../../../../src/core/storage/SymbiontStorage';

describe('SymbiontStorage', () => {
  let storage: SymbiontStorage;
  beforeEach(() => {
    storage = new SymbiontStorage();
  });

  it('s instancie et initialise sans erreur', async () => {
    await expect(storage.initialize()).resolves.not.toThrow();
  });

  it('sauvegarde et récupère une valeur', async () => {
    await storage.initialize();
    await storage.saveOrganism({ id: 'test', generation: 1, health: 1, energy: 1, traits: { curiosity: 1 } });
    const org = await storage.getOrganism();
    expect(org).toBeDefined();
    expect(org.id).toBe('test');
  });
});
