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
      timeout: 10000,
    });
  }

  private async request<T>(
    tgUserId: number,
    requestConfig: AxiosRequestConfig
  ): Promise<T> {
    const token = authService.getToken(tgUserId);

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
      if (error.response?.status === 401) {
        // Token expired, clear it
        authService.clearToken(tgUserId);
        throw new Error("Сессия истекла. Попробуйте снова.");
      }
      throw error;
    }
  }

  // User endpoints
  async getMe(tgUserId: number): Promise<User> {
    return this.request<User>(tgUserId, {
      method: "GET",
      url: "/users/me",
    });
  }

  async updateMe(
    tgUserId: number,
    data: { currency_code?: string; language_code?: string }
  ): Promise<User> {
    return this.request<User>(tgUserId, {
      method: "PATCH",
      url: "/users/me",
      data,
    });
  }

  // Account endpoints
  async getAccounts(tgUserId: number): Promise<Account[]> {
    return this.request<Account[]>(tgUserId, {
      method: "GET",
      url: "/accounts",
    });
  }

  async createAccount(
    tgUserId: number,
    data: {
      name: string;
      balance?: number;
      is_default?: boolean;
    }
  ): Promise<Account> {
    return this.request<Account>(tgUserId, {
      method: "POST",
      url: "/accounts",
      data,
    });
  }

  async updateAccount(
    tgUserId: number,
    accountId: string,
    data: { name?: string; is_default?: boolean }
  ): Promise<Account> {
    return this.request<Account>(tgUserId, {
      method: "PATCH",
      url: `/accounts/${accountId}`,
      data,
    });
  }

  async deleteAccount(tgUserId: number, accountId: string): Promise<void> {
    return this.request<void>(tgUserId, {
      method: "DELETE",
      url: `/accounts/${accountId}`,
    });
  }

  // Transaction endpoints
  async parseTransaction(
    tgUserId: number,
    text: string,
    languageCode?: string
  ): Promise<ParsedTransaction> {
    return this.request<ParsedTransaction>(tgUserId, {
      method: "POST",
      url: "/parse/text",
      data: {content: text, language_code: languageCode },
    });
  }

  async createTransaction(
    tgUserId: number,
    data: {
      account_id: string;
      category_id?: number;
      type: "income" | "expense";
      amount: number;
      currency_code: string;
      note?: string;
      performed_at?: string;
    }
  ): Promise<Transaction> {
    return this.request<Transaction>(tgUserId, {
      method: "POST",
      url: "/transactions",
      data,
    });
  }

  async getTransactions(
    tgUserId: number,
    params?: {
      account_id?: string;
      category_id?: number;
      type?: "income" | "expense";
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Transaction[]> {
    return this.request<Transaction[]>(tgUserId, {
      method: "GET",
      url: "/transactions",
      params,
    });
  }

  async updateTransaction(
    tgUserId: number,
    transactionId: string,
    data: Partial<Transaction>
  ): Promise<Transaction> {
    return this.request<Transaction>(tgUserId, {
      method: "PUT",
      url: `/transactions/${transactionId}`,
      data,
    });
  }

  async deleteTransaction(
    tgUserId: number,
    transactionId: string
  ): Promise<void> {
    return this.request<void>(tgUserId, {
      method: "DELETE",
      url: `/transactions/${transactionId}`,
    });
  }

  // Category endpoints
  async getCategories(tgUserId: number): Promise<Category[]> {
    return this.request<Category[]>(tgUserId, {
      method: "GET",
      url: "/categories",
    });
  }

  // Stats endpoints
  async getStats(
    tgUserId: number,
    params?: {
      from?: string;
      to?: string;
      account_id?: string;
    }
  ): Promise<TransactionStats> {
    return this.request<TransactionStats>(tgUserId, {
      method: "GET",
      url: "/stats/summary",
      params,
    });
  }
}

export const apiClient = new APIClient();
