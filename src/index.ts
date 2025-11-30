import { Telegraf } from 'telegraf';
import { config } from './config/env';
import { redisModule } from './config/redis';
import { stateManager } from './state/state.manager';
import { BotContext } from './types';

// Import handlers
import {
  startHandler,
  onboardingCurrencyCallback,
  accountNameHandler,
  onboardingBalanceHandler
} from './handlers/start.handler';
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
import {
  historyHandler,
  historyPageCallback,
  historyViewCallback,
  historyBackCallback
} from './handlers/history.handler';
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
import {
  statsHandler,
  statsToMenuCallback
} from './handlers/stats.handler';
import {
  tutorialBeginCallback,
  tutorialSkipCallback,
  tutorialCommandsCallback,
  tutorialFinishCallback,
  tutorialCompleteHandler,
} from './handlers/tutorial.handler';
import { getCancelMessage, getTimeoutMessage } from './utils/navigation';
import {
  showMainMenu,
  menuAccountsCallback,
  menuAddTransactionCallback,
  menuHistoryCallback,
  menuStatsCallback,
  menuSettingsCallback,
  backToMenuCallback,
} from './handlers/menu.handler';
import {
  showSettings,
  settingsChangeCurrencyCallback,
  settingsSetCurrencyCallback,
  settingsDefaultAccountCallback,
  settingsSetDefaultAccountCallback,
} from './handlers/settings.handler';

// Validate configuration
config.validate();

// Create bot instance
const bot = new Telegraf<BotContext>(config.botToken);

// Commands
bot.command('start', startHandler);
bot.command('balance', balanceHandler);
bot.command('history', historyHandler);
bot.command('accounts', accountsHandler);
bot.command('stats', statsHandler);
bot.command('help', helpHandler);
bot.command('menu', async (ctx) => {
  await showMainMenu(ctx, false);
});

// Cancel command - exits any active flow
bot.command('cancel', async (ctx) => {
  const userId = ctx.from.id;
  const currentState = await stateManager.getStateWithCheck(userId);

  if (!currentState) {
    // No active state or state expired
    await ctx.reply(getTimeoutMessage());
  } else {
    // Active state - cancel it
    await stateManager.clearState(userId);
    await ctx.reply(getCancelMessage());
  }
});

// Callback query handlers
bot.action(/^currency_(.+)$/, onboardingCurrencyCallback);

// Menu callbacks
bot.action('menu_accounts', menuAccountsCallback);
bot.action('menu_add_transaction', menuAddTransactionCallback);
bot.action('menu_history', menuHistoryCallback);
bot.action('menu_stats', menuStatsCallback);
bot.action('menu_settings', menuSettingsCallback);
bot.action('back_to_menu', backToMenuCallback);

// Settings callbacks
bot.action('settings_change_currency', settingsChangeCurrencyCallback);
bot.action(/^settings_set_currency_(.+)$/, settingsSetCurrencyCallback);
bot.action('settings_default_account', settingsDefaultAccountCallback);
bot.action(/^settings_set_default_(.+)$/, settingsSetDefaultAccountCallback);

// Stats callbacks
bot.action('stats_to_menu', statsToMenuCallback);

// Tutorial callbacks
bot.action('start_tutorial', tutorialBeginCallback);
bot.action('skip_tutorial', tutorialSkipCallback);
bot.action('tutorial_begin', tutorialBeginCallback);
bot.action('tutorial_skip', tutorialSkipCallback);
bot.action('tutorial_commands', tutorialCommandsCallback);
bot.action('tutorial_finish', tutorialFinishCallback);

// Universal cancel action
bot.action('action_cancel', async (ctx) => {
  await ctx.answerCbQuery('Операция отменена');
  await stateManager.clearState(ctx.from.id);
  await ctx.deleteMessage().catch(() => {});
  await ctx.reply(getCancelMessage());
});

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

// History callbacks
bot.action(/^history_page_(\d+)$/, historyPageCallback);
bot.action(/^history_view_(\d+)$/, historyViewCallback);
bot.action(/^history_back_(\d+)$/, historyBackCallback);

// Text message handler
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;

  // Check if user has an active state
  const handled = await stateManager.handleState(userId, ctx);

  if (!handled) {
    // No active state, try to parse as transaction
    await transactionHandler(ctx);
  }
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
process.once('SIGINT', async () => {
  console.log('Останавливаю бота...');
  bot.stop('SIGINT');
  await redisModule.disconnect();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  console.log('Останавливаю бота...');
  bot.stop('SIGTERM');
  await redisModule.disconnect();
  process.exit(0);
});
