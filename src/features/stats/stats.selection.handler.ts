import { Markup } from 'telegraf';
import { BotContext } from '../../core/types';
import { apiClient } from '../../services/api.client';
import { statsHandler } from './stats.handler';
import { withAnimatedLoader, STATS_FRAMES } from '../../shared/utils/loader';
import { buildCloseButton } from '../menu/menu.handler';
import { Language, t } from '../../shared/utils/i18n';

/**
 * Shows the account selection screen before displaying statistics
 */
export async function showStatsSelection(ctx: BotContext) {
  try {
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code as Language) || 'ru';
    const accounts = await apiClient.getAccounts(ctx);

    if (accounts.length === 0) {
      await ctx.reply(
        t('stats.selection.no_accounts', lang),
        Markup.inlineKeyboard([[buildCloseButton(lang)]]),
      );
      return;
    }

    // Build inline keyboard with account options
    const buttons = [[Markup.button.callback(t('stats.selection.overall', lang), 'stats_select_overall')]];

    // Add button for each account
    accounts.forEach((account) => {
      buttons.push([
        Markup.button.callback(
          `${account.is_default ? '⭐ ' : ''}${account.name}`,
          `stats_select_account_${account.id}`,
        ),
      ]);
    });

    // Add close button instead of back to menu
    buttons.push([buildCloseButton(lang)]);

    await ctx.reply(
      t('stats.selection.message', lang),
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons),
      },
    );
  } catch (error) {
    console.error('Error showing stats selection:', error);
    await ctx.reply(t('stats.selection.error', 'ru'));
  }
}

/**
 * Callback handler for selecting overall statistics
 */
export async function statsSelectOverallCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  // Show animated loader while fetching and generating stats
  await withAnimatedLoader(ctx, STATS_FRAMES, () => statsHandler(ctx, 'month', undefined));
}

/**
 * Callback handler for selecting a specific account's statistics
 */
export async function statsSelectAccountCallback(ctx: any) {
  const accountId = ctx.match[1];

  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  // Show animated loader while fetching and generating stats
  await withAnimatedLoader(ctx, STATS_FRAMES, () => statsHandler(ctx, 'month', accountId));
}

/**
 * Callback handler to return to stats selection screen
 */
export async function statsChangeAccountCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});
  await showStatsSelection(ctx);
}
