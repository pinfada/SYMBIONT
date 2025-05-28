"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationService = void 0;
class InvitationService {
    constructor(storage) {
        this.storage = storage;
    }
    // Génère un code d'invitation unique et un motif/couleur symbolique
    async generateInvitation(donorId) {
        const code = (await Promise.resolve().then(() => __importStar(require('uuid')))).v4().slice(0, 8).toUpperCase();
        const symbolicLink = this.generateSymbolicLink();
        const invitation = {
            code,
            donorId,
            symbolicLink,
            used: false,
            createdAt: Date.now(),
        };
        await this.storage.addInvitation(invitation);
        return invitation;
    }
    // Valide et consomme un code d'invitation
    async consumeInvitation(code, receiverId) {
        const invitation = await this.storage.getInvitation(code);
        if (!invitation || invitation.used)
            return null;
        invitation.used = true;
        invitation.receiverId = receiverId;
        invitation.usedAt = Date.now();
        await this.storage.updateInvitation(invitation);
        return invitation;
    }
    // Vérifie la validité d'un code
    async isValid(code) {
        const invitation = await this.storage.getInvitation(code);
        return !!invitation && !invitation.used;
    }
    // Génère un motif/couleur symbolique (exemple simple)
    generateSymbolicLink() {
        const colors = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF8800', '#00FF88', '#8800FF'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    // Pour tests ou export
    async getAllInvitations() {
        return await this.storage.getAllInvitations();
    }
}
exports.InvitationService = InvitationService;
