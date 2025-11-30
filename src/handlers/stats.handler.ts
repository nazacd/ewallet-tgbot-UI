import axios from 'axios';
import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { apiClient } from '../services/api.client';
import { formatAmount, getCategoryEmoji } from '../utils/format';

export async function statsHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  try {
    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';

    const stats = await apiClient.getStats(ctx);

    if (!stats || !stats.by_category || stats.by_category.length === 0) {
      await ctx.reply(
        '📊 У вас пока нет транзакций для отображения статистики.\n\n' +
        'Добавьте несколько транзакций, чтобы увидеть красивые графики!'
      );
      return;
    }

    // Generate chart using QuickChart
    const labels = stats.by_category.map(c => c.category_name);
    const data = stats.by_category.map(c => Math.abs(c.total));

    const chartConfig = {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
          ],
        }],
      },
      options: {
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    };

    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

    // Build message
    let message = `<b>📊 Статистика расходов</b>\n\n`;
    message += `<blockquote>`;
    message += `💸 <b>Всего расходов:</b> ${formatAmount(stats.total_expense, currencyCode)}\n`;
    message += `💰 <b>Всего доходов:</b> ${formatAmount(stats.total_income, currencyCode)}\n`;
    message += `📊 <b>Баланс:</b> ${formatAmount(stats.balance, currencyCode)}\n\n`;
    message += `<b>По категориям:</b>\n`;
    stats.by_category.forEach(c => {
      message += `${getCategoryEmoji(c.category_slug)} ${c.category_name}: ${formatAmount(c.total, currencyCode)}\n`;
    });
    message += `</blockquote>`;

    // Send photo with caption and back button
    await ctx.replyWithPhoto(chartUrl, {
      caption: message,
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('« Назад в меню', 'stats_to_menu')],
      ]),
    });

  } catch (error) {
    console.error('Stats handler error:', error);
    await ctx.reply('❌ Не удалось получить статистику. Попробуйте позже.');
  }
}

// Callback to return to menu from stats
export async function statsToMenuCallback(ctx: any) {
  await ctx.answerCbQuery();
  // Delete stats message (has image) and show menu
  await ctx.deleteMessage().catch(() => {});

  const { showMainMenu } = await import('./menu.handler');
  await showMainMenu(ctx, false);
}
