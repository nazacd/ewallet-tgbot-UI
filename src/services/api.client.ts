import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { BotContext, ParsedDebt, Subcategory } from '../core/types';
import { config } from '../core/config/env';
import { authService } from './auth.service';
import {
  User,
  Account,
  Transaction,
  Category,
  ParsedTransaction,
  TransactionStats,
  Debt,
  DebtsResponse,
  AccountStatsView,
  CategoryStatsView,
  SubcategoryStatsView,
  StatsCompareView,
  TimeseriesStatsView,
  BalanceTimeseriesView,
} from '../core/types';

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
    isRetry: boolean = false,
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
      throw new Error('User not authenticated');
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
      // Handle token expiration (401 or 403) or missing user (404 on /users/me)
      if (
        (error.response?.status === 401 ||
          error.response?.status === 403 ||
          (error.response?.status === 404 && requestConfig.url === '/users/me')) &&
        !isRetry
      ) {
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
          console.error('Token refresh failed:', refreshError);
          throw new Error('Сессия истекла. Попробуйте снова.');
        }
      }

      throw error;
    }
  }

  // User endpoints
  async getMe(ctx: any): Promise<User> {
    return this.request<User>(ctx, {
      method: 'GET',
      url: '/users/me',
    });
  }

  async updateMe(
    ctx: any,
    data: { currency_code?: string; language_code?: string; timezone?: string },
  ): Promise<User> {
    return this.request<User>(ctx, {
      method: 'PATCH',
      url: '/users/me',
      data,
    });
  }

  // Account endpoints
  async getAccounts(ctx: any): Promise<Account[]> {
    return this.request<Account[]>(ctx, {
      method: 'GET',
      url: '/accounts',
    });
  }

  async createAccount(
    ctx: any,
    data: {
      name: string;
      balance?: number;
      is_default?: boolean;
    },
  ): Promise<Account> {
    return this.request<Account>(ctx, {
      method: 'POST',
      url: '/accounts',
      data,
    });
  }

  async updateAccount(
    ctx: any,
    accountId: string,
    data: { name?: string; is_default?: boolean },
  ): Promise<Account> {
    return this.request<Account>(ctx, {
      method: 'PATCH',
      url: `/accounts/${accountId}`,
      data,
    });
  }

  async deleteAccount(ctx: any, accountId: string): Promise<void> {
    return this.request<void>(ctx, {
      method: 'DELETE',
      url: `/accounts/${accountId}`,
    });
  }

  // Transaction endpoints
  async parseText(ctx: any, text: string): Promise<ParsedTransaction> {
    return this.request<ParsedTransaction>(ctx, {
      method: 'POST',
      url: '/parse/text',
      data: { content: text },
    });
  }

  async parseDebtText(
    ctx: any,
    data: {
      transaction_id: string,
      content: string,
    }
  ): Promise<ParsedDebt> {
    return this.request<ParsedDebt>(ctx, {
      method: 'POST',
      url: '/parse/debt/text',
      data,
    });
  }

  async parseVoice(ctx: any, file_url: string): Promise<ParsedTransaction> {
    return this.request<ParsedTransaction>(ctx, {
      method: 'POST',
      url: '/parse/voice',
      data: { file_url },
    });
  }

  async parseImage(ctx: any, image_url: string): Promise<ParsedTransaction> {
    return this.request<ParsedTransaction>(ctx, {
      method: 'POST',
      url: '/parse/image',
      data: { image_url },
    });
  }

  async createTransaction(
    ctx: any,
    data: {
      account_id: string;
      category_id?: number;
      subcategory_id?: number;
      type: 'withdrawal' | 'deposit';
      amount: number;
      currency_code: string;
      original_amount?: number;
      original_currency_code?: string;
      fx_rate?: number;
      note?: string;
      performed_at?: string;
    },
  ): Promise<Transaction> {
    return this.request<Transaction>(ctx, {
      method: 'POST',
      url: '/transactions',
      data,
    });
  }

  async getTransactions(
    ctx: any,
    params?: {
      account_ids?: string[];
      category_ids?: number[];
      subcategory_ids?: number[];
      type?: 'withdrawal' | 'deposit';
      from?: string;
      to?: string;
      min_amount?: number;
      max_amount?: number;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    items: Transaction[];
    pagination: { limit: number; offset: number; total: number };
  }> {
    return this.request<{
      items: Transaction[];
      pagination: { limit: number; offset: number; total: number };
    }>(ctx, {
      method: 'GET',
      url: '/transactions',
      params,
    });
  }

  async getTransaction(ctx: any, trnID: string): Promise<Transaction> {
    return this.request<Transaction>(ctx, {
      method: 'GET',
      url: `/transactions/${trnID}`,
    });
  }

  async updateTransaction(
    ctx: any,
    transactionId: string,
    data: {
      account_id: string;
      category_id?: number;
      subcategory_id?: number;
      type: 'withdrawal' | 'deposit';
      amount: number;
      currency_code: string;
      original_amount?: number;
      original_currency_code?: string;
      fx_rate?: number;
      note?: string;
      performed_at?: string;
    },
  ): Promise<Transaction> {
    return this.request<Transaction>(ctx, {
      method: 'PUT',
      url: `/transactions/${transactionId}`,
      data,
    });
  }

  async deleteTransaction(ctx: any, transactionId: string): Promise<void> {
    return this.request<void>(ctx, {
      method: 'DELETE',
      url: `/transactions/${transactionId}`,
    });
  }

  // Category endpoints
  async getCategories(ctx: any): Promise<Category[]> {
    return this.request<Category[]>(ctx, {
      method: 'GET',
      url: '/categories',
    });
  }

  async getSubcategories(ctx: any): Promise<Subcategory[]> {
    return this.request<Subcategory[]>(ctx, {
      method: 'GET',
      url: '/subcategories',
    });
  }

  // Stats endpoints
  async getStatsByAccount(
    ctx: any,
    params: {
      from: string;
      to: string;
      type?: 'withdrawal' | 'deposit';
    },
  ): Promise<AccountStatsView> {
    return this.request<AccountStatsView>(ctx, {
      method: 'GET',
      url: '/stats/by-account',
      params,
    });
  }

  async getStatsByCategory(
    ctx: any,
    params: {
      from: string;
      to: string;
      account_ids?: string[];
      type?: 'withdrawal' | 'deposit';
    },
  ): Promise<CategoryStatsView> {
    return this.request<CategoryStatsView>(ctx, {
      method: 'GET',
      url: '/stats/by-category',
      params,
    });
  }

  async getStatsBySubcategory(
    ctx: any,
    params: {
      from: string;
      to: string;
      account_ids?: string[];
      category_ids?: number[];
      type?: 'withdrawal' | 'deposit';
    },
  ): Promise<SubcategoryStatsView> {
    return this.request<SubcategoryStatsView>(ctx, {
      method: 'GET',
      url: '/stats/by-subcategory',
      params,
    });
  }

  async getStatsCompare(
    ctx: any,
    params: {
      period?: 'this_month_vs_last_month' | 'last_7_days_vs_previous_7_days' | 'this_year_vs_last_year';
      base_from?: string;
      base_to?: string;
      compare_from?: string;
      compare_to?: string;
      account_ids?: string[];
      type?: 'withdrawal' | 'deposit';
      top_limit?: number;
    },
  ): Promise<StatsCompareView> {
    return this.request<StatsCompareView>(ctx, {
      method: 'GET',
      url: '/stats/compare',
      params,
    });
  }

  async getStatsTimeseries(
    ctx: any,
    params: {
      from: string;
      to: string;
      account_ids?: string[];
      category_ids?: number[];
      subcategory_ids?: number[];
      type?: 'withdrawal' | 'deposit' | 'transfer' | 'adjustment';
      group_by?: 'day' | 'week' | 'month';
    },
  ): Promise<TimeseriesStatsView> {
    return this.request<TimeseriesStatsView>(ctx, {
      method: 'GET',
      url: '/stats/timeseries',
      params,
    });
  }

  async getStatsBalanceTimeseries(
    ctx: any,
    params: {
      from: string;
      to: string;
      group_by?: 'day' | 'week' | 'month';
      account_ids?: string[];
      mode?: 'aggregate' | 'per_account';
    },
  ): Promise<BalanceTimeseriesView> {
    return this.request<BalanceTimeseriesView>(ctx, {
      method: 'GET',
      url: '/stats/timeseries/balance',
      params,
    });
  }

  // Category management endpoints
  async createCategory(
    ctx: any,
    data: {
      name: string;
      emoji?: string;
      slug?: string;
      type?: 'withdrawal' | 'deposit';
    },
  ): Promise<Category> {
    return this.request<Category>(ctx, {
      method: 'POST',
      url: '/categories',
      data,
    });
  }

  async deleteCategory(ctx: any, categoryId: number): Promise<void> {
    return this.request<void>(ctx, {
      method: 'DELETE',
      url: `/categories/${categoryId}`,
    });
  }

  // Subcategory management endpoints
  async createSubcategory(
    ctx: any,
    data: {
      name: string;
      category_id: number;
      emoji?: string;
      slug?: string;
    },
  ): Promise<Subcategory> {
    return this.request<Subcategory>(ctx, {
      method: 'POST',
      url: '/subcategories',
      data,
    });
  }

  async deleteSubcategory(ctx: any, subcategoryId: number): Promise<void> {
    return this.request<void>(ctx, {
      method: 'DELETE',
      url: `/subcategories/${subcategoryId}`,
    });
  }

  // Debts endpoints
  async getDebts(
    ctx: any,
    params?: {
      limit?: number;
      offset?: number;
      transaction_ids?: string[];
      types?: ('borrow' | 'lend')[];
      statuses?: ('open' | 'paid' | 'cancelled')[];
    },
  ): Promise<DebtsResponse> {
    return this.request<DebtsResponse>(ctx, {
      method: 'GET',
      url: '/debts',
      params,
    });
  }

  async createDebt(
    ctx: any,
    data: {
      transaction_id: string;
      type: 'borrow' | 'lend';
      name: string;
      due_at?: string;
      note?: string;
    },
  ): Promise<Debt> {
    return this.request<Debt>(ctx, {
      method: 'POST',
      url: '/debts',
      data,
    });
  }

  async getDebt(ctx: any, debtId: string): Promise<Debt> {
    return this.request<Debt>(ctx, {
      method: 'GET',
      url: `/debts/${debtId}`,
    });
  }

  async updateDebt(
    ctx: any,
    debtId: string,
    data: {
      amount?: number;
      name?: string;
      due_at?: string;
      note?: string;
    },
  ): Promise<Debt> {
    return this.request<Debt>(ctx, {
      method: 'PUT',
      url: `/debts/${debtId}`,
      data,
    });
  }

  async payDebt(
    ctx: any,
    debtId: string,
    data: {
      account_id: string;
    },
  ): Promise<Debt> {
    return this.request<Debt>(ctx, {
      method: 'POST',
      url: `/debts/${debtId}/pay`,
      data,
    });
  }

  async cancelDebt(ctx: any, debtId: string): Promise<Debt> {
    return this.request<Debt>(ctx, {
      method: 'POST',
      url: `/debts/${debtId}/cancel`,
    });
  }
}

export const apiClient = new APIClient();
