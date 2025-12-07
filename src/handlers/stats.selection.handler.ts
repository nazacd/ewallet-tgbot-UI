import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { apiClient } from '../services/api.client';
import { statsHandler } from './stats.handler';
import { withAnimatedLoader, STATS_FRAMES } from '../utils/loader';

/**
 * Shows the account selection screen before displaying statistics
 */
export async function showStatsSelection(ctx: BotContext) {
  try {
    const accounts = await apiClient.getAccounts(ctx);

    if (accounts.length === 0) {
      await ctx.reply(
        '❌ У вас ещё нет счетов. Используйте /start, чтобы создать первый.'
      );
      return;
    }

    // Build inline keyboard with account options
    const buttons = [
      [Markup.button.callback('📊 Общая статистика', 'stats_select_overall')],
    ];

    // Add button for each account
    accounts.forEach(account => {
      buttons.push([
        Markup.button.callback(
          `${account.is_default ? '⭐ ' : ''}${account.name}`,
          `stats_select_account_${account.id}`
        ),
      ]);
    });

    // Add back to menu button
    buttons.push([Markup.button.callback('« Назад в меню', 'back_to_menu')]);

    await ctx.reply(
      '<b>📊 Статистика</b>\n\n' +
      'Выберите счёт для просмотра статистики или посмотрите общую статистику по всем счетам:',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons),
      }
    );
  } catch (error) {
    console.error('Error showing stats selection:', error);
    await ctx.reply('❌ Не удалось загрузить список счетов. Попробуйте позже.');
  }
}

/**
 * Callback handler for selecting overall statistics
 */
export async function statsSelectOverallCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  // Show animated loader while fetching and generating stats
  await withAnimatedLoader(
    ctx,
    STATS_FRAMES,
    () => statsHandler(ctx, 'month', undefined)
  );
}

/**
 * Callback handler for selecting a specific account's statistics
 */
export async function statsSelectAccountCallback(ctx: any) {
  const accountId = ctx.match[1];

  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  // Show animated loader while fetching and generating stats
  await withAnimatedLoader(
    ctx,
    STATS_FRAMES,
    () => statsHandler(ctx, 'month', accountId)
  );
}

/**
 * Callback handler to return to stats selection screen
 */
export async function statsChangeAccountCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  await showStatsSelection(ctx);
}
