import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Services
import { DatabaseService } from './services/DatabaseService';
import { AuthService } from './services/AuthService';
import { LoggerService } from './services/LoggerService';
import { CacheService } from './services/CacheService';
import { WebSocketService } from './services/WebSocketService';
import { organismRoutes } from './routes/organisms';
import { authMiddleware } from './middleware/auth';

class SymbiontServer {
  private app: Express;
  private server: any;
  private io: SocketIOServer;
  private logger = LoggerService.getInstance();
  private db = DatabaseService.getInstance();
  private cache = CacheService.getInstance();
  private auth = AuthService.getInstance();
  private wsService: WebSocketService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? "chrome-extension://*" : "https://app.symbiont.com"),
        methods: ["GET", "POST"]
      }
    });
    this.wsService = new WebSocketService(this.io);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false // Allow extension scripts
    }));
    
    // CORS for extension
    this.app.use(cors({
      origin: function(origin, callback) {
        // Allow Chrome extension origins
        if (!origin || origin.startsWith('chrome-extension://')) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true
    }));
    
    // Compression
    this.app.use(compression());
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP'
    });
    this.app.use(limiter);
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: process.env.VERSION || (() => {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('VERSION environment variable is required in production');
          }
          return '1.0.0-dev';
        })()
      });
    });
    
    // API routes
    this.app.use('/api/auth', this.createAuthRoutes());
    this.app.use('/api/organisms', authMiddleware, organismRoutes);
    this.app.use('/api/social', authMiddleware, this.createSocialRoutes());
    this.app.use('/api/metrics', authMiddleware, this.createMetricsRoutes());
  }
  
  private createAuthRoutes(): any {
    const router = express.Router();
    
    router.post('/register', async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;
        const user = await this.auth.register(email, password);
        res.json({ success: true, user });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });
    
    router.post('/login', async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;
        const result = await this.auth.login(email, password);
        res.json(result);
      } catch (error: any) {
        res.status(401).json({ error: error.message });
      }
    });
    
    router.post('/refresh', async (req: Request, res: Response) => {
      try {
        const { refreshToken } = req.body;
        const result = await this.auth.refreshToken(refreshToken);
        res.json(result);
      } catch (error: any) {
        res.status(401).json({ error: error.message });
      }
    });
    
    return router;
  }
  
  private createSocialRoutes(): any {
    const router = express.Router();
    
    router.post('/invitations', async (req: Request, res: Response) => {
      try {
        const invitation = await this.db.createInvitation(req.body);
        res.json(invitation);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    router.get('/invitations/:code', async (req: Request, res: Response) => {
      try {
        const invitation = await this.db.getInvitation(req.params.code);
        res.json(invitation);
      } catch (error: any) {
        res.status(404).json({ error: error.message });
      }
    });
    
    return router;
  }
  
  private createMetricsRoutes(): any {
    const router = express.Router();
    
    router.post('/events', async (req: Request, res: Response) => {
      try {
        await this.db.logMetricEvent(req.body);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    router.get('/dashboard', async (req: Request, res: Response) => {
      try {
        const metrics = await this.db.getMetricsDashboard();
        res.json(metrics);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
    
    return router;
  }
  
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
    
    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Server error:', err);
      res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : err.message 
      });
    });
  }

  public async start(): Promise<void> {
    const port = parseInt(process.env.PORT || (process.env.NODE_ENV === 'production' ? '3001' : '3000'));
    
    try {
      // Initialize database connection
      await this.db.connect();
      
      // Initialize cache
      await this.cache.connect();
      
      // Start server
      this.server.listen(port, () => {
        this.logger.info(`🚀 SYMBIONT Backend running on port ${port}`);
        this.logger.info(`📊 Health check: http://localhost:${port}/health`);
      });
      
      // Initialize WebSocket handlers
      this.wsService.initialize();
      
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  
  public async stop(): Promise<void> {
    this.logger.info('Shutting down server...');
    
    // Close WebSocket connections
    this.io.close();
    
    // Close database connections
    await this.db.disconnect();
    await this.cache.disconnect();
    
    // Close HTTP server
    this.server.close(() => {
      this.logger.info('Server stopped');
      process.exit(0);
    });
  }
}

// Create and start server
const server = new SymbiontServer();

// Handle graceful shutdown
process.on('SIGTERM', () => server.stop());
process.on('SIGINT', () => server.stop());

// Start server
if (require.main === module) {
  server.start().catch(console.error);
}

export default server;