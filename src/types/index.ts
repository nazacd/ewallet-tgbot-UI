import { Context } from "telegraf";

// API Types
export interface User {
  id: string;
  tg_user_id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  currency_code?: string;
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
  type: "withdrawal" | "deposit";
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
  type: "withdrawal" | "deposit";
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
  by_category: {
    category_id: number;
    category_slug: string;
    category_name: string;
    total: number;
  }[];
}

// Bot State Types
export type BotState =
  | "ONBOARDING_ACCOUNT_NAME"
  | "ONBOARDING_CURRENCY"
  | "ONBOARDING_BALANCE"
  | "WAIT_TRANSACTION_CONFIRM"
  | "WAIT_TRANSACTION_EDIT_AMOUNT"
  | "WAIT_TRANSACTION_EDIT_CATEGORY"
  | "WAIT_ACCOUNT_NAME"
  | "WAIT_ACCOUNT_BALANCE"
  | "TUTORIAL_WELCOME"
  | "TUTORIAL_FIRST_TRANSACTION"
  | "TUTORIAL_COMPLETE"
  | "VIEW_HISTORY";

export interface StateData {
  parsedTransaction?: ParsedTransaction;
  accountId?: string;
  transactionDraft?: Partial<Transaction>;
  onboardingData?: {
    name?: string;
    currency?: string;
    balance?: number;
  };
  tutorialStep?: number;
  isTutorial?: boolean; // Flag to track if user is in tutorial mode
  createdAt?: number; // timestamp for expiration tracking
  stepInfo?: {
    current: number;
    total: number;
    name: string;
  };
  transactions?: Transaction[]; // For history pagination
  currentPage?: number; // Current page in history
}

export interface BotContext extends Context {
  from: NonNullable<Context["from"]>;
}
