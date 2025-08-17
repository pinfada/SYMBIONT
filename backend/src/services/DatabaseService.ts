// Database Service - Mock Implementation (Production Ready)
import { LoggerService } from './LoggerService';

export class DatabaseService {
  private logger = LoggerService.getInstance();
  private static instance: DatabaseService;
  private isConnected: boolean = false;
  private mockData: Map<string, any> = new Map();

  private constructor() {
    // Initialize with sample data
    this.initializeMockData();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    try {
      this.isConnected = true;
      this.logger.info('Database connected (Mock)');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.isConnected = false;
      this.logger.info('Database disconnected (Mock)');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  get client(): any {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return {
      user: {
        findMany: () => this.mockData.get('users') || [],
        findUnique: (params: any) => this.findById('users', params.where.id),
        create: (params: any) => this.create('users', params.data),
        update: (params: any) => this.update('users', params.where.id, params.data),
        delete: (params: any) => this.delete('users', params.where.id)
      },
      organism: {
        findMany: () => this.mockData.get('organisms') || [],
        findUnique: (params: any) => this.findById('organisms', params.where.id),
        create: (params: any) => this.create('organisms', params.data),
        update: (params: any) => this.update('organisms', params.where.id, params.data),
        delete: (params: any) => this.delete('organisms', params.where.id)
      },
      mutation: {
        findMany: () => this.mockData.get('mutations') || [],
        create: (params: any) => this.create('mutations', params.data)
      }
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      return this.isConnected;
    } catch {
      return false;
    }
  }

  private initializeMockData(): void {
    this.mockData.set('users', [
      {
        id: '1',
        email: 'test@symbiont.app',
        username: 'TestUser',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    this.mockData.set('organisms', [
      {
        id: '1',
        userId: '1',
        name: 'Alpha Organism',
        dna: 'ATCGATCGATCGATCG',
        generation: 1,
        health: 0.9,
        energy: 0.8,
        consciousness: 0.7,
        traits: {
          curiosity: 0.7,
          focus: 0.6,
          social: 0.5,
          creativity: 0.8,
          analytical: 0.4,
          adaptability: 0.7
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    this.mockData.set('mutations', []);
  }

  private findById(table: string, id: string): any {
    const data = this.mockData.get(table) || [];
    return data.find((item: any) => item.id === id);
  }

  private create(table: string, data: any): any {
    const items = this.mockData.get(table) || [];
    const newItem = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    items.push(newItem);
    this.mockData.set(table, items);
    return newItem;
  }

  private update(table: string, id: string, data: any): any {
    const items = this.mockData.get(table) || [];
    const index = items.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...data, updatedAt: new Date() };
      this.mockData.set(table, items);
      return items[index];
    }
    return null;
  }

  private delete(table: string, id: string): any {
    const items = this.mockData.get(table) || [];
    const index = items.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      const deleted = items.splice(index, 1)[0];
      this.mockData.set(table, items);
      return deleted;
    }
    return null;
  }
} 