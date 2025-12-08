import { Markup } from 'telegraf';
import { BotContext } from '../types';

/**
 * Shows the main menu to the user
 * @param ctx - Bot context
 * @param forceNew - If true, always send a new message instead of editing
 */
export async function showMainMenu(ctx: any, forceNew: boolean = false, deleteLast: boolean = true): Promise<void> {
  const message =
    '🔥 <b>У нас тут обновления!</b>\n' +
    '1️⃣ <b>Фото чеков:</b> Камера, мотор, расход записан! 📸\n' +
    '2️⃣ <b>История:</b> Теперь листать её — одно удовольствие.\n' +
    '3️⃣ <b>Статистика:</b> Графики такие красивые, что хочется тратить больше (но не надо).\n\n' +
    '🏠 <b>Главное меню</b>\n\n' +
    'Выберите действие:';
  const keyboard = buildMenuKeyboard();

  try {
    // If we have a callback query and don't need to force new message - edit existing
    if (ctx.callbackQuery && !forceNew) {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        ...keyboard,
      });
    } else {
      // Delete old message if it exists and send new one
      if (ctx.callbackQuery && deleteLast) {
        await ctx.deleteMessage().catch(() => {});
      }
      await ctx.reply(message, {
        parse_mode: 'HTML',
        ...keyboard,
      });
    }
  } catch (error) {
    console.error('Error showing main menu:', error);
    // Fallback: try to send new message
    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...keyboard,
    }).catch(() => {});
  }
}

/**
 * Builds the main menu keyboard
 */
function buildMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📊 Счета', 'menu_accounts'),
    ],
    [
      Markup.button.callback('➕ Добавить транзакцию', 'menu_add_transaction'),
    ],
    [
      Markup.button.callback('📜 История', 'menu_history'),
    ],
    [
      Markup.button.callback('📈 Статистика', 'menu_stats'),
    ],
    [
      Markup.button.callback('⚙️ Настройки', 'menu_settings'),
    ],
  ]);
}

/**
 * Menu callback: Accounts
 */
export async function menuAccountsCallback(ctx: any) {
  await ctx.answerCbQuery();

  const { accountsHandler } = await import('./accounts.handler');
  await accountsHandler(ctx);
}

/**
 * Menu callback: Add Transaction
 */
export async function menuAddTransactionCallback(ctx: any) {
  await ctx.answerCbQuery();

  await ctx.editMessageText(
    '➕ <b>Добавить транзакцию</b>\n\n' +
    'Отправьте транзакцию текстом, голосовым сообщением или фото чека.\n\n' +
    '📝 Примеры:\n' +
    '• "Кофе 5000"\n' +
    '• "Ужин в ресторане 50000"\n' +
    '• "Получил зарплату 5000000"\n\n' +
    '🎤 Или отправьте голосовое сообщение!\n' +
    '📸 Или отправьте фото чека!',
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('« Назад в меню', 'back_to_menu')],
      ]),
    }
  );
}

/**
 * Menu callback: History
 */
export async function menuHistoryCallback(ctx: any) {
  await ctx.answerCbQuery();

  // Delete menu message and show history (history sends its own message)
  // await ctx.deleteMessage().catch(() => {});

  const { historyHandler } = await import('./history.handler');
  await historyHandler(ctx);
}

/**
 * Menu callback: Stats
 */
export async function menuStatsCallback(ctx: any) {
  await ctx.answerCbQuery();

  // Delete menu message and show stats selection
  await ctx.deleteMessage().catch(() => {});

  const { showStatsSelection } = await import('./stats.selection.handler');
  await showStatsSelection(ctx);
}

/**
 * Menu callback: Settings
 */
export async function menuSettingsCallback(ctx: any) {
  await ctx.answerCbQuery();

  const { showSettings } = await import('./settings.handler');
  await showSettings(ctx);
}

/**
 * Universal callback: Back to menu
 */
export async function backToMenuCallback(ctx: any) {
  await ctx.answerCbQuery('Возврат в меню');
  await showMainMenu(ctx, false);
}
