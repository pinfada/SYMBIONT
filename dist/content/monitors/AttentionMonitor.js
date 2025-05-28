"use strict";
// Monitoring attention utilisateur
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttentionMonitor = void 0;
class AttentionMonitor {
    on(event, handler) { }
    resume() { }
    pause() { }
    stop() { }
    getSessionSummary() { return { focusPeriods: [] }; }
}
exports.AttentionMonitor = AttentionMonitor;
