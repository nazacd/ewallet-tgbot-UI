import { ParsedTransaction } from ".";

export interface SendMessageRequest {
  userId: number;
  message: string;
  parseMode?: 'HTML' | 'Markdown';
  replyMarkup?: any;
}

export interface SendMessageResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface HealthCheckResponse {
  status: string;
  uptime: number;
  timestamp: string;
}

export interface WebAppDataRequest {
  data: any;
  queryId: string;
}

export interface WebAppDataResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface MiniAppTransactionRequest {
  from: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    language_code: string;
  };
  data: ParsedTransaction;
}

export interface MiniAppTransactionResponse {
  success: boolean;
  message?: string;
  error?: string;
}
