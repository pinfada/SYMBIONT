// Database Service — implémentation réelle basée sur Prisma/PostgreSQL
import { PrismaClient } from '@prisma/client';
import { LoggerService } from './LoggerService';

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvitationInput {
  code: string;
  inviterId?: string;
  expiresAt?: Date | string;
  metadata?: Record<string, unknown>;
}

export interface MetricEventInput {
  userId?: string;
  cpu?: number;
  memory?: number;
  latency?: number;
  userAgent?: string;
  platform?: string;
}

export class DatabaseService {
  private logger = LoggerService.getInstance();
  private static instance: DatabaseService;
  private prisma: PrismaClient;
  private isConnected = false;

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      this.isConnected = true;
      this.logger.info('Database connected (Prisma/PostgreSQL)');
    } catch (error) {
      this.logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      this.logger.info('Database disconnected');
    } catch (error) {
      this.logger.error('Database disconnection failed:', error);
      throw error;
    }
  }

  get client(): PrismaClient {
    return this.prisma;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  // === UTILISATEURS ===

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(user: {
    id?: string;
    email: string;
    username: string;
    password: string;
  }): Promise<UserRecord> {
    return this.prisma.user.create({
      data: {
        ...(user.id ? { id: user.id } : {}),
        email: user.email,
        username: user.username,
        password: user.password
      }
    });
  }

  async updateUserLastLogin(id: string): Promise<void> {
    // updatedAt est géré par @updatedAt ; on force un write pour tracer la connexion
    await this.prisma.user.update({
      where: { id },
      data: { updatedAt: new Date() }
    });
  }

  // === INVITATIONS ===

  async createInvitation(input: InvitationInput) {
    if (!input.code) {
      throw new Error('Invitation code is required');
    }
    return this.prisma.invitation.create({
      data: {
        code: input.code,
        ...(input.inviterId ? { inviterId: input.inviterId } : {}),
        expiresAt: input.expiresAt
          ? new Date(input.expiresAt)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours par défaut
        ...(input.metadata ? { metadata: input.metadata as object } : {})
      }
    });
  }

  async getInvitation(code: string) {
    return this.prisma.invitation.findUnique({ where: { code } });
  }

  async consumeInvitation(code: string, inviteeId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { code } });
    if (!invitation) {
      throw new Error('Invitation not found');
    }
    if (invitation.isConsumed) {
      throw new Error('Invitation already consumed');
    }
    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation expired');
    }
    return this.prisma.invitation.update({
      where: { code },
      data: { isConsumed: true, consumedAt: new Date(), inviteeId }
    });
  }

  // === ORGANISMES ===

  async getOrganismState(userId: string) {
    return this.prisma.organism.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        mutations: { orderBy: { timestamp: 'desc' }, take: 5 }
      }
    });
  }

  // === MÉTRIQUES & ÉVÉNEMENTS ===

  async logMetricEvent(event: MetricEventInput): Promise<void> {
    await this.prisma.systemMetrics.create({
      data: {
        ...(event.userId ? { userId: event.userId } : {}),
        cpu: event.cpu ?? 0,
        memory: event.memory ?? 0,
        latency: event.latency ?? 0,
        ...(event.userAgent ? { userAgent: event.userAgent } : {}),
        ...(event.platform ? { platform: event.platform } : {})
      }
    });
  }

  async getMetricsDashboard() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [aggregates, sampleCount, eventCount, userCount, organismCount] =
      await Promise.all([
        this.prisma.systemMetrics.aggregate({
          where: { timestamp: { gte: since } },
          _avg: { cpu: true, memory: true, latency: true }
        }),
        this.prisma.systemMetrics.count({ where: { timestamp: { gte: since } } }),
        this.prisma.networkEvents.count({ where: { timestamp: { gte: since } } }),
        this.prisma.user.count(),
        this.prisma.organism.count()
      ]);

    return {
      period: '24h',
      samples: sampleCount,
      averages: {
        cpu: aggregates._avg.cpu ?? 0,
        memory: aggregates._avg.memory ?? 0,
        latency: aggregates._avg.latency ?? 0
      },
      networkEvents: eventCount,
      totals: { users: userCount, organisms: organismCount }
    };
  }

  async saveNetworkEvent<T extends { type: string }>(event: T): Promise<void> {
    const { type, ...data } = event as { type: string } & Record<string, unknown>;
    await this.prisma.networkEvents.create({
      data: { type, data: JSON.parse(JSON.stringify(data)) }
    });
  }
}
