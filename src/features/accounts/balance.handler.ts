import { BotContext } from '../../core/types';
import { apiClient } from '../../services/api.client';
import { formatAmount } from '../../shared/utils/format';

export async function balanceHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  try {
    const accounts = await apiClient.getAccounts(ctx);

    if (accounts.length === 0) {
      await ctx.reply('У вас ещё нет счетов. Используйте /start, чтобы создать первый.');
      return;
    }

    let message = '💰 Ваши балансы:\n\n';

    // Calculate total balance (all in same currency for now)
    let total = 0;
    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';

    accounts.forEach((account) => {
      const emoji = account.is_default ? '⭐️' : '💵';
      message += `${emoji} ${account.name}: ${formatAmount(account.balance, currencyCode)}\n`;
      total += account.balance;
    });

    if (accounts.length > 1) {
      message += `\n📊 Итого: ${formatAmount(total, currencyCode)}`;
    }

    await ctx.reply(message);
  } catch (error: any) {
    console.error('Balance handler error:', error);
    await ctx.reply('❌ Не удалось получить балансы. Попробуйте снова.');
  }
}
