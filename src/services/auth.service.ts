import axios from 'axios';
import { createClient, RedisClientType } from 'redis';
import { config } from '../config/env';
import { AuthResponse } from '../types';

interface UserData {
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

class AuthService {
  private redisClient: RedisClientType;
  private readonly TOKEN_PREFIX = 'auth:token:';
  private readonly TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days in seconds

  constructor() {
    this.redisClient = createClient({
      url: config.redisUrl || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {  
          if (retries > 10) {
            return new Error('Redis connection failed after 10 retries');
          }
          return retries * 100; // Exponential backoff
        },
      },
    });


    this.redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });

    // Initialize connection
    this.connect();
  }

  private async connect(): Promise<void> {
    if (!this.redisClient.isOpen) {
      try {
        await this.redisClient.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  private getTokenKey(tgUserId: number): string {
    return `${this.TOKEN_PREFIX}${tgUserId}`;
  }

  async authenticate(tgUserId: number, userData: UserData): Promise<string> {
    try {
      const response = await axios.post<AuthResponse>(
        `${config.apiBaseUrl}/auth/telegram`,
        {
          tg_user_id: tgUserId,
          ...userData,
        }
      );

      const token = response.data.token;
      
      // Store token in Redis with TTL
      await this.redisClient.setEx(
        this.getTokenKey(tgUserId),
        this.TOKEN_TTL,
        token
      );

      return token;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Failed to authenticate user');
    }
  }

  async getToken(tgUserId: number): Promise<string | null> {
    try {
      await this.connect();
      const token = await this.redisClient.get(this.getTokenKey(tgUserId));
      return token;
    } catch (error) {
      console.error('Error retrieving token from Redis:', error);
      return null;
    }
  }

  async ensureToken(tgUserId: number, userData: UserData): Promise<string> {
    const existingToken = await this.getToken(tgUserId);
    if (existingToken) {
      return existingToken;
    }

    return this.authenticate(tgUserId, userData);
  }

  async clearToken(tgUserId: number): Promise<void> {
    try {
      await this.connect();
      await this.redisClient.del(this.getTokenKey(tgUserId));
    } catch (error) {
      console.error('Error clearing token from Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redisClient.isOpen) {
      await this.redisClient.quit();
    }
  }
}

export const authService = new AuthService();