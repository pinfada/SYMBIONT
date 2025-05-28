"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManager = void 0;
class PluginManager {
    static register(plugin) {
        this.plugins.push(plugin);
    }
    static getPlugins(type) {
        return type ? this.plugins.filter(p => p.type === type) : [...this.plugins];
    }
    static getPluginById(id) {
        return this.plugins.find(p => p.id === id);
    }
}
exports.PluginManager = PluginManager;
PluginManager.plugins = [];
