import { Markup } from 'telegraf';
import { BotContext, Transaction } from "../types";
import { apiClient } from "../services/api.client";
import {
  formatAmount,
  getTransactionEmoji,
  getCategoryEmoji,
  escapeHtml,
  truncateLabel,
  formatCompactAmount,
} from "../utils/format";
import { stateManager } from '../state/state.manager';

const TRANSACTIONS_PER_PAGE = 5;

export async function historyHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  try {
    // Get transactions for current month by default
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await apiClient.getTransactions(ctx, {
      from: startOfMonth.toISOString(),
      limit: 50, // Get more for pagination
    });

    if (result.items.length === 0) {
      await ctx.reply(
        "📜 Пока нет ни одной транзакции.\\n\\n" +
          "Добавьте первую, отправив сообщение вроде:\\n" +
          '"Кофе 5000"',
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Calculate monthly totals
    let totalIncome = 0;
    let totalExpense = 0;
    result.items.forEach(tx => {
      if (tx.type === 'deposit') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }
    });

    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';

    // Store transactions in state for navigation
    await stateManager.setState(tgUserId, 'VIEW_HISTORY', {
      transactions: result.items,
      currentPage: 0,
    });

    await sendHistoryPage(ctx, result.items, 0, totalIncome, totalExpense, currencyCode);
  } catch (error: any) {
    console.error("History handler error:", error);
    await ctx.reply(
      "❌ Не удалось загрузить историю транзакций. Попробуйте снова.",
      { parse_mode: 'HTML' }
    );
  }
}

async function sendHistoryPage(
  ctx: any,
  allTransactions: Transaction[],
  page: number,
  totalIncome: number,
  totalExpense: number,
  currencyCode: string
) {
  const startIdx = page * TRANSACTIONS_PER_PAGE;
  const endIdx = startIdx + TRANSACTIONS_PER_PAGE;
  const pageTransactions = allTransactions.slice(startIdx, endIdx);

  const categories = await apiClient.getCategories(ctx);
  const accounts = await apiClient.getAccounts(ctx);

  const now = new Date();
  const monthFormatter = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
  const monthTitle = monthFormatter.format(now);
  // Заголовок + сводка
  let message = '';
  message += `<b>📊 История транзакций</b> - <i>${monthTitle}</i>\n\n`;

  message += `<b>Итоги за месяц</b>\n`;
  message += `➕ Доход: <b>${formatAmount(totalIncome, currencyCode)}</b>\n`;
  message += `➖ Расходы: <b>${formatAmount(totalExpense, currencyCode)}</b>\n\n`;

  // Если транзакций больше, чем на одну страницу – покажем инфо о странице
  const totalPages = Math.ceil(allTransactions.length / TRANSACTIONS_PER_PAGE);
  if (totalPages > 1) {
    message += `<i>Страница ${page + 1} из ${totalPages}</i>\n\n`;
  }

  // Группируем по дате
  const grouped = groupByDate(pageTransactions);
  let txNumber = startIdx + 1;

  for (const [dateKey, txs] of Object.entries(grouped)) {
    // Подзаголовок даты
    message += `<b>📅 ${dateKey}</b>\n`;

    // Табличка транзакций в моноширинном шрифте
    // Важно: внутри <code>/<pre> лучше не вкладывать другие теги
    message += '<blockquote expandable>';

  txs.forEach((tx) => {
      // Тип транзакции — компактные стрелочки
      const typeEmoji = tx.type === 'deposit' ? '🔺' : '🔻';

      const category = categories.find((c) => c.id === tx.category_id);
      const account = accounts.find((a) => a.id === tx.account_id);

      const categoryEmoji = category ? getCategoryEmoji(category.slug) : '📌';
      const rawCategoryName = category ? category.name : 'Прочее';
      const shortCategoryName = truncateLabel(rawCategoryName, 10);
      const categoryText = `${categoryEmoji} ${shortCategoryName}`;

      const rawAccountName = account ? account.name : 'Счёт';
      const shortAccountName = truncateLabel(rawAccountName, 10);
      const accountText = `📊 ${shortAccountName}`;

      // Номер в списке (2 знака, с ведущим нулём)
      const num = String(txNumber).padStart(2, '0');

      // Компактная сумма: 49 000 → 49K, 1 200 000 → 1.2M
      const compactAmount = formatCompactAmount(tx.amount);

      // Лаконичная строка: "01 🔻 🚌 Транспорт… · 📊 Основной… · 49K"
      const line =
        `${num} ${typeEmoji} ` +
        `${categoryText} · ` +
        `${accountText} · ` +
        `${compactAmount}`;

      message += line + '\n';
      txNumber++;
    });

    message += '</blockquote>\n';
  }

  // Хинт внизу
  message += '\n<i>Используйте кнопки ниже, чтобы листать историю.</i>';

  // Клавиатура для навигации
  const keyboard = buildHistoryKeyboard(
    startIdx,
    endIdx,
    allTransactions.length,
    page
  );

  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      ...keyboard,
    });
  } else {
    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...keyboard,
    });
  }
}


function buildHistoryKeyboard(startIdx: number, endIdx: number, total: number, currentPage: number) {
  const buttons = [];

  // Number buttons for current page transactions
  const numberRow = [];
  for (let i = startIdx; i < endIdx && i < total; i++) {
    numberRow.push(Markup.button.callback(`${i + 1}`, `history_view_${i}`));
  }
  if (numberRow.length > 0) {
    buttons.push(numberRow);
  }

  // Navigation buttons
  const navRow = [];
  if (currentPage > 0) {
    navRow.push(Markup.button.callback('◀️', `history_page_${currentPage - 1}`));
  }
  if (endIdx < total) {
    navRow.push(Markup.button.callback('▶️', `history_page_${currentPage + 1}`));
  }
  if (navRow.length > 0) {
    buttons.push(navRow);
  }

  // Back to menu button
  buttons.push([Markup.button.callback('« Назад в меню', 'back_to_menu')]);

  return Markup.inlineKeyboard(buttons);
}

function groupByDate(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  const now = new Date();

  transactions.forEach((tx) => {
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

// Pagination callback
export async function historyPageCallback(ctx: any) {
  const page = parseInt(ctx.match[1], 10);
  const userId = ctx.from.id;

  await ctx.answerCbQuery();

  const data = await stateManager.getData(userId);
  if (!data || !data.transactions) {
    await ctx.answerCbQuery('История устарела. Используйте /history');
    return;
  }

  // Calculate monthly totals from stored transactions
  let totalIncome = 0;
  let totalExpense = 0;
  data.transactions.forEach((tx: Transaction) => {
    if (tx.type === 'deposit') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }
  });

  const user = await apiClient.getMe(ctx);
  const currencyCode = user.currency_code || 'USD';

  // Update page in state
  await stateManager.updateData(userId, { currentPage: page });

  await sendHistoryPage(ctx, data.transactions, page, totalIncome, totalExpense, currencyCode);
}


// View transaction details callback
export async function historyViewCallback(ctx: any) {
  const txIndex = parseInt(ctx.match[1], 10);
  const userId = ctx.from.id;

  await ctx.answerCbQuery();

  const data = await stateManager.getData(userId);
  if (!data || !data.transactions) {
    await ctx.answerCbQuery('История устарела. Используйте /history');
    return;
  }

  const tx: Transaction | undefined = data.transactions[txIndex];
  if (!tx) {
    await ctx.answerCbQuery('Транзакция не найдена');
    return;
  }

  const categories = await apiClient.getCategories(ctx);
  const accounts = await apiClient.getAccounts(ctx);
  const category = categories.find((c) => c.id === tx.category_id);
  const account = accounts.find((a) => a.id === tx.account_id);

  const emoji = getTransactionEmoji(tx.type);
  const typeText = tx.type === 'deposit' ? 'Доход' : 'Расход';
  const categoryText = category
    ? `${getCategoryEmoji(category.slug)} ${escapeHtml(category.name)}`
    : '📌 Прочее';
  const accountName = account ? escapeHtml(account.name) : 'Неизвестно';

  const num = String(txIndex + 1).padStart(2, '0');

  const dateStr = new Date(tx.created_at).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedAmount = formatAmount(tx.amount, tx.currency_code || 'USD');

  let message = '';
  message += `<b>🔍 Детали транзакции #${num}</b>\n\n`;
  message += `${emoji} <b>Тип:</b> ${typeText}\n`;
  message += `💰 <b>Сумма:</b> ${formattedAmount}\n`;
  message += `📁 <b>Категория:</b> ${categoryText}\n`;
  message += `📊 <b>Счёт:</b> ${accountName}\n`;
  message += `📅 <b>Дата:</b> ${dateStr}\n`;

  if (tx.note) {
    message += `\n📝 <b>Комментарий:</b>\n`;
    message += `<code>${escapeHtml(tx.note)}</code>\n`;
  }

  message += `\n<i>Нажмите кнопку ниже, чтобы вернуться к истории.</i>`;

  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('« Назад к истории', `history_back_${data.currentPage || 0}`)],
    ]),
  });
}


// Back to history callback
export async function historyBackCallback(ctx: any) {
  const page = parseInt(ctx.match[1], 10);

  await ctx.answerCbQuery();

  // просто меняем match на оригинальном контексте и переиспользуем колбэк
  ctx.match = [ctx.match[0], page.toString()];

  await historyPageCallback(ctx);
}

