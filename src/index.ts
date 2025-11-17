import { Telegraf } from 'telegraf';
import { config } from './config/env';
import { stateManager } from './state/state.manager';
import { BotContext } from './types';

// Import handlers
import { startHandler, onboardingCurrencyCallback } from './handlers/start.handler';
import { 
  transactionHandler,
  confirmTransactionCallback,
  editTransactionCallback,
  cancelTransactionCallback,
  editAmountCallback,
  editCategoryCallback,
  editAccountCallback,
  backToConfirmCallback,
  selectCategoryCallback,
  selectAccountCallback,
} from './handlers/transaction.handler';
import { balanceHandler } from './handlers/balance.handler';
import { historyHandler } from './handlers/history.handler';
import {
  accountsHandler,
  addAccountCallback,
  manageAccountsCallback,
  viewAccountCallback,
  setDefaultAccountCallback,
  deleteAccountCallback,
  confirmDeleteAccountCallback,
  backToAccountsCallback,
} from './handlers/accounts.handler';
import { helpHandler } from './handlers/help.handler';
import { voiceHandler } from './handlers/voice.handler';

// Validate configuration
config.validate();

// Create bot instance
const bot = new Telegraf<BotContext>(config.botToken);

// Commands
bot.command('start', startHandler);
bot.command('balance', balanceHandler);
bot.command('history', historyHandler);
bot.command('accounts', accountsHandler);
bot.command('help', helpHandler);

// Callback query handlers
bot.action(/^currency_(.+)$/, onboardingCurrencyCallback);

bot.action('tx_confirm', confirmTransactionCallback);
bot.action('tx_edit', editTransactionCallback);
bot.action('tx_cancel', cancelTransactionCallback);
bot.action('tx_edit_amount', editAmountCallback);
bot.action('tx_edit_category', editCategoryCallback);
bot.action('tx_edit_account', editAccountCallback);
bot.action('tx_back', backToConfirmCallback);
bot.action(/^tx_select_category_(.+)$/, selectCategoryCallback);
bot.action(/^tx_select_account_(.+)$/, selectAccountCallback);

bot.action('acc_add', addAccountCallback);
bot.action('acc_manage', manageAccountsCallback);
bot.action('acc_back', backToAccountsCallback);
bot.action(/^acc_view_(.+)$/, viewAccountCallback);
bot.action(/^acc_default_(.+)$/, setDefaultAccountCallback);
bot.action(/^acc_delete_(?!confirm_)(.+)$/, deleteAccountCallback);
bot.action(/^acc_delete_confirm_(.+)$/, confirmDeleteAccountCallback);

// Text message handler
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  
  // Check if user is in a state (multi-step flow)
  const handled = await stateManager.handleState(userId, ctx);
  if (handled) return;
  
  // Otherwise, treat as transaction input
  await transactionHandler(ctx);
});


// Voice message handler (for future implementation)
bot.on('voice', async (ctx) => {
  const userId = ctx.from.id;
  
  // Check if user is in a state (multi-step flow)
  const handled = await stateManager.handleState(userId, ctx);
  if (handled) return;

  await voiceHandler(ctx);
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Ошибка бота:', err);
  ctx.reply('❌ Произошла ошибка. Попробуйте снова.').catch(() => {});
});

// Launch bot
bot.launch()
  .then(() => {
    console.log('✅ Бот успешно запущен!');
    console.log(`📡 Базовый URL API: ${config.apiBaseUrl}`);
  })
  .catch((err) => {
    console.error('❌ Не удалось запустить бота:', err);
    process.exit(1);
  });

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('Останавливаю бота...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('Останавливаю бота...');
  bot.stop('SIGTERM');
});
