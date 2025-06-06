// Authentication Service - Mock Implementation
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

  private constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'symbiont-dev-secret-key-change-in-production';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'symbiont-refresh-secret-key';
    
    this.initializeMockUsers();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async hashPassword(password: string): Promise<string> {
    // Simple hash for mock - replace with bcrypt in production
    return crypto.createHash('sha256').update(password + 'salt').digest('hex');
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const hashed = await this.hashPassword(password);
    return hashed === hashedPassword;
  }

  generateTokens(payload: JWTPayload): { token: string; refreshToken: string } {
    // Mock JWT generation - replace with real JWT in production
    const tokenPayload = JSON.stringify(payload);
    const token = Buffer.from(tokenPayload).toString('base64');
    const refreshToken = crypto.randomBytes(32).toString('hex');

    return { token, refreshToken };
  }

  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      return JSON.parse(decoded) as JWTPayload;
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): { userId: string } | null {
    // Mock validation - store tokens in production database
    if (token && token.length === 64) {
      return { userId: 'mock-user-id' };
    }
    return null;
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

  async registerUser(email: string, username: string, password: string): Promise<User> {
    const hashedPassword = await this.hashPassword(password);
    
    const user: User = {
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

  async authenticateUser(email: string, password: string): Promise<AuthResult | null> {
    const user = this.mockUsers.get(email);
    
    if (!user || !(await this.verifyPassword(password, user.password))) {
      return null;
    }

    const payload: JWTPayload = {
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

  private initializeMockUsers(): void {
    // Add test user
    this.registerUser('test@symbiont.app', 'testuser', 'password123');
  }
} 