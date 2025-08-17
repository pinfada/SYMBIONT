"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
// Logger Service - Production Ready
class LoggerService {
    constructor() { }
    static getInstance() {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }
    info(message, meta) {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
    }
    error(message, error) {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
    }
    warn(message, meta) {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
    }
    debug(message, meta) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
        }
    }
}
exports.LoggerService = LoggerService;
//# sourceMappingURL=LoggerService.js.map