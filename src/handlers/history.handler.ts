import { BotContext, Transaction } from "../types";
import { apiClient } from "../services/api.client";
import {
  formatAmount,
  formatDate,
  getTransactionEmoji,
  getCategoryEmoji,
} from "../utils/format";

export async function historyHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  try {
    const transactions = await apiClient.getTransactions(ctx, {
      limit: 10,
    });

    if (transactions.items.length === 0) {
      await ctx.reply(
        "📜 Пока нет ни одной транзакции.\n\n" +
          "Добавьте первую, отправив сообщение вроде:\n" +
          '"Кофе 5000"'
      );
      return;
    }

    const categories = await apiClient.getCategories(ctx);
    const accounts = await apiClient.getAccounts(ctx);

    let message = "📜 Недавние транзакции:\n\n";

    // Group by date
    const grouped = groupByDate(transactions);

    Object.entries(grouped).forEach(([dateKey, txs]) => {
      message += `${dateKey}:\n`;

      txs.forEach((tx) => {
        const emoji = getTransactionEmoji(tx.type);
        const category = categories.find((c) => c.id === tx.category_id);
        const categoryEmoji = category ? getCategoryEmoji(category.name) : "";
        const account = accounts.find((a) => a.id === tx.account_id);

        const categoryText = category ? `(${category.name})` : "";
        const note = tx.note ? ` - ${tx.note}` : "";

        message += `${emoji} ${formatAmount(
          tx.amount,
          tx.currency_code
        )} ${categoryEmoji}${categoryText}${note}\n`;
      });

      message += "\n";
    });

    await ctx.reply(message);
  } catch (error: any) {
    console.error("History handler error:", error);
    await ctx.reply(
      "❌ Не удалось загрузить историю транзакций. Попробуйте снова."
    );
  }
}

function groupByDate(transactions: {
  items: Transaction[];
  pagination: { limit: number; offset: number; total: number };
}): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  const now = new Date();

  transactions.items.forEach((tx) => {
    const txDate = new Date(tx.created_at);
    const isToday = txDate.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = txDate.toDateString() === yesterday.toDateString();

    let key: string;
    if (isToday) {
      key = "Сегодня";
    } else if (isYesterday) {
      key = "Вчера";
    } else {
      key = txDate.toLocaleDateString("ru-RU", {
        month: "short",
        day: "numeric",
      });
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(tx);
  });

  return groups;
}
