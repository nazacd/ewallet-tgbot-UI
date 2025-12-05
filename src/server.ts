import express, { Request, Response, NextFunction } from 'express';
import { Telegraf } from 'telegraf';
import { config } from './config/env';
import { BotContext } from './types';
import {
    SendMessageRequest,
    SendMessageResponse,
    HealthCheckResponse,
} from './types/api.types';

export function createServer(bot: Telegraf<BotContext>) {
    const app = express();

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
                `${new Date().toISOString()} - ${method} ${url} ${statusCode} - ${duration}ms - ${userAgent}`
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
            const {
                userId,
                message,
                parseMode,
                replyMarkup,
            }: SendMessageRequest = req.body;

            if (!userId || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'userId and message are required',
                } as SendMessageResponse);
            }

            await bot.telegram.sendMessage(userId, message, {
                parse_mode: parseMode,
                reply_markup: replyMarkup,
            });

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
    app.use(
        (err: Error, req: Request, res: Response, _next: NextFunction) => {
            console.error('Server error:', err);
            res.status(500).json({
                error: 'Internal server error',
                message: config.nodeEnv === 'development' ? err.message : undefined,
            });
        }
    );

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
            console.log(
                `📍 Webhook endpoint (external): ${config.webhookDomain}${webhookPath}`
            );
            console.log(
                `📍 Webhook endpoint (local Express path): ${localBase}${webhookPath}`
            );
        } else {
            console.log('📍 Webhook: polling mode active, no HTTP endpoint for updates');
        }
    });

    return { app, server };
}
