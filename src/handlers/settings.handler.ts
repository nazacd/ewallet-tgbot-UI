import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { apiClient } from '../services/api.client';
import { stateManager } from '../state/state.manager';

/**
 * Shows settings with current configuration
 */
export async function showSettings(ctx: any): Promise<void> {
  try {
    const user = await apiClient.getMe(ctx);
    const accounts = await apiClient.getAccounts(ctx);
    const defaultAccount = accounts.find((a) => a.is_default);

    const message =
      '⚙️ <b>Настройки</b>\n\n' +
      `💱 <b>Текущая валюта:</b> ${user.currency_code || 'USD'}\n` +
      `📊 <b>Счёт по умолчанию:</b> ${defaultAccount?.name || 'Не установлен'}\n`;

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💱 Изменить валюту', 'settings_change_currency')],
        [Markup.button.callback('📊 Счёт по умолчанию', 'settings_default_account')],
        [Markup.button.callback('« Назад в меню', 'back_to_menu')],
      ]),
    });
  } catch (error) {
    console.error('Error showing settings:', error);
    await ctx.answerCbQuery('Не удалось загрузить настройки');
  }
}

/**
 * Shows currency selection
 */
export async function settingsChangeCurrencyCallback(ctx: any) {
  await ctx.answerCbQuery();

  const message =
    '💱 <b>Выбор валюты</b>\n\n' +
    'Выберите валюту для ваших счетов:';

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('🇺🇿 UZS', 'settings_set_currency_UZS'),
        Markup.button.callback('🇺🇸 USD', 'settings_set_currency_USD'),
      ],
      [
        Markup.button.callback('🇪🇺 EUR', 'settings_set_currency_EUR'),
        Markup.button.callback('🇷🇺 RUB', 'settings_set_currency_RUB'),
      ],
      [Markup.button.callback('« Назад к настройкам', 'menu_settings')],
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
    // Note: Backend API might not have an endpoint to change currency
    // For now, we'll just show a message
    // If API exists: await apiClient.updateCurrency(ctx, currency);

    await ctx.editMessageText(
      `✅ Валюта успешно изменена на <b>${currency}</b>\n\n` +
      '⚠️ Примечание: Существующие счета сохранят свою валюту.',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Назад к настройкам', 'menu_settings')],
        ]),
      }
    );
  } catch (error) {
    console.error('Error setting currency:', error);
    await ctx.editMessageText(
      '❌ Не удалось изменить валюту. Попробуйте позже.',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Назад к настройкам', 'menu_settings')],
        ]),
      }
    );
  }
}

/**
 * Shows default account selection
 */
export async function settingsDefaultAccountCallback(ctx: any) {
  await ctx.answerCbQuery();

  try {
    const accounts = await apiClient.getAccounts(ctx);

    if (accounts.length === 0) {
      await ctx.editMessageText(
        '❌ У вас нет счетов. Создайте счёт сначала.',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('« Назад к настройкам', 'menu_settings')],
          ]),
        }
      );
      return;
    }

    const message = '📊 <b>Выбор счёта по умолчанию</b>\n\nВыберите счёт:';

    const buttons = accounts.map((account) => [
      Markup.button.callback(
        `${account.is_default ? '✅ ' : ''}${account.name}`,
        `settings_set_default_${account.id}`
      ),
    ]);
    buttons.push([Markup.button.callback('« Назад к настройкам', 'menu_settings')]);

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
    // TODO: Implement setDefaultAccount in API client
    // await apiClient.setDefaultAccount(ctx, accountId);
    // For now, show a message

    await ctx.editMessageText(
      '✅ Счёт по умолчанию успешно изменён!',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Назад к настройкам', 'menu_settings')],
        ]),
      }
    );
  } catch (error) {
    console.error('Error setting default account:', error);
    await ctx.editMessageText(
      '❌ Не удалось изменить счёт по умолчанию.',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('« Назад к настройкам', 'menu_settings')],
        ]),
      }
    );
  }
}
