// Cache Service — implémentation Redis réelle (ioredis).
// Sans REDIS_URL, le cache est explicitement désactivé (aucune simulation).
import Redis from 'ioredis';
import { LoggerService } from './LoggerService';

export class CacheService {
  private static instance: CacheService;
  private logger = LoggerService.getInstance();
  private redis: Redis | null = null;

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async connect(): Promise<void> {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn('REDIS_URL non défini — cache désactivé');
      return;
    }

    this.redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false
    });

    try {
      await this.redis.connect();
      this.logger.info('Cache Redis connecté');
    } catch (error) {
      this.logger.error('Connexion Redis impossible — cache désactivé:', error);
      this.redis.disconnect();
      this.redis = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => this.redis?.disconnect());
      this.redis = null;
    }
  }

  isEnabled(): boolean {
    return this.redis !== null;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch (error) {
      this.logger.warn(`Cache get failed for ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.redis) return;
    try {
      const raw = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.redis.setex(key, ttlSeconds, raw);
      } else {
        await this.redis.set(key, raw);
      }
    } catch (error) {
      this.logger.warn(`Cache set failed for ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Cache del failed for ${key}:`, error);
    }
  }
}
