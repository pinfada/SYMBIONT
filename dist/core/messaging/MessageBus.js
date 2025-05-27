"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageBus = void 0;
class MessageBus {
    constructor(source) {
        this.source = source;
        this.handlers = new Map();
        this.globalHandlers = new Set();
        this.filters = [];
        this.messageQueue = [];
        this.processing = false;
        this.setupListeners();
    }
    setupListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (this.shouldProcessMessage(message)) {
                this.enqueueMessage(message);
                sendResponse({ received: true });
            }
            return false;
        });
    }
    shouldProcessMessage(message) {
        return this.filters.every(filter => filter(message));
    }
    async enqueueMessage(message) {
        this.messageQueue.push(message);
        if (!this.processing) {
            this.processing = true;
            await this.processQueue();
            this.processing = false;
        }
    }
    async processQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            await this.processMessage(message);
        }
    }
    async processMessage(message) {
        // Global handlers
        for (const handler of this.globalHandlers) {
            try {
                await handler(message);
            }
            catch (error) {
                console.error(`Error in global handler:`, error);
            }
        }
        // Type-specific handlers
        const handlers = this.handlers.get(message.type);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    await handler(message);
                }
                catch (error) {
                    console.error(`Error in handler for ${message.type}:`, error);
                }
            }
        }
    }
    on(type, handler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type).add(handler);
    }
    off(type, handler) {
        const handlers = this.handlers.get(type);
        if (handlers) {
            handlers.delete(handler);
        }
    }
    onAny(handler) {
        this.globalHandlers.add(handler);
    }
    offAny(handler) {
        this.globalHandlers.delete(handler);
    }
    addFilter(filter) {
        this.filters.push(filter);
    }
    async send(message) {
        const fullMessage = {
            ...message,
            source: this.source,
            timestamp: Date.now(),
            id: crypto.randomUUID(),
        };
        try {
            if (this.source === 'content') {
                await chrome.runtime.sendMessage(fullMessage);
            }
            else {
                // Send to all tabs for content scripts
                const tabs = await chrome.tabs.query({});
                for (const tab of tabs) {
                    if (tab.id) {
                        chrome.tabs.sendMessage(tab.id, fullMessage).catch(() => {
                            // Ignore errors for inactive tabs
                        });
                    }
                }
                // Also send to runtime for popup/background
                chrome.runtime.sendMessage(fullMessage).catch(() => { });
            }
        }
        catch (error) {
            console.error('Error sending message:', error);
        }
    }
}
exports.MessageBus = MessageBus;
exports.default = MessageBus;
