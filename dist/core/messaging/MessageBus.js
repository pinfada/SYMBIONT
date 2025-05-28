"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageBus = void 0;
const MessageBus_1 = require("../../shared/messaging/MessageBus");
function isOrganismState(obj) {
    return obj && typeof obj.id === 'string' && typeof obj.generation === 'number';
}
function isOrganismMutation(obj) {
    return obj && typeof obj.type === 'string' && typeof obj.trigger === 'string';
}
function isBehaviorData(obj) {
    return obj && typeof obj.url === 'string' && typeof obj.visitCount === 'number';
}
function isMurmur(obj) {
    return obj && typeof obj.text === 'string' && typeof obj.timestamp === 'number';
}
function isInvitationPayload(obj) {
    return obj && typeof obj.code === 'string';
}
function isInvitationResult(obj) {
    return obj && typeof obj.code === 'string' && typeof obj.status === 'string';
}
function validatePayload(type, payload) {
    switch (type) {
        case MessageBus_1.MessageType.ORGANISM_UPDATE:
            return isOrganismState(payload);
        case MessageBus_1.MessageType.ORGANISM_MUTATE:
            return isOrganismMutation(payload);
        case MessageBus_1.MessageType.PAGE_VISIT:
        case MessageBus_1.MessageType.SCROLL_EVENT:
            return isBehaviorData(payload);
        case MessageBus_1.MessageType.MURMUR:
            return isMurmur(payload);
        case MessageBus_1.MessageType.GENERATE_INVITATION:
        case MessageBus_1.MessageType.CONSUME_INVITATION:
        case MessageBus_1.MessageType.CHECK_INVITATION:
            return isInvitationPayload(payload);
        case MessageBus_1.MessageType.INVITATION_GENERATED:
        case MessageBus_1.MessageType.INVITATION_CONSUMED:
        case MessageBus_1.MessageType.INVITATION_CHECKED:
            return isInvitationResult(payload);
        // Ajouter d'autres cas selon les besoins
        default:
            return true; // Par défaut, on accepte (à affiner selon les besoins)
    }
}
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
        // --- Validation stricte du payload ---
        if (!validatePayload(message.type, message.payload)) {
            console.warn(`[MessageBus] Payload non valide pour le type ${message.type}`, message.payload);
            return;
        }
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
    // Ajout pour compatibilité content script
    sendToBackground(message) {
        this.send(message);
    }
    emit(type, payload) {
        // Appel direct des handlers si besoin (mock minimal)
        const handlers = this.handlers.get(type);
        if (handlers) {
            handlers.forEach(handler => handler({ type, payload }));
        }
    }
}
exports.MessageBus = MessageBus;
exports.default = MessageBus;
