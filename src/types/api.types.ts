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
