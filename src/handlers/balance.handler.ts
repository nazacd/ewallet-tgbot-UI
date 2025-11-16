import { BotContext } from '../types';
import { apiClient } from '../services/api.client';
import { formatAmount } from '../utils/format';

export async function balanceHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  try {
    const accounts = await apiClient.getAccounts(tgUserId);

    if (accounts.length === 0) {
      await ctx.reply(
        'You don\'t have any accounts yet. Use /start to create one.'
      );
      return;
    }

    let message = '💰 Your Balances:\n\n';

    // Calculate total balance (all in same currency for now)
    let total = 0;
    const currencyCode = accounts[0].currency_code;

    accounts.forEach(account => {
      const emoji = account.is_default ? '⭐️' : '💵';
      message += `${emoji} ${account.name}: ${formatAmount(account.balance, account.currency_code)}\n`;
      total += account.balance;
    });

    if (accounts.length > 1) {
      message += `\n📊 Total: ${formatAmount(total, currencyCode)}`;
    }

    await ctx.reply(message);
  } catch (error: any) {
    console.error('Balance handler error:', error);
    await ctx.reply('❌ Failed to fetch balances. Please try again.');
  }
}
