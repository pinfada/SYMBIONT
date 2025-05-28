"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageBus = exports.MessageType = void 0;
// Centralisation des types de messages et de l'interface Message
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
    MessageType["GENERATE_INVITATION"] = "GENERATE_INVITATION";
    MessageType["INVITATION_GENERATED"] = "INVITATION_GENERATED";
    MessageType["CONSUME_INVITATION"] = "CONSUME_INVITATION";
    MessageType["INVITATION_CONSUMED"] = "INVITATION_CONSUMED";
    MessageType["CHECK_INVITATION"] = "CHECK_INVITATION";
    MessageType["INVITATION_CHECKED"] = "INVITATION_CHECKED";
    MessageType["MURMUR"] = "MURMUR";
    MessageType["GET_INVITER"] = "GET_INVITER";
    MessageType["INVITER_RESULT"] = "INVITER_RESULT";
    MessageType["GET_INVITEES"] = "GET_INVITEES";
    MessageType["INVITEES_RESULT"] = "INVITEES_RESULT";
    MessageType["GET_INVITATION_HISTORY"] = "GET_INVITATION_HISTORY";
    MessageType["INVITATION_HISTORY_RESULT"] = "INVITATION_HISTORY_RESULT";
    MessageType["INTERACTION_DETECTED"] = "INTERACTION_DETECTED";
    // --- Rituels collaboratifs ---
    MessageType["REQUEST_SHARED_MUTATION"] = "REQUEST_SHARED_MUTATION";
    MessageType["SHARED_MUTATION_CODE"] = "SHARED_MUTATION_CODE";
    MessageType["ACCEPT_SHARED_MUTATION"] = "ACCEPT_SHARED_MUTATION";
    MessageType["SHARED_MUTATION_RESULT"] = "SHARED_MUTATION_RESULT";
    MessageType["COLLECTIVE_WAKE_REQUEST"] = "COLLECTIVE_WAKE_REQUEST";
    MessageType["COLLECTIVE_WAKE_RESULT"] = "COLLECTIVE_WAKE_RESULT";
    MessageType["CONTEXTUAL_INVITATION"] = "CONTEXTUAL_INVITATION";
    MessageType["SECRET_RITUAL_TRIGGERED"] = "SECRET_RITUAL_TRIGGERED";
    MessageType["SECRET_CODE_ENTERED"] = "SECRET_CODE_ENTERED";
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
