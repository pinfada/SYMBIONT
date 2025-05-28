"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAccess = logAccess;
exports.resetAttempts = resetAttempts;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_PATH = path_1.default.join(__dirname, '../../security.log');
const attempts = {};
function logAccess(ip, route, status) {
    const line = `${new Date().toISOString()} | ${ip} | ${route} | ${status}\n`;
    fs_1.default.appendFileSync(LOG_PATH, line);
    if (status === 403) {
        attempts[ip] = (attempts[ip] || 0) + 1;
        if (attempts[ip] > 5) {
            // Alerte brute force
            fs_1.default.appendFileSync(LOG_PATH, `ALERT: Brute force suspectée depuis ${ip}\n`);
        }
    }
}
function resetAttempts(ip) {
    attempts[ip] = 0;
}
