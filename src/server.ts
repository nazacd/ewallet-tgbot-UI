import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Telegraf } from 'telegraf';
import { config } from './core/config/env';
import { BotContext } from './core/types';
import { SendMessageRequest, SendMessageResponse, HealthCheckResponse, WebAppDataRequest, WebAppDataResponse, MiniAppTransactionRequest, MiniAppTransactionResponse } from './core/types/api.types';
import { stateManager } from './core/state/state.manager';
import { buildConfirmationMessage } from './features/transactions/transaction.handler';


export function createServer(bot: Telegraf<BotContext>) {
  const app = express();

  // CORS configuration
  app.use(cors({
    origin: [
      'https://miniapp.kapusta.whereismy.city',
      'http://localhost:3000',
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
  }));

  // JSON body parser
  app.use(express.json());

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, url } = req;
    const userAgent = req.get('user-agent') || '';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      console.log(
        `${new Date().toISOString()} - ${method} ${url} ${statusCode} - ${duration}ms - ${userAgent}`,
      );
    });

    next();
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    const response: HealthCheckResponse = {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  });

  // API endpoint for sending messages to users
  app.post('/api/send-message', async (req: Request, res: Response) => {
    try {
      const { userId, message, parseMode, replyMarkup, videoId }: SendMessageRequest = req.body;

      if (!userId || !message) {
        return res.status(400).json({
          success: false,
          error: 'userId and message are required',
        } as SendMessageResponse);
      }

      // If videoId is provided, send video with caption
      if (videoId) {
        await bot.telegram.sendVideo(userId, videoId, {
          caption: message,
          parse_mode: parseMode,
          reply_markup: replyMarkup,
        });
      } else {
        // Otherwise send regular text message
        await bot.telegram.sendMessage(userId, message, {
          parse_mode: parseMode,
          reply_markup: replyMarkup,
        });
      }

      res.json({
        success: true,
        message: 'Message sent successfully',
      } as SendMessageResponse);
    } catch (error: any) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send message',
      } as SendMessageResponse);
    }
  });

  // API endpoint for MiniApp transaction callback (Updates existing message)
  app.post('/api/miniapp/transactions/callback', async (req: Request, res: Response) => {
    try {
      // 1. Parse and validate body
      const body: MiniAppTransactionRequest = req.body;
      const { from, data } = body;

      if (!from.id || !data) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: user_id, message_id, or data',
        } as MiniAppTransactionResponse);
      }

      console.log(`📱 Received MiniApp transaction callback for user ${from.id}`);

      // 2. Update State
      const currentState = await stateManager.getData(from.id);
      const updatedStateData = {
        parsedTransaction: data,
        parsedTransactionMessage: currentState.parsedTransactionMessage,
        accountId: data.account_id || currentState.accountId,
      };

      await stateManager.setState(from.id, 'WAIT_TRANSACTION_CONFIRM', updatedStateData);

      // 3. Mock Context for API Client
      const mockCtx: any = {
        from: from,
        telegram: bot.telegram,
      };

      // 4. Build new message content
      const { summary, keyboard } = await buildConfirmationMessage(updatedStateData, mockCtx);

      // 5. Edit the Telegram message
      await bot.telegram.editMessageText(
        from.id,
        updatedStateData.parsedTransactionMessage?.message_id,
        undefined,
        summary,
        {
          parse_mode: 'HTML',
          ...keyboard,
        }
      );

      return res.json({
        success: true,
        message: 'Transaction updated successfully',
      } as MiniAppTransactionResponse);

    } catch (error: any) {
      console.error('MiniApp callback error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update transaction',
      } as MiniAppTransactionResponse);
    }
  });
  return app;
}

export async function startServer(bot: Telegraf<BotContext>) {
  const app = createServer(bot);

  // =======================
  // Webhook vs Polling
  // =======================
  let webhookPath: string | null = null;

  if (config.webhookDomain && config.nodeEnv === 'production') {
    console.log('🔗 Setting up webhook mode...');

    // Path where Express will receive Telegram updates
    webhookPath = `/telegraf/${bot.secretPathComponent()}`;

    // 1) Register Express handler for that path
    app.use(bot.webhookCallback(webhookPath));

    // 2) Tell Telegram to send updates to this URL
    const fullWebhookUrl = `${config.webhookDomain}${webhookPath}`;

    await bot.telegram.setWebhook(fullWebhookUrl, {
      secret_token: config.webhookSecret, // assuming you always set it
    });

    console.log(`✅ Webhook set to: ${fullWebhookUrl}`);
  } else {
    console.log('⚠️  Running in polling mode (development)');
    console.log('💡 For webhook mode, set WEBHOOK_DOMAIN and NODE_ENV=production');

    // Make sure webhook is cleared in dev
    try {
      await bot.telegram.deleteWebhook();
    } catch (e) {
      console.warn('Failed to delete webhook (maybe none set):', e);
    }

    bot.launch().catch((err) => {
      console.error('Failed to start bot polling:', err);
    });
  }

  // =======================
  // Error & 404 handlers AFTER webhook
  // =======================

  // Error handling middleware (must have 4 args)
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: config.nodeEnv === 'development' ? err.message : undefined,
    });
  });

  // 404 handler – last middleware
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // =======================
  // Start HTTP server
  // =======================

  const server = app.listen(config.port, () => {
    const localBase = `http://localhost:${config.port}`;
    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`📍 Health check: ${localBase}/health`);
    console.log(`📍 API endpoint: ${localBase}/api/send-message`);

    if (webhookPath && config.webhookDomain && config.nodeEnv === 'production') {
      console.log(`📍 Webhook endpoint (external): ${config.webhookDomain}${webhookPath}`);
      console.log(`📍 Webhook endpoint (local Express path): ${localBase}${webhookPath}`);
    } else {
      console.log('📍 Webhook: polling mode active, no HTTP endpoint for updates');
    }
  });

  return { app, server };
}
