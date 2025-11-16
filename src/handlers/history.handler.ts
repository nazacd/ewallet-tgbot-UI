import { BotContext } from '../types';
import { apiClient } from '../services/api.client';
import { formatAmount, formatDate, getTransactionEmoji, getCategoryEmoji } from '../utils/format';

export async function historyHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  try {
    const transactions = await apiClient.getTransactions(tgUserId, {
      limit: 10,
    });

    if (transactions.length === 0) {
      await ctx.reply(
        '📜 No transactions yet.\n\n' +
        'Add your first transaction by sending a message like:\n' +
        '"Coffee 5000"'
      );
      return;
    }

    const categories = await apiClient.getCategories(tgUserId);
    const accounts = await apiClient.getAccounts(tgUserId);

    let message = '📜 Recent Transactions:\n\n';

    // Group by date
    const grouped = groupByDate(transactions);

    Object.entries(grouped).forEach(([dateKey, txs]) => {
      message += `${dateKey}:\n`;
      
      txs.forEach(tx => {
        const emoji = getTransactionEmoji(tx.type);
        const category = categories.find(c => c.id === tx.category_id);
        const categoryEmoji = category ? getCategoryEmoji(category.name) : '';
        const account = accounts.find(a => a.id === tx.account_id);
        
        const categoryText = category ? `(${category.name})` : '';
        const note = tx.note ? ` - ${tx.note}` : '';
        
        message += `${emoji} ${formatAmount(tx.amount, tx.currency_code)} ${categoryEmoji}${categoryText}${note}\n`;
      });
      
      message += '\n';
    });

    await ctx.reply(message);
  } catch (error: any) {
    console.error('History handler error:', error);
    await ctx.reply('❌ Failed to fetch transaction history. Please try again.');
  }
}

function groupByDate(transactions: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  const now = new Date();
  
  transactions.forEach(tx => {
    const txDate = new Date(tx.created_at);
    const isToday = txDate.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = txDate.toDateString() === yesterday.toDateString();
    
    let key: string;
    if (isToday) {
      key = 'Today';
    } else if (isYesterday) {
      key = 'Yesterday';
    } else {
      key = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(tx);
  });
  
  return groups;
}
