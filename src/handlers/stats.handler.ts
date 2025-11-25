import axios from 'axios';
import { BotContext } from '../types';
import { apiClient } from '../services/api.client';
import { formatAmount, getCategoryEmoji } from '../utils/format';

export async function statsHandler(ctx: BotContext) {
  try {
    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';

    // Get stats for the current month (default behavior of backend if no dates provided?
    // Actually backend might default to all time or require dates. Let's assume default is useful for now,
    // or we can pass start of month)
    const stats = await apiClient.getStats(ctx);

    if (stats.total_expense === 0) {
      await ctx.reply('📊 У вас пока нет расходов для статистики.');
      return;
    }

    // Prepare data for chart
    const labels = stats.by_category.map(c => c.category_name);
    const data = stats.by_category.map(c => c.total);
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
    ];

    const chartConfig = {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
        }],
      },
      options: {
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 14 },
              color: 'white' // Dark mode friendly
            }
          },
          title: {
            display: true,
            text: `Расходы: ${formatAmount(stats.total_expense, currencyCode)}`,
            font: { size: 18 },
            color: 'white'
          }
        }
      }
    };

    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&backgroundColor=transparent&width=500&height=300`;

    // Build text summary
    let message = `📊 <b>Статистика расходов</b>\n\n`;
    // Balance
    message += `💰 <b>Баланс</b>: ${formatAmount(stats.balance, currencyCode)}\n`;
    // Total Expense
    message += `📉 <b>Расходы</b>: ${formatAmount(stats.total_expense, currencyCode)}\n`;
    // Total Income
    message += `📈 <b>Доходы</b>: ${formatAmount(stats.total_income, currencyCode)}\n\n`;

    // Categories inside blockquote expandable use **>
    message += `<blockquote expandable>`
    stats.by_category.forEach(c => {
      message += `${getCategoryEmoji(c.category_slug)} ${c.category_name}: ${formatAmount(c.total, currencyCode)}\n`;
    });
    message += `</blockquote>`;

    // Send photo with caption
    await ctx.replyWithPhoto(chartUrl, { caption: message, parse_mode: 'HTML' });

  } catch (error) {
    console.error('Stats handler error:', error);
    await ctx.reply('❌ Не удалось получить статистику. Попробуйте позже.');
  }
}
