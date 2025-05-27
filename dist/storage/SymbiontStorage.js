"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbiontStorage = void 0;
// Squelette minimal pour lever les erreurs d'import
class SymbiontStorage {
    async initialize() { }
    async getOrganism() { return null; }
    async saveOrganism(org) { }
    async getBehavior(url) { return null; }
    async saveBehavior(behavior) { }
    async addMutation(mutation) { }
    async getRecentMutations(count) { return []; }
    static getInstance() {
        if (!window.__symbiontStorage) {
            window.__symbiontStorage = new SymbiontStorage();
        }
        return window.__symbiontStorage;
    }
    async getBehaviorPatterns() { return []; }
    async getRecentActivity(ms) { return []; }
    async getSetting(key) { return null; }
    async setSetting(key, value) { }
}
exports.SymbiontStorage = SymbiontStorage;
exports.default = SymbiontStorage;
