import { createClient, RedisClientType } from 'redis';
import { config } from './env';

class RedisModule {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: config.redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 20) {
            console.error('Redis connection failed after 20 retries');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 100, 3000); // Exponential backoff capped at 3s
        },
      },
    });

    this.client.on('error', (err: Error) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
        console.log('Redis Client Ready');
    });

    this.client.on('end', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
    });
  }

  public async connect(): Promise<void> {
    if (!this.isConnected && !this.client.isOpen) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }
}

export const redisModule = new RedisModule();
export const redisClient = redisModule.getClient();
