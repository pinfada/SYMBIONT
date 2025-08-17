import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { DatabaseService } from './DatabaseService';
import { LoggerService } from './LoggerService';
import * as crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  username: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
}

export interface AuthResult {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken: string;
}

export class AuthService {
  private static instance: AuthService;
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private mockUsers: Map<string, User> = new Map();
  private db = DatabaseService.getInstance();
  private logger = LoggerService.getInstance();
  private activeSessions: Map<string, { userId: string, token: string, expiresAt: number }> = new Map();

  private constructor() {
    // SÉCURITÉ CRITIQUE : Variables d'environnement obligatoires
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    
    if (!jwtSecret || jwtSecret.length < 64) {
      throw new Error('JWT_SECRET manquant ou trop court (minimum 64 caractères cryptographiquement sécurisés)');
    }
    
    if (!refreshSecret || refreshSecret.length < 64) {
      throw new Error('JWT_REFRESH_SECRET manquant ou trop court (minimum 64 caractères cryptographiquement sécurisés)');
    }
    
    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = refreshSecret;
    
    this.initializeMockUsers();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  generateTokens(payload: JWTPayload): { token: string; refreshToken: string } {
    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: payload.userId }, this.jwtRefreshSecret, { expiresIn: '7d' });

    return { token, refreshToken };
  }

  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, this.jwtRefreshSecret) as { userId: string };
    } catch {
      return null;
    }
  }

  generateSessionToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  async register(email: string, password: string, username?: string): Promise<Omit<User, 'password'>> {
    try {
      // Check if user exists in database first, fallback to mock
      const existingUser = await this.db.findUserByEmail(email).catch(() => this.mockUsers.get(email));
      if (existingUser) {
        throw new Error('User already exists');
      }

      const hashedPassword = await this.hashPassword(password);
      
      const user: User = {
        id: crypto.randomBytes(8).toString('hex'),
        email,
        username: username || email.split('@')[0],
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Try to save to database, fallback to mock
      try {
        await this.db.createUser(user);
      } catch {
        this.mockUsers.set(email, user);
      }

      this.logger.info(`User registered: ${email}`);
      
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error('Registration failed:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Try database first, fallback to mock
      let user: User | undefined;
      try {
        user = await this.db.findUserByEmail(email);
      } catch {
        user = this.mockUsers.get(email);
      }
      
      if (!user || !(await this.verifyPassword(password, user.password))) {
        throw new Error('Invalid credentials');
      }

      const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        username: user.username
      };

      const tokens = this.generateTokens(payload);

      // Store session
      this.activeSessions.set(tokens.token, {
        userId: user.id,
        token: tokens.token,
        expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes
      });

      // Update last login
      try {
        await this.db.updateUserLastLogin(user.id);
      } catch {
        // Ignore if database update fails
      }

      this.logger.info(`User logged in: ${email}`);

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
    } catch (error) {
      this.logger.error('Login failed:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ token: string, refreshToken: string }> {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      if (!decoded) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      let user: User | undefined;
      try {
        user = await this.db.findUserById(decoded.userId);
      } catch {
        user = Array.from(this.mockUsers.values()).find(u => u.id === decoded.userId);
      }

      if (!user) {
        throw new Error('User not found');
      }

      const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        username: user.username
      };

      const tokens = this.generateTokens(payload);

      // Update session
      this.activeSessions.set(tokens.token, {
        userId: user.id,
        token: tokens.token,
        expiresAt: Date.now() + (15 * 60 * 1000)
      });

      return {
        token: tokens.token,
        refreshToken: tokens.refreshToken
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  async logout(token: string): Promise<void> {
    this.activeSessions.delete(token);
    this.logger.info('User logged out');
  }

  async validateToken(token: string): Promise<{ valid: boolean, userId?: string }> {
    try {
      const session = this.activeSessions.get(token);
      if (!session) {
        return { valid: false };
      }

      if (Date.now() > session.expiresAt) {
        this.activeSessions.delete(token);
        return { valid: false };
      }

      const decoded = this.verifyToken(token);
      if (!decoded) {
        return { valid: false };
      }
      
      return { valid: true, userId: decoded.userId };
    } catch (error) {
      return { valid: false };
    }
  }

  private async initializeMockUsers(): Promise<void> {
    // Add test user
    try {
      await this.register('test@symbiont.app', 'password123', 'testuser');
    } catch {
      // User might already exist
    }
  }

  // Session management
  async cleanExpiredSessions(): Promise<void> {
    const now = Date.now();
    for (const [token, session] of this.activeSessions.entries()) {
      if (now > session.expiresAt) {
        this.activeSessions.delete(token);
      }
    }
  }

  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  async cleanup(): Promise<void> {
    this.activeSessions.clear();
    this.logger.info('AuthService cleaned up');
  }
} 