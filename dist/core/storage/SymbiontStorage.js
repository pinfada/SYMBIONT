"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbiontStorage = void 0;
class SymbiontStorage {
    constructor() {
        this.db = null;
        this.DB_NAME = 'symbiont-db';
        this.DB_VERSION = 1;
    }
    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Organism state store
                if (!db.objectStoreNames.contains('organism')) {
                    db.createObjectStore('organism', { keyPath: 'id' });
                }
                // Behavior patterns store
                if (!db.objectStoreNames.contains('behaviors')) {
                    const behaviorStore = db.createObjectStore('behaviors', { keyPath: 'url' });
                    behaviorStore.createIndex('visitCount', 'visitCount', { unique: false });
                    behaviorStore.createIndex('lastVisit', 'lastVisit', { unique: false });
                }
                // Mutations history store
                if (!db.objectStoreNames.contains('mutations')) {
                    const mutationStore = db.createObjectStore('mutations', { autoIncrement: true });
                    mutationStore.createIndex('timestamp', 'timestamp', { unique: false });
                    mutationStore.createIndex('type', 'type', { unique: false });
                }
                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }
    async getOrganism() {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['organism'], 'readonly');
            const store = transaction.objectStore('organism');
            const request = store.get('current');
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }
    async saveOrganism(organism) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['organism'], 'readwrite');
            const store = transaction.objectStore('organism');
            const request = store.put({ ...organism, id: 'current' });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async getBehavior(url) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['behaviors'], 'readonly');
            const store = transaction.objectStore('behaviors');
            const request = store.get(url);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }
    async saveBehavior(behavior) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['behaviors'], 'readwrite');
            const store = transaction.objectStore('behaviors');
            const request = store.put(behavior);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async addMutation(mutation) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['mutations'], 'readwrite');
            const store = transaction.objectStore('mutations');
            const request = store.add(mutation);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async getRecentMutations(limit = 10) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['mutations'], 'readonly');
            const store = transaction.objectStore('mutations');
            const index = store.index('timestamp');
            const request = index.openCursor(null, 'prev');
            const mutations = [];
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && mutations.length < limit) {
                    mutations.push(cursor.value);
                    cursor.continue();
                }
                else {
                    resolve(mutations);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
    async getSetting(key, defaultValue) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : defaultValue);
            };
            request.onerror = () => reject(request.error);
        });
    }
    async setSetting(key, value) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}
exports.SymbiontStorage = SymbiontStorage;
