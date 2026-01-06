import { Context } from 'telegraf';

// API Types
export interface User {
  id: string;
  tg_user_id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  currency_code?: string;
  timezone?: string;
  created_at: string;
  updated_at?: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  user_id?: string;
  position: number;
  name: string;
  emoji?: string;
}

export interface Subcategory {
  id: number;
  user_id?: string;
  category_id: number;
  position: number;
  name: string;
  emoji?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: number;
  subcategory_id?: number;
  type: 'withdrawal' | 'deposit';
  status?: string;
  amount: number;
  currency_code: string;
  original_amount?: number;
  original_currency_code?: string;
  fx_rate?: number;
  note?: string;
  performed_at?: string;
  rejected_at?: string;
  created_at: string;
}

export interface ParsedTransaction {
  type: 'withdrawal' | 'deposit';
  amount: number;
  currency: string;
  original_amount?: number;
  original_currency?: string;
  fx_rate?: number;
  account_id?: string;
  category_id?: number;
  subcategory_id?: number;
  note?: string;
  confidence: number;
  performed_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface TransactionStats {
  total_income: number;
  total_expense: number;
  balance: number;
  income_by_category: {
    category_id: number;
    category_name: string;
    category_emoji?: string;
    total: number;
  }[];
  expense_by_category: {
    category_id: number;
    category_name: string;
    category_emoji?: string;
    total: number;
  }[];
}

// Bot State Types
export type BotState =
  // New onboarding states (11 screens)
  | 'ONBOARDING_LANGUAGE'
  | 'ONBOARDING_INTRO_1'
  | 'ONBOARDING_INTRO_2'
  | 'ONBOARDING_FIRST_EXPENSE'
  | 'ONBOARDING_FIRST_CONFIRM'
  | 'ONBOARDING_ADVANCED'
  | 'ONBOARDING_ACCOUNT_CONCEPT'
  | 'ONBOARDING_CURRENCY'
  | 'ONBOARDING_ACCOUNT_NAME'
  | 'ONBOARDING_ACCOUNT_BALANCE'
  | 'ONBOARDING_TIMEZONE'
  | 'ONBOARDING_COMPLETE'
  // Transaction states
  | 'WAIT_TRANSACTION_CONFIRM'
  | 'WAIT_TRANSACTION_EDIT_AMOUNT'
  | 'SETTINGS_TIMEZONE'
  | 'WAIT_TRANSACTION_EDIT_CATEGORY'
  // Account management states
  | 'WAIT_ACCOUNT_NAME'
  | 'WAIT_ACCOUNT_BALANCE'
  // History view
  | 'VIEW_HISTORY';

export interface StateData {
  // Transaction data
  parsedTransaction?: ParsedTransaction;
  parsedTransactionMessage?: {
    message_id: number;
  };
  accountId?: string;
  transactionDraft?: Partial<Transaction>;

  // New onboarding data
  language?: 'ru' | 'uz';
  onboardingScreen?: number; // 0-11
  tutorialExpense?: ParsedTransaction; // Tutorial transaction (not saved)
  accountData?: {
    currency?: string;
    name?: string;
    balance?: number;
  };

  // Legacy onboarding data (to be removed after migration)
  onboardingData?: {
    name?: string;
    currency?: string;
    balance?: number;
  };

  // Deprecated tutorial flags
  tutorialStep?: number;

  // System data
  createdAt?: number; // timestamp for expiration tracking
  stepInfo?: {
    current: number;
    total: number;
    name: string;
  };

  // History pagination
  transactions?: Transaction[];
  currentPage?: number;
}

export interface BotContext extends Context {
  from: NonNullable<Context['from']>;
}

export interface DashboardData {
  period?: string;
  totalIncome: number;
  totalExpense: number;
  currencyCode: string;
  expensesChart?: Buffer;
  incomeChart?: Buffer;
  accountName?: string;
}

// Debt Types
export interface Debt {
  id: string;
  user_id: string;
  transaction_id: string;
  type: 'borrow' | 'lend';
  status: 'open' | 'paid' | 'cancelled';
  name: string;
  amount: number;
  currency_code: string;
  note?: string;
  due_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface DebtsResponse {
  items: Debt[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// Advanced Stats Types
export interface AccountStats {
  account_id: string;
  account_name: string;
  total_income: number;
  total_expense: number;
  net_change: number;
  transaction_count: number;
}

export interface AccountStatsView {
  accounts: AccountStats[];
  totals: {
    total_income: number;
    total_expense: number;
    net_change: number;
  };
}

export interface CategoryStats {
  category_id: number;
  category_name: string;
  category_emoji?: string;
  total: number;
  transaction_count: number;
  percentage: number;
}

export interface CategoryStatsView {
  categories: CategoryStats[];
  total: number;
}

export interface SubcategoryStats {
  subcategory_id: number;
  subcategory_name: string;
  subcategory_emoji?: string;
  category_id: number;
  category_name: string;
  category_emoji?: string;
  total: number;
  transaction_count: number;
  percentage: number;
}

export interface SubcategoryStatsView {
  subcategories: SubcategoryStats[];
  total: number;
}

export interface PeriodStats {
  total_income: number;
  total_expense: number;
  net_change: number;
  transaction_count: number;
}

export interface CategoryChange {
  category_id: number;
  category_name: string;
  category_emoji?: string;
  base_amount: number;
  compare_amount: number;
  absolute_change: number;
  percentage_change: number;
}

export interface StatsCompareView {
  base_period: {
    from: string;
    to: string;
    stats: PeriodStats;
  };
  compare_period: {
    from: string;
    to: string;
    stats: PeriodStats;
  };
  changes: {
    income_change: number;
    income_change_percentage: number;
    expense_change: number;
    expense_change_percentage: number;
  };
  top_increases?: CategoryChange[];
  top_decreases?: CategoryChange[];
}

export interface TimeseriesDataPoint {
  date: string;
  total_income: number;
  total_expense: number;
  net_change: number;
  transaction_count: number;
}

export interface TimeseriesStatsView {
  data: TimeseriesDataPoint[];
  totals: {
    total_income: number;
    total_expense: number;
    net_change: number;
  };
}

export interface BalanceDataPoint {
  date: string;
  balance: number;
}

export interface AccountBalanceTimeseries {
  account_id: string;
  account_name: string;
  data: BalanceDataPoint[];
}

export interface BalanceTimeseriesView {
  mode: 'aggregate' | 'per_account';
  aggregate_data?: BalanceDataPoint[];
  account_data?: AccountBalanceTimeseries[];
}
