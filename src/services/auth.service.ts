import axios from 'axios';
import { config } from '../config/env';
import { AuthResponse } from '../types';

interface UserData {
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

class AuthService {
  private tokens = new Map<number, string>();

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
      this.tokens.set(tgUserId, token);
      
      return token;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Failed to authenticate user');
    }
  }

  getToken(tgUserId: number): string | undefined {
    return this.tokens.get(tgUserId);
  }

  async ensureToken(tgUserId: number, userData: UserData): Promise<string> {
    const existingToken = this.getToken(tgUserId);
    if (existingToken) {
      return existingToken;
    }
    
    return this.authenticate(tgUserId, userData);
  }

  clearToken(tgUserId: number): void {
    this.tokens.delete(tgUserId);
  }
}

export const authService = new AuthService();
