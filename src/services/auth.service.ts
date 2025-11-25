import axios from 'axios';
import { redisClient, redisModule } from '../config/redis';
import { config } from '../config/env';
import { AuthResponse } from '../types';

interface UserData {
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

class AuthService {
  private readonly TOKEN_PREFIX = 'auth:token:';
  private readonly TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days in seconds

  constructor() {
    // Initialize connection
    this.connect();
  }

  private async connect(): Promise<void> {
    await redisModule.connect();
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
      await redisClient.setEx(
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
      const token = await redisClient.get(this.getTokenKey(tgUserId));
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
      await redisClient.del(this.getTokenKey(tgUserId));
    } catch (error) {
      console.error('Error clearing token from Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
      await redisModule.disconnect();
  }
}

export const authService = new AuthService();