import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080/api',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  
  validate() {
    const errors: string[] = [];
    
    if (!this.botToken) errors.push('BOT_TOKEN is required');
    if (!this.apiBaseUrl) errors.push('API_BASE_URL is required');
    if (!this.openaiApiKey) errors.push('OPENAI_API_KEY is required');
    
    if (errors.length > 0) {
      throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
  }
};
