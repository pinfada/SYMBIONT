"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundService = void 0;
// src/background/index.ts
// Point d'entrée Service Worker (Neural Core)
const MessageBus_1 = require("@shared/messaging/MessageBus");
const SymbiontStorage_1 = require("@storage/SymbiontStorage");
const NavigationObserver_1 = require("@shared/observers/NavigationObserver");
class BackgroundService {
    constructor() {
        this.organism = null;
        this.messageBus = new MessageBus_1.MessageBus('background');
        this.storage = new SymbiontStorage_1.SymbiontStorage();
        this.navigationObserver = new NavigationObserver_1.NavigationObserver(this.messageBus);
        this.initialize();
    }
    async initialize() {
        try {
            // Initialize storage
            await this.storage.initialize();
            // Load or create organism
            this.organism = await this.storage.getOrganism();
            if (!this.organism) {
                this.organism = this.createNewOrganism();
                await this.storage.saveOrganism(this.organism);
            }
            // Setup message handlers
            this.setupMessageHandlers();
            // Start periodic tasks
            this.startPeriodicTasks();
            console.log('Background service initialized');
        }
        catch (error) {
            console.error('Failed to initialize background service:', error);
        }
    }
    createNewOrganism() {
        const visualDNA = this.generateVisualDNA();
        return {
            id: crypto.randomUUID(),
            generation: 1,
            health: 100,
            energy: 100,
            traits: {
                curiosity: Math.random() * 100,
                focus: Math.random() * 100,
                rhythm: Math.random() * 100,
                empathy: Math.random() * 100,
                creativity: Math.random() * 100,
            },
            visualDNA,
            lastMutation: Date.now(),
            mutations: [],
            createdAt: Date.now(),
            dna: visualDNA
        };
    }
    generateVisualDNA() {
        // Generate a unique visual DNA string
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 64; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    setupMessageHandlers() {
        // Handle page visits
        this.messageBus.on(MessageBus_1.MessageType.PAGE_VISIT, async (message) => {
            const { url, title } = message.payload;
            // Update behavior data
            let behavior = await this.storage.getBehavior(url) || {
                url,
                visitCount: 0,
                totalTime: 0,
                scrollDepth: 0,
                lastVisit: Date.now(),
                interactions: [],
            };
            behavior.visitCount++;
            behavior.lastVisit = Date.now();
            await this.storage.saveBehavior(behavior);
            // Update organism based on behavior
            this.updateOrganismTraits(url, title);
        });
        // Handle scroll events
        this.messageBus.on(MessageBus_1.MessageType.SCROLL_EVENT, async (message) => {
            const { url, scrollDepth } = message.payload;
            const behavior = await this.storage.getBehavior(url);
            if (behavior) {
                behavior.scrollDepth = Math.max(behavior.scrollDepth, scrollDepth);
                await this.storage.saveBehavior(behavior);
            }
        });
    }
    async updateOrganismTraits(url, title) {
        if (!this.organism)
            return;
        // Simple trait evolution based on content type
        const urlLower = url.toLowerCase();
        const titleLower = title.toLowerCase();
        // Creativity boost from technical/creative sites
        if (urlLower.includes('github') || urlLower.includes('stackoverflow') ||
            urlLower.includes('codepen') || urlLower.includes('dribbble')) {
            this.organism.traits.creativity += 0.5;
        }
        // Focus boost from documentation/learning sites
        if (urlLower.includes('docs') || urlLower.includes('wiki') ||
            urlLower.includes('tutorial') || titleLower.includes('guide')) {
            this.organism.traits.focus += 0.3;
        }
        // Empathy boost from social/communication sites
        if (urlLower.includes('twitter') || urlLower.includes('linkedin') ||
            urlLower.includes('facebook') || urlLower.includes('reddit')) {
            this.organism.traits.empathy += 0.4;
        }
        // Curiosity boost from exploration
        const domain = new URL(url).hostname;
        const isNewDomain = !(await this.hasVisitedDomain(domain));
        if (isNewDomain) {
            this.organism.traits.curiosity += 1.0;
        }
        // Normalize traits (keep between 0-100)
        if (!this.organism)
            return;
        Object.keys(this.organism.traits).forEach(trait => {
            this.organism.traits[trait] =
                Math.max(0, Math.min(100, this.organism.traits[trait]));
        });
        // Check for mutations
        await this.checkForMutations();
        // Save updated organism
        await this.storage.saveOrganism(this.organism);
        // Broadcast update
        this.messageBus.send({
            type: MessageBus_1.MessageType.ORGANISM_UPDATE,
            payload: {
                state: this.organism,
                mutations: await this.storage.getRecentMutations(5),
            },
        });
    }
    async hasVisitedDomain(domain) {
        // Check if we've visited this domain before
        const tabs = await chrome.tabs.query({});
        return tabs.some(tab => tab.url && new URL(tab.url).hostname === domain);
    }
    async checkForMutations() {
        if (!this.organism)
            return;
        const now = Date.now();
        const timeSinceLastMutation = now - this.organism.lastMutation;
        // Mutation probability increases with time
        const mutationProbability = Math.min(0.5, timeSinceLastMutation / (1000 * 60 * 60)); // Max 50% after 1 hour
        if (Math.random() < mutationProbability) {
            const mutation = this.generateMutation();
            await this.storage.addMutation(mutation);
            this.organism.lastMutation = now;
            // Apply mutation effects
            this.applyMutation(mutation);
        }
    }
    generateMutation() {
        const types = ['visual', 'behavioral', 'cognitive'];
        const type = types[Math.floor(Math.random() * types.length)];
        return {
            type,
            trigger: this.getMutationTrigger(type),
            magnitude: Math.random() * 0.5 + 0.1, // 0.1 to 0.6
            timestamp: Date.now(),
        };
    }
    getMutationTrigger(type) {
        const triggers = {
            visual: ['color_shift', 'pattern_change', 'size_fluctuation', 'opacity_variation'],
            behavioral: ['navigation_speed', 'content_preference', 'interaction_pattern'],
            cognitive: ['memory_retention', 'pattern_recognition', 'association_strength'],
        };
        const typeTriggers = triggers[type];
        return typeTriggers[Math.floor(Math.random() * typeTriggers.length)];
    }
    applyMutation(mutation) {
        if (!this.organism)
            return;
        switch (mutation.type) {
            case 'visual':
                // Modify visual DNA
                this.organism.visualDNA = this.mutateVisualDNA(this.organism.visualDNA, mutation.magnitude);
                break;
            case 'behavioral':
                // Adjust traits based on mutation
                const traitKeys = Object.keys(this.organism.traits);
                const randomTrait = traitKeys[Math.floor(Math.random() * traitKeys.length)];
                this.organism.traits[randomTrait] += (Math.random() - 0.5) * mutation.magnitude * 20;
                break;
            case 'cognitive':
                // Affect multiple traits slightly
                if (!this.organism)
                    return;
                Object.keys(this.organism.traits).forEach(trait => {
                    this.organism.traits[trait] +=
                        (Math.random() - 0.5) * mutation.magnitude * 5;
                });
                break;
        }
    }
    mutateVisualDNA(dna, magnitude) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const numChanges = Math.floor(dna.length * magnitude);
        let newDNA = dna.split('');
        for (let i = 0; i < numChanges; i++) {
            const position = Math.floor(Math.random() * dna.length);
            newDNA[position] = chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return newDNA.join('');
    }
    startPeriodicTasks() {
        // Health decay - organism needs attention
        setInterval(() => {
            if (this.organism && this.organism.health > 0) {
                this.organism.health = Math.max(0, this.organism.health - 0.1);
                this.organism.energy = Math.max(0, this.organism.energy - 0.05);
            }
        }, 1000 * 60); // Every minute
        // Periodic sync
        setInterval(async () => {
            if (this.organism) {
                await this.storage.saveOrganism(this.organism);
                this.messageBus.send({
                    type: MessageBus_1.MessageType.ORGANISM_UPDATE,
                    payload: {
                        state: this.organism,
                        mutations: await this.storage.getRecentMutations(5),
                    },
                });
            }
        }, 1000 * 30); // Every 30 seconds
    }
}
exports.BackgroundService = BackgroundService;
// Initialize the background service
const backgroundService = new BackgroundService();
