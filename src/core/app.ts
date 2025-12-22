import { Telegraf } from 'telegraf';
import { Server } from 'http';
import { config } from './config/env';
import { redisModule } from './config/redis';
import { stateManager } from './state/state.manager';
import { BotContext } from './types';
import { startServer } from '../server';
import { Language, t } from '../shared/utils/i18n';

// Handlers
import { startHandler } from '../features/start/start.handler';
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
  selectSubcategoryCallback,
  selectAccountCallback,
} from '../features/transactions/transaction.handler';
import {
  historyHandler,
  historyPageCallback,
  historyViewCallback,
  historyBackCallback,
  historyDeleteAskCallback,
  historyDeleteConfirmCallback,
  historyDeleteCancelCallback,
} from '../features/history/history.handler';
import {
  accountsHandler,
  addAccountCallback,
  manageAccountsCallback,
  viewAccountCallback,
  setDefaultAccountCallback,
  deleteAccountCallback,
  confirmDeleteAccountCallback,
  backToAccountsCallback,
} from '../features/accounts/accounts.handler';
import { voiceHandler } from '../features/transactions/voice.handler';
import { photoHandler } from '../features/transactions/photo.handler';
import {
  statsHandler,
  statsCloseCallback,
  statsPeriodMonthCallback,
  statsPeriodWeekCallback,
  statsPeriodDayCallback,
  statsPeriodAllCallback,
  statsNavigatePrevCallback,
  statsNavigateNextCallback,
} from '../features/stats/stats.handler';
import {
  showStatsSelection,
  statsSelectOverallCallback,
  statsSelectAccountCallback,
  statsChangeAccountCallback,
} from '../features/stats/stats.selection.handler';
import { handleMenuButton, closeMessageCallback } from '../features/menu/menu.handler';
import {
  showSettings,
  settingsChangeCurrencyCallback,
  settingsSetCurrencyCallback,
  settingsDefaultAccountCallback,
  settingsSetDefaultAccountCallback,
  backToSettingsCallback,
  settingsCloseCallback,
  settingsChangeTimezoneCallback,
  handleTimezoneTextInputInSettings,
  handleTimezoneGeolocationInSettings,
} from '../features/settings/settings.handler';

// New onboarding handlers
import {
  languageSelectionCallback,
  onboardingUnderstoodCallback,
  onboardingLetsTryCallback,
  onboardingSaveTutorialCallback,
  onboardingGotItCallback,
  onboardingStartAccountCallback,
  currencySelectionCallback,
  handleTimezoneGeolocation,
} from '../features/onboarding/onboarding.handler';

export class BotApp {
  private bot: Telegraf<BotContext>;
  private httpServer?: Server;

  constructor() {
    // Validate configuration
    config.validate();

    // Create bot instance
    this.bot = new Telegraf<BotContext>(config.botToken);


    // Setup handlers
    this.setupHandlers();

    // Setup error handling
    this.setupErrorHandling();
  }

  private setupHandlers() {
    const bot = this.bot;

    // =======================
    // Commands (ONLY /start)
    // =======================
    bot.command('start', async (ctx) => {
      await ctx.deleteMessage().catch(() => { });
      await startHandler(ctx);
    });
    bot.command('stats', async (ctx) => {
      await ctx.deleteMessage().catch(() => { });
      await showStatsSelection(ctx);
    });
    bot.command('settings', async (ctx) => {
      await ctx.deleteMessage().catch(() => { });
      await showSettings(ctx);
    });
    bot.command('history', async (ctx) => {
      await ctx.deleteMessage().catch(() => { });
      await historyHandler(ctx);
    });
    bot.command('accounts', async (ctx) => {
      await ctx.deleteMessage().catch(() => { });
      await accountsHandler(ctx);
    });

    // =======================
    // Callback query handlers
    // =======================

    // Close button (universal)
    bot.action('close_message', closeMessageCallback);

    // Onboarding callbacks
    bot.action(/^lang_(ru|uz)$/, languageSelectionCallback);
    bot.action('onb_understood', onboardingUnderstoodCallback);
    bot.action('onb_lets_try', onboardingLetsTryCallback);
    bot.action('onb_save_tutorial', onboardingSaveTutorialCallback);
    bot.action('onb_got_it', onboardingGotItCallback);
    bot.action('onb_start_account', onboardingStartAccountCallback);
    bot.action(/^onb_curr_(UZS|USD|EUR|RUB)$/, currencySelectionCallback);

    // Settings callbacks
    bot.action('settings_change_currency', settingsChangeCurrencyCallback);
    bot.action(/^settings_set_currency_(.+)$/, settingsSetCurrencyCallback);
    bot.action('settings_default_account', settingsDefaultAccountCallback);
    bot.action(/^settings_set_default_(.+)$/, settingsSetDefaultAccountCallback);
    bot.action('menu_settings', backToSettingsCallback);
    bot.action('settings_close', settingsCloseCallback);
    bot.action('settings_change_timezone', settingsChangeTimezoneCallback);

    // Stats callbacks
    bot.action('stats_close', statsCloseCallback);

    // Stats selection callbacks
    bot.action('stats_select_overall', statsSelectOverallCallback);
    bot.action(/^stats_select_account_(.+)$/, statsSelectAccountCallback);
    bot.action('stats_change_account', statsChangeAccountCallback);

    // Stats period callbacks (compact format: s_p{m|w|d|a}_{compactAccId})
    bot.action(/^s_pm_(.+)$/, statsPeriodMonthCallback); // s_pm_all or s_pm_8749ef70
    bot.action(/^s_pw_(.+)$/, statsPeriodWeekCallback); // s_pw_all or s_pw_8749ef70
    bot.action(/^s_pd_(.+)$/, statsPeriodDayCallback); // s_pd_all or s_pd_8749ef70
    bot.action(/^s_pa_(.+)$/, statsPeriodAllCallback); // s_pa_all or s_pa_8749ef70

    // Stats navigation callbacks (compact format: s_n{p|n}_{m|w|d}_{compactAccId}_{compactDate})
    bot.action(/^s_np_([mwd])_(.+)_(\d{8})$/, statsNavigatePrevCallback); // s_np_m_all_20251207
    bot.action(/^s_nn_([mwd])_(.+)_(\d{8})$/, statsNavigateNextCallback); // s_nn_m_all_20251207

    // Transaction callbacks
    bot.action('tx_confirm', confirmTransactionCallback);
    bot.action('tx_edit', editTransactionCallback);
    bot.action('tx_cancel', cancelTransactionCallback);
    bot.action('tx_edit_amount', editAmountCallback);
    bot.action('tx_edit_category', editCategoryCallback);
    bot.action('tx_edit_account', editAccountCallback);
    bot.action('tx_back', backToConfirmCallback);
    bot.action(/^tx_select_category_(.+)$/, selectCategoryCallback);
    bot.action(/^tx_select_subcategory_(.+)$/, selectSubcategoryCallback);
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
    bot.action(/^history_delete_ask_(.+)_(\d+)$/, historyDeleteAskCallback);
    bot.action(/^history_delete_confirm_(.+)_(\d+)$/, historyDeleteConfirmCallback);
    bot.action(/^history_delete_cancel_(\d+)$/, historyDeleteCancelCallback);

    // =======================
    // Message handlers
    // =======================

    bot.on('text', async (ctx) => {
      const userId = ctx.from.id;
      const text = ctx.message.text;

      // Check if it's a ReplyKeyboard button
      const isMenuButton = [
        '📊 Счета',
        '📊 Hisoblar',
        '➕ Добавить',
        '➕ Qo`shish',
        '📜 История',
        '📜 Tarix',
        '📈 Статистика',
        '📈 Statistika',
        '⚙️ Настройки',
        '⚙️ Sozlamalar',
      ].includes(text);

      if (isMenuButton) {
        await handleMenuButton(ctx, text);
        return;
      }

      // Handle state-based input
      const handled = await stateManager.handleState(userId, ctx);
      if (handled) return;

      // Check if user is in onboarding (but sent text instead of clicking button)
      const currentState = await stateManager.getState(userId);
      if (currentState && currentState.startsWith('ONBOARDING_')) {
        // Ignore text during onboarding if not handled by state handler
        await ctx.deleteMessage().catch(() => { });
        return;
      }

      await transactionHandler(ctx);
    });

    bot.on('voice', async (ctx) => {
      const userId = ctx.from.id;

      const handled = await stateManager.handleState(userId, ctx);
      if (handled) return;

      // Check if user is in onboarding
      const currentState = await stateManager.getState(userId);
      if (currentState && currentState.startsWith('ONBOARDING_')) {
        await ctx.deleteMessage().catch(() => { });
        return;
      }

      await voiceHandler(ctx);
    });

    bot.on('photo', async (ctx) => {
      const userId = ctx.from.id;

      const handled = await stateManager.handleState(userId, ctx);
      if (handled) return;

      // Check if user is in onboarding
      const currentState = await stateManager.getState(userId);
      if (currentState && currentState.startsWith('ONBOARDING_')) {
        await ctx.deleteMessage().catch(() => { });
        return;
      }

      await photoHandler(ctx);
    });

    bot.on('location', async (ctx) => {
      const userId = ctx.from.id;
      const currentState = await stateManager.getState(userId);

      // Handle geolocation for timezone selection in onboarding
      if (currentState === 'ONBOARDING_TIMEZONE') {
        const data = await stateManager.getData(userId);
        await handleTimezoneGeolocation(ctx, data);
        return;
      }

      // Handle geolocation for timezone selection in settings
      if (currentState === 'SETTINGS_TIMEZONE') {
        const data = await stateManager.getData(userId);
        await handleTimezoneGeolocationInSettings(ctx, data);
        return;
      }
    });
  }

  private setupErrorHandling() {
    this.bot.catch((err, ctx) => {
      console.error('Ошибка бота:', err);
      const lang = (ctx.from?.language_code || 'ru') as Language;
      ctx.reply(t('errors.critical', lang)).catch(() => { });
    });
  }

  public async start() {
    try {
      const { server } = await startServer(this.bot);
      this.httpServer = server;

      console.log('✅ Bot and server successfully started!');
      console.log(`📡 API Base URL: ${config.apiBaseUrl}`);
      console.log(`🌐 Server Mode: ${config.nodeEnv}`);

      this.setupGracefulShutdown();
    } catch (err) {
      console.error('❌ Failed to start bot and server:', err);
      process.exit(1);
    }
  }

  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully...`);

      try {
        // Stop the bot
        this.bot.stop(signal);

        // Close HTTP server
        if (this.httpServer) {
          await new Promise<void>((resolve, reject) => {
            this.httpServer!.close((err) => {
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
  }
}
