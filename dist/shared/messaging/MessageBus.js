"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageBus = exports.MessageType = void 0;
// Squelette minimal pour lever les erreurs d'import
var MessageType;
(function (MessageType) {
    MessageType["PAGE_VISIT"] = "PAGE_VISIT";
    MessageType["SCROLL_EVENT"] = "SCROLL_EVENT";
    MessageType["ORGANISM_UPDATE"] = "ORGANISM_UPDATE";
    MessageType["ORGANISM_MUTATE"] = "ORGANISM_MUTATE";
    MessageType["ORGANISM_STATE_CHANGE"] = "ORGANISM_STATE_CHANGE";
    MessageType["WEBGL_INIT"] = "WEBGL_INIT";
    MessageType["WEBGL_ERROR"] = "WEBGL_ERROR";
    MessageType["WEBGL_INITIALIZED"] = "WEBGL_INITIALIZED";
    MessageType["PERFORMANCE_UPDATE"] = "PERFORMANCE_UPDATE";
})(MessageType || (exports.MessageType = MessageType = {}));
class MessageBus {
    constructor(channel) { }
    on(type, handler) { }
    send(message) { }
    subscribe(type, handler) {
        this.on(type, handler);
    }
}
exports.MessageBus = MessageBus;
exports.default = MessageBus;
