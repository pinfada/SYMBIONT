export type PluginType = 'ritual' | 'visualization';

export interface Plugin {
  id: string;
  type: PluginType;
  name: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component?: any; // React component ou fonction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run?: (...args: unknown[]) => any; // Pour rituels logiques
}

export class PluginManager {
  private static plugins: Plugin[] = [];

  static register(plugin: Plugin) {
    this.plugins.push(plugin);
  }

  static getPlugins(type?: PluginType): Plugin[] {
    return type ? this.plugins.filter(p => p.type === type) : [...this.plugins];
  }

  static getPluginById(id: string): Plugin | undefined {
    return this.plugins.find(p => p.id === id);
  }
} 