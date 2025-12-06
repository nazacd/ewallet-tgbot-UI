import { Telegraf } from 'telegraf';
import { Server } from 'http';
import { config } from './config/env';
import { redisModule } from './config/redis';
import { stateManager } from './state/state.manager';
import { BotContext } from './types';

// Handlers
import {
  startHandler,
  onboardingCurrencyCallback,
  accountNameHandler,
  onboardingBalanceHandler,
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
  historyBackCallback,
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
  statsToMenuCallback,
  statsPeriodMonthCallback,
  statsPeriodWeekCallback,
  statsPeriodDayCallback,
  statsPeriodAllCallback,
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

import { startServer } from './server';

// Validate configuration
config.validate();

// Create bot instance
const bot = new Telegraf<BotContext>(config.botToken);

// =======================
// Commands
// =======================

bot.command('start', startHandler);
bot.command('balance', balanceHandler);
bot.command('history', historyHandler);
bot.command('accounts', accountsHandler);
bot.command('stats', (ctx) => statsHandler(ctx));
bot.command('help', helpHandler);
bot.command('menu', async (ctx) => {
  await showMainMenu(ctx, false);
});

// Cancel command - exits any active flow
bot.command('cancel', async (ctx) => {
  const userId = ctx.from.id;
  const currentState = await stateManager.getStateWithCheck(userId);

  if (!currentState) {
    await ctx.reply(getTimeoutMessage());
  } else {
    await stateManager.clearState(userId);
    await ctx.reply(getCancelMessage());
  }
});

// =======================
// Callback query handlers
// =======================

// Onboarding callbacks
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
bot.action('stats_period_month', statsPeriodMonthCallback);
bot.action('stats_period_week', statsPeriodWeekCallback);
bot.action('stats_period_day', statsPeriodDayCallback);
bot.action('stats_period_all', statsPeriodAllCallback);

// Tutorial callbacks
bot.action('start_tutorial', tutorialBeginCallback);
bot.action('skip_tutorial', tutorialSkipCallback);
bot.action('tutorial_begin', tutorialBeginCallback);
bot.action('tutorial_skip', tutorialSkipCallback);
bot.action('tutorial_commands', tutorialCommandsCallback);
bot.action('tutorial_finish', tutorialFinishCallback);
// (If you use `tutorialCompleteHandler` somewhere else, keep it there)

// Universal cancel action
bot.action('action_cancel', async (ctx) => {
  await ctx.answerCbQuery('Операция отменена');
  await stateManager.clearState(ctx.from.id);
  await ctx.deleteMessage().catch(() => {});
  await ctx.reply(getCancelMessage());
});

// Transaction callbacks
bot.action('tx_confirm', confirmTransactionCallback);
bot.action('tx_edit', editTransactionCallback);
bot.action('tx_cancel', cancelTransactionCallback);
bot.action('tx_edit_amount', editAmountCallback);
bot.action('tx_edit_category', editCategoryCallback);
bot.action('tx_edit_account', editAccountCallback);
bot.action('tx_back', backToConfirmCallback);
bot.action(/^tx_select_category_(.+)$/, selectCategoryCallback);
bot.action(/^tx_select_account_(.+)$/, selectAccountCallback);

// Account callbacks
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

// =======================
// Message handlers
// =======================

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;

  const handled = await stateManager.handleState(userId, ctx);
  if (!handled) {
    await transactionHandler(ctx);
  }
});

bot.on('voice', async (ctx) => {
  const userId = ctx.from.id;

  const handled = await stateManager.handleState(userId, ctx);
  if (handled) return;

  await voiceHandler(ctx);
});

// =======================
// Error handling
// =======================

bot.catch((err, ctx) => {
  console.error('Ошибка бота:', err);
  ctx.reply('❌ Произошла ошибка. Попробуйте снова.').catch(() => {});
});

// =======================
// Launch bot with HTTP server
// =======================

let httpServer: Server;

startServer(bot)
  .then(({ server }) => {
    httpServer = server;
    console.log('✅ Bot and server successfully started!');
    console.log(`📡 API Base URL: ${config.apiBaseUrl}`);
    console.log(`🌐 Server Mode: ${config.nodeEnv}`);
  })
  .catch((err) => {
    console.error('❌ Failed to start bot and server:', err);
    process.exit(1);
  });

// =======================
// Graceful shutdown
// =======================

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);

  try {
    // Stop the bot
    bot.stop(signal);

    // Close HTTP server
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) return reject(err);
          console.log('✅ HTTP server closed');
          resolve();
        });
      });
    }

    // Disconnect from Redis
    await redisModule.disconnect();

    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

export { bot };
