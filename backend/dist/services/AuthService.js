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
exports.AuthService = void 0;
// Authentication Service - Mock Implementation
const crypto = __importStar(require("crypto"));
class AuthService {
    constructor() {
        this.mockUsers = new Map();
        this.jwtSecret = process.env.JWT_SECRET || 'symbiont-dev-secret-key-change-in-production';
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'symbiont-refresh-secret-key';
        this.initializeMockUsers();
    }
    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }
    async hashPassword(password) {
        // Simple hash for mock - replace with bcrypt in production
        return crypto.createHash('sha256').update(password + 'salt').digest('hex');
    }
    async verifyPassword(password, hashedPassword) {
        const hashed = await this.hashPassword(password);
        return hashed === hashedPassword;
    }
    generateTokens(payload) {
        // Mock JWT generation - replace with real JWT in production
        const tokenPayload = JSON.stringify(payload);
        const token = Buffer.from(tokenPayload).toString('base64');
        const refreshToken = crypto.randomBytes(32).toString('hex');
        return { token, refreshToken };
    }
    verifyToken(token) {
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            return JSON.parse(decoded);
        }
        catch {
            return null;
        }
    }
    verifyRefreshToken(token) {
        // Mock validation - store tokens in production database
        if (token && token.length === 64) {
            return { userId: 'mock-user-id' };
        }
        return null;
    }
    generateSessionToken() {
        return crypto.randomBytes(16).toString('hex');
    }
    extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
    async registerUser(email, username, password) {
        const hashedPassword = await this.hashPassword(password);
        const user = {
            id: crypto.randomBytes(8).toString('hex'),
            email,
            username,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.mockUsers.set(email, user);
        return user;
    }
    async authenticateUser(email, password) {
        const user = this.mockUsers.get(email);
        if (!user || !(await this.verifyPassword(password, user.password))) {
            return null;
        }
        const payload = {
            userId: user.id,
            email: user.email,
            username: user.username
        };
        const tokens = this.generateTokens(payload);
        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            token: tokens.token,
            refreshToken: tokens.refreshToken
        };
    }
    initializeMockUsers() {
        // Add test user
        this.registerUser('test@symbiont.app', 'testuser', 'password123');
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=AuthService.js.map