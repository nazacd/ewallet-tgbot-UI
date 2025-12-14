import { Markup } from 'telegraf';
import { BotContext } from '../../core/types';
import { apiClient } from '../../services/api.client';
import { stateManager } from '../../core/state/state.manager';
import { t, Language } from '../../shared/utils/i18n';

/**
 * Shows settings with current configuration
 */
export async function showSettings(ctx: any): Promise<void> {
  let lang: Language = 'ru';
  try {
    const user = await apiClient.getMe(ctx);
    lang = (user.language_code || 'ru') as Language;
    const accounts = await apiClient.getAccounts(ctx);
    const defaultAccount = accounts.find((a) => a.is_default);

    const message =
      `${t('settings.title', lang)}\n\n` +
      `${t('settings.current_currency', lang)}: ${user.currency_code || 'USD'}\n` +
      `${t('settings.default_account', lang)}: ${defaultAccount?.name || t('settings.not_set', lang)}\n`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t('settings.change_currency', lang), 'settings_change_currency')],
        [
          Markup.button.callback(
            t('settings.change_default_account', lang),
            'settings_default_account',
          ),
        ],
        [Markup.button.callback(t('buttons.close', lang), 'settings_close')],
      ]),
    });
  } catch (error) {
    console.error('Error showing settings:', error);
    await ctx.reply(t('errors.critical', lang));
  }
}

/**
 * Shows currency selection
 */
export async function settingsChangeCurrencyCallback(ctx: any) {
  await ctx.answerCbQuery();

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  const message = t('settings.choose_currency', lang);

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback(`🇺🇿 UZS (${t('currency.UZS', lang)})`, 'settings_set_currency_UZS'),
        Markup.button.callback(`🇺🇸 USD (${t('currency.USD', lang)})`, 'settings_set_currency_USD'),
      ],
      [
        Markup.button.callback(`🇪🇺 EUR (${t('currency.EUR', lang)})`, 'settings_set_currency_EUR'),
        Markup.button.callback(`🇷🇺 RUB (${t('currency.RUB', lang)})`, 'settings_set_currency_RUB'),
      ],
      [Markup.button.callback(t('settings.back_to_settings', lang), 'menu_settings')],
    ]),
  });
}

/**
 * Set currency callback
 */
export async function settingsSetCurrencyCallback(ctx: any) {
  const currency = ctx.match[1];
  await ctx.answerCbQuery(`Валюта изменена на ${currency}`);

  try {
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;
    // Note: Backend API might not have an endpoint to change currency
    // For now, we'll just show a message
    // If API exists: await apiClient.updateCurrency(ctx, currency);

    await ctx.editMessageText(t('settings.currency_changed', lang, [currency]), {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t('settings.back_to_settings', lang), 'menu_settings')],
      ]),
    });
  } catch (error) {
    console.error('Error setting currency:', error);
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;
    await ctx.editMessageText(t('settings.currency_change_error', lang), {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t('settings.back_to_settings', lang), 'menu_settings')],
      ]),
    });
  }
}

/**
 * Shows default account selection
 */
export async function settingsDefaultAccountCallback(ctx: any) {
  await ctx.answerCbQuery();

  try {
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;
    const accounts = await apiClient.getAccounts(ctx);

    if (accounts.length === 0) {
      await ctx.editMessageText(t('settings.no_accounts', lang), {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t('settings.back_to_settings', lang), 'menu_settings')],
        ]),
      });
      return;
    }

    const message = t('settings.choose_account', lang);

    const buttons = accounts.map((account) => [
      Markup.button.callback(
        `${account.is_default ? '✅ ' : ''}${account.name}`,
        `settings_set_default_${account.id}`,
      ),
    ]);
    buttons.push([Markup.button.callback(t('settings.back_to_settings', lang), 'menu_settings')]);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons),
    });
  } catch (error) {
    console.error('Error showing default account selection:', error);
    await ctx.answerCbQuery('Не удалось загрузить счета');
  }
}

/**
 * Set default account callback
 */
export async function settingsSetDefaultAccountCallback(ctx: any) {
  const accountId = ctx.match[1];
  await ctx.answerCbQuery('Счёт по умолчанию изменён');

  try {
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;
    // TODO: Implement setDefaultAccount in API client
    // await apiClient.setDefaultAccount(ctx, accountId);
    // For now, show a message

    await ctx.editMessageText(t('settings.account_changed', lang), {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t('settings.back_to_settings', lang), 'menu_settings')],
      ]),
    });
  } catch (error) {
    console.error('Error setting default account:', error);
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;
    await ctx.editMessageText(t('settings.account_change_error', lang), {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t('settings.back_to_settings', lang), 'menu_settings')],
      ]),
    });
  }
}

/**
 * Back to settings callback
 */
export async function backToSettingsCallback(ctx: any) {
  await ctx.answerCbQuery();

  let lang: Language = 'ru';
  try {
    const user = await apiClient.getMe(ctx);
    lang = (user.language_code || 'ru') as Language;
    const accounts = await apiClient.getAccounts(ctx);
    const defaultAccount = accounts.find((a) => a.is_default);

    const message =
      `${t('settings.title', lang)}\n\n` +
      `${t('settings.current_currency', lang)}: ${user.currency_code || 'USD'}\n` +
      `${t('settings.default_account', lang)}: ${defaultAccount?.name || t('settings.not_set', lang)}\n`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t('settings.change_currency', lang), 'settings_change_currency')],
        [
          Markup.button.callback(
            t('settings.change_default_account', lang),
            'settings_default_account',
          ),
        ],
        [Markup.button.callback(t('buttons.close', lang), 'settings_close')],
      ]),
    });
  } catch (error) {
    console.error('Error showing settings:', error);
    await ctx.reply(t('errors.critical', lang));
  }
}

/**
 * Close settings callback
 */
export async function settingsCloseCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
}
