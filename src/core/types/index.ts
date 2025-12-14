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
  slug: string;
  position: number;
  name: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: number;
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
  category_id?: number;
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
    category_slug: string;
    category_name: string;
    total: number;
  }[];
  expense_by_category: {
    category_id: number;
    category_slug: string;
    category_name: string;
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
  | 'WAIT_TRANSACTION_EDIT_CATEGORY'
  // Account management states
  | 'WAIT_ACCOUNT_NAME'
  | 'WAIT_ACCOUNT_BALANCE'
  // History view
  | 'VIEW_HISTORY';

export interface StateData {
  // Transaction data
  parsedTransaction?: ParsedTransaction;
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
