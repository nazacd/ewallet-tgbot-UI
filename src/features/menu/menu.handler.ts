import { Markup } from 'telegraf';
import { BotContext } from '../../core/types';
import { t, Language } from '../../shared/utils/i18n';
import { apiClient } from '../../services/api.client';
import { config } from '../../core/config/env';

/**
 * Shows the main menu with ReplyKeyboard
 * @param ctx - Bot context
 * @param lang - User's language (or boolean for backwards compatibility)
 * @param forceNew - If true, always send a new message
 */
/**
 * Shows the main menu (list of commands)
 * @param ctx - Bot context
 * @param lang - User's language (or boolean for backwards compatibility)
 * @param forceNew - If true, always send a new message
 */
export async function showMainMenu(
  ctx: any,
  langOrNew?: any,
  deleteLast: boolean = true,
): Promise<void> {
  // Accept Language or boolean for backwards compatibility
  let lang: Language = 'ru';
  let forceNew = false;

  if (typeof langOrNew === 'string') {
    lang = langOrNew as Language;
    forceNew = false;
  } else if (typeof langOrNew === 'boolean') {
    forceNew = langOrNew;
    // Try to get user language
    try {
      const user = await apiClient.getMe(ctx);
      lang = (user.language_code as Language) || 'ru';
    } catch {
      lang = 'ru';
    }
  } else {
    // No param - get language from user
    try {
      const user = await apiClient.getMe(ctx);
      lang = (user.language_code as Language) || 'ru';
    } catch {
      lang = 'ru';
    }
  }

  const keyboard = buildReplyKeyboard(lang);

  const message = t('menu.main_prompt', lang);

  try {
    await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });
  } catch (error) {
    console.error('Error showing main menu:', error);
  }
}

/**
 * Builds the ReplyKeyboard for main menu
 */
export function buildReplyKeyboard(lang: Language) {
  return Markup.keyboard([
    [Markup.button.text(t('menu.accounts', lang)), Markup.button.webApp(t('menu.history', lang), `${config.miniAppUrl}/history`)],
    [Markup.button.webApp(t('menu.stats', lang), `${config.miniAppUrl}/stats`), Markup.button.text(t('menu.settings', lang))],
  ])
    .resize() // resize_keyboard: true
    .persistent(); // one_time_keyboard: false
}

/**
 * Get user's language from API
 */
async function getUserLanguage(ctx: any): Promise<Language> {
  try {
    const user = await apiClient.getMe(ctx);
    return (user.language_code as Language) || 'ru';
  } catch {
    return 'ru';
  }
}

/**
 * Handle text from ReplyKeyboard buttons
 */
export async function handleMenuButton(ctx: any, buttonText: string) {
  const lang = await getUserLanguage(ctx);

  // Delete user's message (ReplyKeyboard button text)
  await ctx.deleteMessage().catch(() => {});

  // Match button text to action
  const accountsTexts = [t('menu.accounts', 'ru'), t('menu.accounts', 'uz')];
  const transactionTexts = [t('menu.transaction', 'ru'), t('menu.transaction', 'uz')];
  const historyTexts = [t('menu.history', 'ru'), t('menu.history', 'uz')];
  const statsTexts = [t('menu.stats', 'ru'), t('menu.stats', 'uz')];
  const settingsTexts = [t('menu.settings', 'ru'), t('menu.settings', 'uz')];

  if (accountsTexts.includes(buttonText)) {
    const { accountsHandler } = await import('../accounts/accounts.handler');
    await accountsHandler(ctx);
  } else if (transactionTexts.includes(buttonText)) {
    await showAddTransactionHelp(ctx, lang);
  } else if (historyTexts.includes(buttonText)) {
    const { historyHandler } = await import('../history/history.handler');
    await historyHandler(ctx);
  } else if (statsTexts.includes(buttonText)) {
    const { showStatsSelection } = await import('../stats/stats.selection.handler');
    await showStatsSelection(ctx);
  } else if (settingsTexts.includes(buttonText)) {
    const { showSettings } = await import('../settings/settings.handler');
    await showSettings(ctx);
  }
}

/**
 * Show help for adding transaction
 */
async function showAddTransactionHelp(ctx: any, lang: Language) {
  const message = t('menu.add_transaction_help', lang);

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[buildCloseButton(lang)]]),
  });
}

/**
 * Build close button for inline keyboards
 */
export function buildCloseButton(lang: Language) {
  return Markup.button.callback(t('buttons.close', lang), 'close_message');
}

/**
 * Close button callback - deletes message (for onboarding compatibility)
 */
export async function closeMessageCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
}
