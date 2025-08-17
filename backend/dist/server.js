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
// SYMBIONT Backend Server - Simplified Implementation
const http = __importStar(require("http"));
const url = __importStar(require("url"));
// Services
const DatabaseService_1 = require("./services/DatabaseService");
const AuthService_1 = require("./services/AuthService");
const LoggerService_1 = require("./services/LoggerService");
const CacheService_1 = require("./services/CacheService");
class SymbiontServer {
    constructor() {
        this.routes = new Map();
        this.logger = LoggerService_1.LoggerService.getInstance();
        this.db = DatabaseService_1.DatabaseService.getInstance();
        this.cache = CacheService_1.CacheService.getInstance();
        this.auth = AuthService_1.AuthService.getInstance();
        this.server = http.createServer(this.handleRequest.bind(this));
        this.setupRoutes();
    }
    async handleRequest(req, res) {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
        }
        try {
            const requestObj = await this.parseRequest(req);
            const responseObj = this.createResponse(res);
            const routeKey = `${req.method} ${this.getRoutePath(req.url || '')}`;
            const handler = this.routes.get(routeKey);
            if (handler) {
                await handler(requestObj, responseObj);
            }
            else {
                responseObj.status(404).json({ error: 'Route not found' });
            }
        }
        catch (error) {
            this.logger.error('Request error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }
    async parseRequest(req) {
        const parsedUrl = url.parse(req.url || '', true);
        // Parse body for POST/PUT
        let body;
        if (req.method === 'POST' || req.method === 'PUT') {
            body = await this.parseBody(req);
        }
        return {
            method: req.method || 'GET',
            url: req.url || '',
            headers: req.headers,
            body,
            query: parsedUrl.query,
            params: {}
        };
    }
    parseBody(req) {
        return new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => {
                data += chunk;
            });
            req.on('end', () => {
                try {
                    resolve(data ? JSON.parse(data) : {});
                }
                catch {
                    resolve({});
                }
            });
        });
    }
    createResponse(res) {
        return {
            statusCode: 200,
            status: (code) => {
                res.statusCode = code;
                return this.createResponse(res);
            },
            json: (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
            },
            send: (data) => {
                res.end(typeof data === 'string' ? data : JSON.stringify(data));
            },
            setHeader: (name, value) => {
                res.setHeader(name, value);
            },
            end: (data) => {
                res.end(data);
            }
        };
    }
    getRoutePath(url) {
        const parsed = new URL(url, 'http://localhost');
        return parsed.pathname;
    }
    setupRoutes() {
        // Debug route to list all routes
        this.routes.set('GET /debug/routes', (req, res) => {
            const routesList = Array.from(this.routes.keys());
            res.json({
                routes: routesList,
                total: routesList.length
            });
        });
        // Health check
        this.routes.set('GET /health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });
        // Auth routes
        this.routes.set('POST /api/auth/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                if (!email || !password) {
                    return res.status(400).json({ error: 'Email et mot de passe requis' });
                }
                const result = await this.auth.authenticateUser(email, password);
                if (result) {
                    res.json({ success: true, data: result });
                }
                else {
                    res.status(401).json({ error: 'Identifiants invalides' });
                }
            }
            catch (error) {
                res.status(500).json({ error: 'Erreur serveur' });
            }
        });
        this.routes.set('POST /api/auth/register', async (req, res) => {
            try {
                const { email, username, password } = req.body;
                if (!email || !username || !password) {
                    return res.status(400).json({ error: 'Tous les champs sont requis' });
                }
                const user = await this.auth.registerUser(email, username, password);
                res.status(201).json({ success: true, data: user });
            }
            catch (error) {
                res.status(500).json({ error: 'Erreur serveur' });
            }
        });
        // Organisms routes (with auth middleware)
        this.routes.set('GET /api/organisms', async (req, res) => {
            try {
                // Simple auth check
                const authHeader = req.headers.authorization;
                if (!authHeader) {
                    return res.status(401).json({ error: 'Token manquant' });
                }
                const token = authHeader.replace('Bearer ', '');
                const user = this.auth.verifyToken(token);
                if (!user) {
                    return res.status(401).json({ error: 'Token invalide' });
                }
                const organisms = this.db.client.organism.findMany();
                res.json({ success: true, data: organisms });
            }
            catch (error) {
                res.status(500).json({ error: 'Erreur serveur' });
            }
        });
        this.routes.set('POST /api/organisms', async (req, res) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader) {
                    return res.status(401).json({ error: 'Token manquant' });
                }
                const token = authHeader.replace('Bearer ', '');
                const user = this.auth.verifyToken(token);
                if (!user) {
                    return res.status(401).json({ error: 'Token invalide' });
                }
                const { name, initialTraits } = req.body;
                if (!name) {
                    return res.status(400).json({ error: 'Nom requis' });
                }
                const organism = this.db.client.organism.create({
                    data: {
                        userId: user.userId,
                        name,
                        dna: this.generateDNA(),
                        generation: 1,
                        health: 1.0,
                        energy: 0.8,
                        consciousness: 0.5,
                        traits: initialTraits || this.getDefaultTraits()
                    }
                });
                res.status(201).json({ success: true, data: organism });
            }
            catch (error) {
                res.status(500).json({ error: 'Erreur serveur' });
            }
        });
        // Analytics routes
        this.routes.set('GET /api/analytics/behavior', async (req, res) => {
            try {
                const analytics = {
                    dominantCategories: ['work', 'social', 'entertainment'],
                    timeDistribution: { work: 3600, social: 1800, entertainment: 900 },
                    patterns: ['deep_work_sessions', 'high_social_engagement'],
                    anomalies: []
                };
                res.json({ success: true, data: analytics });
            }
            catch (error) {
                res.status(500).json({ error: 'Erreur serveur' });
            }
        });
        this.routes.set('POST /api/analytics/generate-dna', async (req, res) => {
            try {
                const dna = this.generateDNA();
                res.json({ success: true, data: { dna } });
            }
            catch (error) {
                res.status(500).json({ error: 'Erreur serveur' });
            }
        });
        // System monitoring routes
        this.routes.set('GET /api/system/health', (req, res) => {
            res.json({
                api: 'healthy',
                database: 'healthy',
                cache: 'healthy',
                websocket: 'connected'
            });
        });
        this.routes.set('GET /api/system/metrics', (req, res) => {
            res.json({
                activeUsers: Math.floor(Math.random() * 100) + 10,
                totalOrganisms: Math.floor(Math.random() * 1000) + 100,
                mutationsPerHour: Math.floor(Math.random() * 50) + 5,
                apiLatency: Math.floor(Math.random() * 50) + 20,
                uptime: '24h 30m',
                version: '1.0.0'
            });
        });
        this.routes.set('GET /api/system/network-stats', (req, res) => {
            res.json({
                totalConnections: Math.floor(Math.random() * 200) + 50,
                activeRituals: Math.floor(Math.random() * 5),
                dataProcessed: `${Math.floor(Math.random() * 100) + 10} MB`,
                evolutionEvents: Math.floor(Math.random() * 20) + 5
            });
        });
    }
    generateDNA() {
        const bases = ['A', 'T', 'G', 'C'];
        let dna = '';
        for (let i = 0; i < 64; i++) {
            dna += bases[Math.floor(Math.random() * 4)];
        }
        return dna;
    }
    getDefaultTraits() {
        return {
            curiosity: 0.5,
            focus: 0.5,
            social: 0.5,
            creativity: 0.5,
            analytical: 0.5,
            adaptability: 0.5
        };
    }
    async start() {
        const port = process.env.PORT || 3001;
        try {
            // Initialize services
            await this.db.connect();
            await this.cache.connect();
            // Start server
            this.server.listen(port, () => {
                this.logger.info(`🚀 SYMBIONT Server running on port ${port}`);
                this.logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
                this.logger.info(`🗄️  Database: Connected (Mock)`);
                this.logger.info(`⚡ Cache: Connected (Mock)`);
                this.logger.info(`🔒 Security: Basic Auth`);
            });
        }
        catch (error) {
            this.logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    async stop() {
        this.server.close();
        await this.db.disconnect();
        await this.cache.disconnect();
    }
}
// Start server
const server = new SymbiontServer();
server.start().catch((error) => {
    console.error('Failed to start SYMBIONT server:', error);
    process.exit(1);
});
exports.default = server;
//# sourceMappingURL=server.js.map