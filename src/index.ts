import { Telegraf, Markup } from 'telegraf';
import * as dotenv from 'dotenv';
import { inlineKeyboard } from 'telegraf/markup';
import { StateManager, stateManager } from './state/state.manager';
import { balanceHandler } from './handlers/balance.handler';
import { defaultHandler } from './handlers/default.handler';


dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN is not set in .env');
}

const bot = new Telegraf(token);

stateManager.register('WAIT_BALANCE', balanceHandler)


// /start команда
bot.start(async (ctx) => {
    await ctx.reply(`Добро пожаловать в e-wallet! Каков сейчас баланс твоих средств?`);

    stateManager.setState(ctx.from.id, "WAIT_BALANCE")
});



// echo на любой текст
bot.on('text', (ctx) => {
    const userId = ctx.from.id;    
    const state = stateManager.getState(userId);
    
    if (state) {
        const handler = stateManager.getHandler(state);
        if (handler) {
          return handler(ctx);
        }
    }
  
    return defaultHandler(ctx);
});



bot.launch().then(() => {
    console.log('Bot started');
});

// Грейсфул-шатдаун
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
