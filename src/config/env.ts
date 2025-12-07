import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080/api',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Server configuration
  port: parseInt(process.env.PORT || '3000', 10),
  webhookDomain: process.env.WEBHOOK_DOMAIN || '',
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  apiSecret: process.env.API_SECRET || '',

  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',

  validate() {
    const errors: string[] = [];

    if (!this.botToken) errors.push('BOT_TOKEN is required');
    if (!this.apiBaseUrl) errors.push('API_BASE_URL is required');

    // Webhook validation only in production
    if (this.nodeEnv === 'production') {
      if (!this.webhookDomain) errors.push('WEBHOOK_DOMAIN is required in production');
      if (!this.webhookSecret) errors.push('WEBHOOK_SECRET is required in production');
      if (!this.apiSecret) errors.push('API_SECRET is required in production');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
  }
};
