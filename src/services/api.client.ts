import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { config } from "../config/env";
import { authService } from "./auth.service";
import {
  User,
  Account,
  Transaction,
  Category,
  ParsedTransaction,
  TransactionStats,
} from "../types";

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 60000,
    });
  }

  private async request<T>(
    ctx: any,
    requestConfig: AxiosRequestConfig,
    isRetry: boolean = false
  ): Promise<T> {
    const tgUserId = ctx.from.id;

    // Ensure we have a token (get from Redis or authenticate with backend)
    const token = await authService.ensureToken(tgUserId, {
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
      username: ctx.from.username,
      language_code: ctx.from.language_code,
    });

    if (!token) {
        throw new Error("User not authenticated");
    }

    try {
      const response = await this.client.request<T>({
        ...requestConfig,
        headers: {
          ...requestConfig.headers,
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      // Handle token expiration (401 or 403)
      if ((error.response?.status === 401 || error.response?.status === 403) && !isRetry) {
        try {
          // Clear expired token
          await authService.clearToken(tgUserId);

          // Regenerate token with user data from context
          const userData = {
            first_name: ctx.from.first_name,
            last_name: ctx.from.last_name,
            username: ctx.from.username,
            language_code: ctx.from.language_code,
          };

          await authService.authenticate(tgUserId, userData);

          // Retry the request with new token (pass isRetry to prevent infinite loop)
          return this.request<T>(ctx, requestConfig, true);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          throw new Error("Сессия истекла. Попробуйте снова.");
        }
      }

      throw error;
    }
  }

  // User endpoints
  async getMe(ctx: any): Promise<User> {
    return this.request<User>(ctx, {
      method: "GET",
      url: "/users/me",
    });
  }

  async updateMe(
    ctx: any,
    data: { currency_code?: string; language_code?: string }
  ): Promise<User> {
    return this.request<User>(ctx, {
      method: "PATCH",
      url: "/users/me",
      data,
    });
  }

  // Account endpoints
  async getAccounts(ctx: any): Promise<Account[]> {
    return this.request<Account[]>(ctx, {
      method: "GET",
      url: "/accounts",
    });
  }

  async createAccount(
    ctx: any,
    data: {
      name: string;
      balance?: number;
      is_default?: boolean;
    }
  ): Promise<Account> {
    return this.request<Account>(ctx, {
      method: "POST",
      url: "/accounts",
      data,
    });
  }

  async updateAccount(
    ctx: any,
    accountId: string,
    data: { name?: string; is_default?: boolean }
  ): Promise<Account> {
    return this.request<Account>(ctx, {
      method: "PATCH",
      url: `/accounts/${accountId}`,
      data,
    });
  }

  async deleteAccount(ctx: any, accountId: string): Promise<void> {
    return this.request<void>(ctx, {
      method: "DELETE",
      url: `/accounts/${accountId}`,
    });
  }

  // Transaction endpoints
  async parseText(
    ctx: any,
    text: string,
  ): Promise<ParsedTransaction> {
    return this.request<ParsedTransaction>(ctx, {
      method: "POST",
      url: "/parse/text",
      data: { content: text },
    });
  }

  async parseVoice(
    ctx: any,
    file_url: string,
  ): Promise<ParsedTransaction> {
    return this.request<ParsedTransaction>(ctx, {
      method: "POST",
      url: "/parse/voice",
      data: { file_url },
    });
  }

  async parseImage(
    ctx: any,
    image_url: string,
  ): Promise<ParsedTransaction> {
    return this.request<ParsedTransaction>(ctx, {
      method: "POST",
      url: "/parse/image",
      data: { image_url },
    });
  }

  async createTransaction(
    ctx: any,
    data: {
      account_id: string;
      category_id?: number;
      type: "withdrawal" | "deposit";
      amount: number;
      currency_code: string;
      note?: string;
      performed_at?: string;
    }
  ): Promise<Transaction> {
    return this.request<Transaction>(ctx, {
      method: "POST",
      url: "/transactions",
      data,
    });
  }

  async getTransactions(
    ctx: any,
    params?: {
      account_id?: string;
      category_id?: number;
      type?: "withdrawal" | "deposit";
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    items: Transaction[];
    pagination: { limit: number; offset: number; total: number };
  }> {
    return this.request<{
      items: Transaction[];
      pagination: { limit: number; offset: number; total: number };
    }>(ctx, {
      method: "GET",
      url: "/transactions",
      params,
    });
  }

  async getTransaction(
    ctx: any,
    trnID: string,
  ): Promise<Transaction> {
    return this.request<Transaction>(ctx, {
      method: "GET",
      url: `/transactions/${trnID}`,
    });
  }

  async updateTransaction(
    ctx: any,
    transactionId: string,
    data: Partial<Transaction>
  ): Promise<Transaction> {
    return this.request<Transaction>(ctx, {
      method: "PUT",
      url: `/transactions/${transactionId}`,
      data,
    });
  }

  async deleteTransaction(
    ctx: any,
    transactionId: string
  ): Promise<void> {
    return this.request<void>(ctx, {
      method: "DELETE",
      url: `/transactions/${transactionId}`,
    });
  }

  // Category endpoints
  async getCategories(ctx: any): Promise<Category[]> {
    return this.request<Category[]>(ctx, {
      method: "GET",
      url: "/categories",
    });
  }

  // Stats endpoints
  async getStats(
    ctx: any,
    params?: {
      from?: string;
      to?: string;
      account_id?: string;
      period?: 'month' | 'week' | 'day';
    }
  ): Promise<TransactionStats> {
    return this.request<TransactionStats>(ctx, {
      method: "GET",
      url: "/stats/summary",
      params,
    });
  }
}

export const apiClient = new APIClient();