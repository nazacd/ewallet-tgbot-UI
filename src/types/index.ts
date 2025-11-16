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
  currency_code: string;
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
  type: "income" | "expense";
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
  type: "income" | "expense";
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
    name: string;
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
  | "WAIT_ACCOUNT_BALANCE";

export interface StateData {
  parsedTransaction?: ParsedTransaction;
  accountId?: string;
  transactionDraft?: Partial<Transaction>;
  onboardingData?: {
    name?: string;
    currency?: string;
    balance?: number;
  };
}

export interface BotContext extends Context {
  from: NonNullable<Context["from"]>;
}
