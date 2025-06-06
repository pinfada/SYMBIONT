// SYMBIONT Backend Server - Simplified Implementation
import * as http from 'http';
import * as url from 'url';
import * as querystring from 'querystring';

// Mock Express-like implementation
interface Request {
  method: string;
  url: string;
  headers: any;
  body?: any;
  params?: any;
  query?: any;
  user?: any;
}

interface Response {
  statusCode: number;
  status: (code: number) => Response;
  json: (data: any) => void;
  send: (data: any) => void;
  setHeader: (name: string, value: string) => void;
  end: (data?: string) => void;
}

// Services
import { DatabaseService } from './services/DatabaseService';
import { AuthService } from './services/AuthService';
import { LoggerService } from './services/LoggerService';
import { CacheService } from './services/CacheService';

class SymbiontServer {
  private server: http.Server;
  private routes: Map<string, Function> = new Map();
  private logger = LoggerService.getInstance();
  private db = DatabaseService.getInstance();
  private cache = CacheService.getInstance();
  private auth = AuthService.getInstance();

  constructor() {
    this.server = http.createServer(this.handleRequest.bind(this));
    this.setupRoutes();
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
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
      const requestObj: Request = await this.parseRequest(req);
      const responseObj: Response = this.createResponse(res);

      const routeKey = `${req.method} ${this.getRoutePath(req.url || '')}`;
      const handler = this.routes.get(routeKey);

      if (handler) {
        await handler(requestObj, responseObj);
      } else {
        responseObj.status(404).json({ error: 'Route not found' });
      }
    } catch (error) {
      this.logger.error('Request error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  private async parseRequest(req: http.IncomingMessage): Promise<Request> {
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

  private parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
    });
  }

  private createResponse(res: http.ServerResponse): Response {
    return {
      statusCode: 200,
      status: (code: number) => {
        res.statusCode = code;
        return this.createResponse(res);
      },
      json: (data: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      },
      send: (data: any) => {
        res.end(typeof data === 'string' ? data : JSON.stringify(data));
      },
      setHeader: (name: string, value: string) => {
        res.setHeader(name, value);
      },
      end: (data?: string) => {
        res.end(data);
      }
    };
  }

  private getRoutePath(url: string): string {
    const parsed = new URL(url, 'http://localhost');
    return parsed.pathname;
  }

  private setupRoutes(): void {
    // Debug route to list all routes
    this.routes.set('GET /debug/routes', (req: Request, res: Response) => {
      const routesList = Array.from(this.routes.keys());
      res.json({
        routes: routesList,
        total: routesList.length
      });
    });

    // Health check
    this.routes.set('GET /health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Auth routes
    this.routes.set('POST /api/auth/login', async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({ error: 'Email et mot de passe requis' });
        }

        const result = await this.auth.authenticateUser(email, password);
        if (result) {
          res.json({ success: true, data: result });
        } else {
          res.status(401).json({ error: 'Identifiants invalides' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    this.routes.set('POST /api/auth/register', async (req: Request, res: Response) => {
      try {
        const { email, username, password } = req.body;
        
        if (!email || !username || !password) {
          return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        const user = await this.auth.registerUser(email, username, password);
        res.status(201).json({ success: true, data: user });
      } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // Organisms routes (with auth middleware)
    this.routes.set('GET /api/organisms', async (req: Request, res: Response) => {
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
      } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    this.routes.set('POST /api/organisms', async (req: Request, res: Response) => {
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
      } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // Analytics routes
    this.routes.set('GET /api/analytics/behavior', async (req: Request, res: Response) => {
      try {
        const analytics = {
          dominantCategories: ['work', 'social', 'entertainment'],
          timeDistribution: { work: 3600, social: 1800, entertainment: 900 },
          patterns: ['deep_work_sessions', 'high_social_engagement'],
          anomalies: []
        };
        res.json({ success: true, data: analytics });
      } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    this.routes.set('POST /api/analytics/generate-dna', async (req: Request, res: Response) => {
      try {
        const dna = this.generateDNA();
        res.json({ success: true, data: { dna } });
      } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
      }
    });

    // System monitoring routes
    this.routes.set('GET /api/system/health', (req: Request, res: Response) => {
      res.json({
        api: 'healthy',
        database: 'healthy',
        cache: 'healthy',
        websocket: 'connected'
      });
    });

    this.routes.set('GET /api/system/metrics', (req: Request, res: Response) => {
      res.json({
        activeUsers: Math.floor(Math.random() * 100) + 10,
        totalOrganisms: Math.floor(Math.random() * 1000) + 100,
        mutationsPerHour: Math.floor(Math.random() * 50) + 5,
        apiLatency: Math.floor(Math.random() * 50) + 20,
        uptime: '24h 30m',
        version: '1.0.0'
      });
    });

    this.routes.set('GET /api/system/network-stats', (req: Request, res: Response) => {
      res.json({
        totalConnections: Math.floor(Math.random() * 200) + 50,
        activeRituals: Math.floor(Math.random() * 5),
        dataProcessed: `${Math.floor(Math.random() * 100) + 10} MB`,
        evolutionEvents: Math.floor(Math.random() * 20) + 5
      });
    });
  }

  private generateDNA(): string {
    const bases = ['A', 'T', 'G', 'C'];
    let dna = '';
    for (let i = 0; i < 64; i++) {
      dna += bases[Math.floor(Math.random() * 4)];
    }
    return dna;
  }

  private getDefaultTraits(): any {
    return {
      curiosity: 0.5,
      focus: 0.5,
      social: 0.5,
      creativity: 0.5,
      analytical: 0.5,
      adaptability: 0.5
    };
  }

  public async start(): Promise<void> {
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
      
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
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

export default server; 