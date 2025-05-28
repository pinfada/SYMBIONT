import { PluginManager, Plugin } from './PluginManager';

describe('PluginManager', () => {
  beforeEach(() => {
    // @ts-ignore
    PluginManager['plugins'] = [];
  });

  it('enregistre et récupère un plugin', () => {
    const plugin: Plugin = { id: 'test', type: 'ritual', name: 'Test' };
    PluginManager.register(plugin);
    expect(PluginManager.getPlugins().length).toBe(1);
    expect(PluginManager.getPluginById('test')).toEqual(plugin);
  });

  it('filtre par type', () => {
    PluginManager.register({ id: 'a', type: 'ritual', name: 'A' });
    PluginManager.register({ id: 'b', type: 'visualization', name: 'B' });
    expect(PluginManager.getPlugins('ritual').length).toBe(1);
    expect(PluginManager.getPlugins('visualization').length).toBe(1);
  });

  it('retourne undefined pour un id inconnu', () => {
    expect(PluginManager.getPluginById('inconnu')).toBeUndefined();
  });
}); 