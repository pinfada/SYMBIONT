export type PluginType = 'ritual' | 'visualization';
export interface Plugin {
    id: string;
    type: PluginType;
    name: string;
    description?: string;
    component?: any;
    run?: (...args: any[]) => any;
}
export declare class PluginManager {
    private static plugins;
    static register(plugin: Plugin): void;
    static getPlugins(type?: PluginType): Plugin[];
    static getPluginById(id: string): Plugin | undefined;
}
