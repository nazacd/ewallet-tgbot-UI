import { Markup } from 'telegraf';
import { BotContext, Transaction } from '../../core/types';
import { apiClient } from '../../services/api.client';
import { stateManager } from '../../core/state/state.manager';
import {
  formatAmount,
  getTransactionEmoji,
  getCategoryEmoji,
  escapeHtml,
  formatDate,
  formatFxRate,
} from '../../shared/utils/format';
import {
  buildTransactionSummary,
  updateOrReply,
  withProgressMessage,
} from '../../shared/utils/messages';
import { t, Language } from '../../shared/utils/i18n';
import { config } from '../../core/config/env';

export async function buildConfirmationMessage(data: any, ctx: BotContext) {
  const parsed = data.parsedTransaction;
  const user = await apiClient.getMe(ctx);
  const currencyCode = user.currency_code || 'USD';
  const lang = (user.language_code || 'ru') as Language;

  const accounts = await apiClient.getAccounts(ctx);
  const account = accounts.find((a) => a.id === data.accountId);

  const categories = await apiClient.getCategories(ctx);
  const subcategories = await apiClient.getSubcategories(ctx);

  const category = categories.find((c) => c.id === data.parsedTransaction?.category_id);
  const subcategory = subcategories.find((s) => s.id === data.parsedTransaction?.subcategory_id);

  // If we have a subcategory, use its emoji. If not, use category emoji.
  const displayEmoji = subcategory?.emoji
    ? subcategory.emoji
    : (category?.emoji
      ? category.emoji
      : getCategoryEmoji(category?.emoji));

  const displayName = subcategory
    ? `${category?.name ? category.name + ' > ' : ''}${subcategory.name}`
    : category?.name;

  const summary = buildTransactionSummary({
    parsed,
    currencyCode,
    categoryName: displayName,
    categoryEmoji: displayEmoji,
    accountName: account?.name,
    lang,
    timezone: user.timezone,
  });

  // Encode data for WebApp
  const encodedData = encodeURIComponent(JSON.stringify(parsed));
  const webAppUrl = `${config.miniAppUrl}/transaction?data=${encodedData}`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(t('confirmation.confirm', lang), 'tx_confirm'),
      Markup.button.webApp(t('buttons.edit', lang), webAppUrl)
    ],
    [Markup.button.callback(t('confirmation.cancel', lang), 'tx_cancel')]
  ]);

  return { summary, keyboard };
}

export async function transactionHandler(ctx: BotContext) {
  let lang: Language = 'ru';

  try {
    const user = await apiClient.getMe(ctx);
    const text = ctx.text;
    const currencyCode = user.currency_code || 'USD';
    lang = (user.language_code || 'ru') as Language;

    if (!text) {
      await ctx.reply(t('transaction.parse_error', lang));
      return;
    }

    const accounts = await apiClient.getAccounts(ctx);
    if (accounts === undefined || accounts === null || accounts.length === 0) {
      // Clear any existing state and redirect to account onboarding
      await stateManager.clearState(user.tg_user_id);
      const { startAccountOnboarding } = await import('../onboarding/onboarding.handler');
      await startAccountOnboarding(ctx);
      return;
    }
    let selectedAccount = accounts.find((a) => a.is_default) || accounts[0];

    const parsed = await withProgressMessage(ctx, t('transaction.loading', lang), () =>
      apiClient.parseText(ctx, text),
    );

    const categories = await apiClient.getCategories(ctx);
    const subcategories = await apiClient.getSubcategories(ctx);

    // Logic: if parsed has subcategory_id, try to find it
    let category = categories.find((c) => c.id === parsed.category_id);
    let subcategory = subcategories.find((s) => s.id === parsed.subcategory_id);

    // If API returned a subcategory but no category_id, try to resolve category from subcategory
    if (subcategory && !category) {
      category = categories.find(c => c.id === subcategory?.category_id);
    }

    const data = {
      parsedTransaction: parsed,
      accountId: selectedAccount.id,
    };
    const { summary, keyboard } = await buildConfirmationMessage(data, ctx);

    const message = await ctx.reply(summary, {
      parse_mode: 'HTML',
      ...keyboard,
    });

    // Save message_id to state so we can edit it later via API callback
    await stateManager.setState(user.tg_user_id, 'WAIT_TRANSACTION_CONFIRM', {
      ...data,
      parsedTransactionMessage: {
        message_id: message.message_id,
      },
    });
  } catch (error: any) {
    console.error('Transaction parse error:', error);

    if (error.response?.status === 400) {
      await ctx.reply(`${t('transaction.parse_error', lang)}`);
    } else {
      await ctx.reply(`❌ ${t('errors.critical', lang)} ${t('errors.retry_hint', lang)}`);
    }
  }
}

// Confirm transaction callback
export async function confirmTransactionCallback(ctx: BotContext) {
  const tgUserId = ctx.from.id;
  const data = await stateManager.getData(tgUserId);

  await ctx.answerCbQuery();

  if (!data.parsedTransaction || !data.accountId) {
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;
    await updateOrReply(ctx, t('transaction.outdated', lang));
    await stateManager.clearState(tgUserId);
    return;
  }

  try {
    const accounts = await apiClient.getAccounts(ctx);
    const account = accounts.find((a) => a.id === data.accountId);

    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';
    const lang = (user.language_code || 'ru') as Language;
    const timezone = user.timezone;

    if (!account) {
      await updateOrReply(ctx, t('transaction.account_not_found', lang));
      await stateManager.clearState(tgUserId);
      return;
    }

    const parsed = data.parsedTransaction;

    // создаём транзакцию
    const transaction = await apiClient.createTransaction(ctx, {
      account_id: data.accountId,
      category_id: parsed.category_id,
      subcategory_id: parsed.subcategory_id,
      type: parsed.type,
      amount: parsed.amount,
      currency_code: parsed.currency || currencyCode,
      original_amount: parsed.original_amount,
      original_currency_code: parsed.original_currency,
      fx_rate: parsed.fx_rate,
      note: parsed.note,
      performed_at: parsed.performed_at,
    });

    // Check if this is a debt transaction (category_id = 26)
    const { checkDebtCategory, sendDebtDetectionMessage } = await import('../debts/debt.handler');
    if (checkDebtCategory(transaction.category_id)) {
      // Clear current state and trigger debt tracking flow
      await stateManager.clearState(tgUserId);
      await sendDebtDetectionMessage(ctx, transaction, lang);
      return;
    }

    // (если хочешь баланс – оставь как было)
    const updatedAccounts = await apiClient.getAccounts(ctx);
    const updatedAccount = updatedAccounts.find((a) => a.id === data.accountId);

    // подтягиваем категорию, чтобы вставить её в финальный текст
    const categories = await apiClient.getCategories(ctx);
    const subcategories = await apiClient.getSubcategories(ctx);

    const category = categories.find((c) => c.id === parsed.category_id);
    const subcategory = subcategories.find((s) => s.id === parsed.subcategory_id);

    const { message: finalText, keyboard } = buildSavedTransactionMessage({
      transaction,
      currencyCode,
      accountName: account.name,
      categoryName: subcategory ? subcategory.name : (category?.name || ''),
      emoji: subcategory?.emoji || category?.emoji,
      accountBalance: updatedAccount?.balance,
      lang,
      timezone,
    });

    await updateOrReply(ctx, finalText, {
      parse_mode: 'HTML',
      ...keyboard,
    });

    await stateManager.clearState(tgUserId);
  } catch (error: any) {
    console.error('Transaction creation error:', error);
    // We need to fetch user again or default to 'ru' if we can't
    const lang = 'ru';
    await updateOrReply(
      ctx,
      `${t('transaction.save_error', lang)} ${t('errors.retry_hint', lang)}`,
    );
    await stateManager.clearState(tgUserId);
  }
}

function buildSavedTransactionMessage(options: {
  transaction: Transaction;
  currencyCode: string;
  accountName: string;
  categoryName: string;
  emoji?: string;
  accountBalance?: number;
  lang: Language;
  timezone?: string;
}): { message: string; keyboard: any } {
  const {
    transaction,
    currencyCode,
    accountName,
    categoryName,
    emoji,
    accountBalance,
    lang,
    timezone,
  } = options;
  const typeText =
    transaction.type === 'deposit'
      ? t('transaction.new_deposit', lang)
      : t('transaction.new_expense', lang);

  const categoryText = categoryName
    ? `${getCategoryEmoji(emoji)} ${escapeHtml(categoryName)}`
    : `📌 ${t('transaction.category', lang)}`; // Fallback

  const locale = lang === 'uz' ? 'uz-UZ' : 'ru-RU';
  const dateStr = formatDate(transaction.created_at, { timezone, locale });

  const formattedAmount = formatAmount(transaction.amount, transaction.currency_code || 'USD');

  let message = '';
  message += `<b>${t('transaction.saved', lang)}</b>\n\n`;

  if (accountBalance !== undefined) {
    message += `💳 <b>${t('transaction.account_balance', lang)}:</b> ${formatAmount(accountBalance, currencyCode)}\n\n`;
  }
  message += '---\n';

  message += `\n${typeText}\n`;

  message += `💰 <b>${t('transaction.amount', lang)}:</b> ${formattedAmount}\n`;
  // ✅ If conversion exists, show original + rate
  const hasFx =
    transaction.original_amount !== undefined &&
    !!transaction.original_currency_code &&
    transaction.original_currency_code !== transaction.currency_code;

  if (hasFx) {
    message += `💱 <b>Original</b>: ${formatAmount(transaction.original_amount!, transaction.original_currency_code!)} ${transaction.original_currency_code}\n`;
    if (transaction.fx_rate) {
      message += `📈 <b>FX</b>: ${formatFxRate(transaction.fx_rate)} (${transaction.original_currency_code} → ${currencyCode})\n`;
    }
  }
  message += `📁 <b>${t('transaction.category', lang)}:</b> ${categoryText}\n`;
  message += `📊 <b>${t('transaction.account', lang)}:</b> ${accountName}\n`;
  message += `📅 <b>${t('transaction.date', lang)}:</b> ${dateStr}\n`;

  if (transaction.note) {
    message += `\n📝 <b>${t('transaction.note', lang)}:</b>\n`;
    message += `<code>${escapeHtml(transaction.note)}</code>\n`;
  }

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(t('transaction.delete', lang), `tx_delete_${transaction.id}`)]
  ]);

  return { message, keyboard };
}

function buildDeletedTransactionMessage(options: {
  transaction: Transaction;
  currencyCode: string;
  accountName: string;
  categoryName: string;
  emoji?: string;
  accountBalance?: number;
  lang: Language;
  timezone?: string;
}): string {
  const {
    transaction,
    currencyCode,
    accountName,
    categoryName,
    emoji,
    accountBalance,
    lang,
    timezone,
  } = options;
  const typeText =
    transaction.type === 'deposit'
      ? t('transaction.new_deposit', lang)
      : t('transaction.new_expense', lang);

  const categoryText = categoryName
    ? `${getCategoryEmoji(emoji)} ${escapeHtml(categoryName)}`
    : `📌 ${t('transaction.category', lang)}`; // Fallback

  const locale = lang === 'uz' ? 'uz-UZ' : 'ru-RU';
  const dateStr = formatDate(transaction.created_at, { timezone, locale });

  const formattedAmount = formatAmount(transaction.amount, transaction.currency_code || 'USD');

  let message = '';
  message += `<b>${t('transaction.deleted', lang)}</b>\n\n`;

  if (accountBalance !== undefined) {
    message += `💳 <b>${t('transaction.account_balance', lang)}:</b> ${formatAmount(accountBalance, currencyCode)}\n\n`;
  }
  message += '---\n';

  message += `\n${typeText}\n`;

  message += `💰 <b>${t('transaction.amount', lang)}:</b> ${formattedAmount}\n`;
  // ✅ If conversion exists, show original + rate
  const hasFx =
    transaction.original_amount !== undefined &&
    !!transaction.original_currency_code &&
    transaction.original_currency_code !== transaction.currency_code;

  if (hasFx) {
    message += `💱 <b>Original</b>: ${formatAmount(transaction.original_amount!, transaction.original_currency_code!)} ${transaction.original_currency_code}\n`;
    if (transaction.fx_rate) {
      message += `📈 <b>FX</b>: ${formatFxRate(transaction.fx_rate)} (${transaction.original_currency_code} → ${currencyCode})\n`;
    }
  }
  message += `📁 <b>${t('transaction.category', lang)}:</b> ${categoryText}\n`;
  message += `📊 <b>${t('transaction.account', lang)}:</b> ${accountName}\n`;
  message += `📅 <b>${t('transaction.date', lang)}:</b> ${dateStr}\n`;

  if (transaction.note) {
    message += `\n📝 <b>${t('transaction.note', lang)}:</b>\n`;
    message += `<code>${escapeHtml(transaction.note)}</code>\n`;
  }

  return message;
}

// Cancel transaction callback
export async function cancelTransactionCallback(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  // Update message addting a canceled text in the beginning of the message
  await ctx.editMessageText(`${t('transaction.canceled', lang)}\n\n${ctx.text}`, {
    parse_mode: 'HTML',
  });

  await stateManager.clearState(user.tg_user_id);
}

// Delete transaction callback
export async function deleteTransactionCallback(ctx: BotContext) {
  await ctx.answerCbQuery();

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;
  const currencyCode = user.currency_code || 'USD';
  const timezone = user.timezone;

  // Extract transaction ID from callback data (format: tx_delete_<id>)
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery || !('data' in callbackQuery)) {
    await updateOrReply(ctx, t('transaction.delete_error', lang));
    return;
  }

  const callbackData = callbackQuery.data;
  if (!callbackData || !callbackData.startsWith('tx_delete_')) {
    await updateOrReply(ctx, t('transaction.delete_error', lang));
    return;
  }

  const transactionId = callbackData.replace('tx_delete_', '');

  try {
    // Fetch transaction details before deletion
    const transaction = await apiClient.getTransaction(ctx, transactionId);

    // Fetch account details
    const accounts = await apiClient.getAccounts(ctx);
    const account = accounts.find((a) => a.id === transaction.account_id);

    if (!account) {
      await updateOrReply(ctx, t('transaction.account_not_found', lang));
      return;
    }

    // Delete the transaction
    await apiClient.deleteTransaction(ctx, transactionId);

    // Fetch updated account balance after deletion
    const updatedAccounts = await apiClient.getAccounts(ctx);
    const updatedAccount = updatedAccounts.find((a) => a.id === transaction.account_id);

    // Fetch categories to display in the message
    const categories = await apiClient.getCategories(ctx);
    const subcategories = await apiClient.getSubcategories(ctx);

    const category = categories.find((c) => c.id === transaction.category_id);
    const subcategory = subcategories.find((s) => s.id === transaction.subcategory_id);

    // Build the detailed message for deleted transaction
    const finalText = buildDeletedTransactionMessage({
      transaction,
      currencyCode,
      accountName: account.name,
      categoryName: subcategory ? subcategory.name : (category?.name || ''),
      emoji: subcategory?.emoji || category?.emoji,
      accountBalance: updatedAccount?.balance,
      lang,
      timezone,
    });

    await updateOrReply(ctx, finalText, {
      parse_mode: 'HTML',
    });
  } catch (error: any) {
    console.error('Transaction deletion error:', error);
    await updateOrReply(ctx, t('transaction.delete_error', lang));
  }
}

// Back to confirmation callback (still needed for WebApp editor back button)
export async function backToConfirmCallback(ctx: any) {
  await ctx.answerCbQuery();
  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;
  const data = await stateManager.getData(user.tg_user_id);

  if (!data.parsedTransaction || !data.accountId) {
    await updateOrReply(ctx, t('transaction.outdated', lang));
    await stateManager.clearState(user.tg_user_id);
    return;
  }

  try {
    const { summary, keyboard } = await buildConfirmationMessage(data, ctx);

    await stateManager.setState(user.tg_user_id, 'WAIT_TRANSACTION_CONFIRM', data);

    await updateOrReply(ctx, summary, { parse_mode: 'HTML', ...keyboard });
  } catch (error) {
    console.error('Error going back to confirmation:', error);
    await updateOrReply(ctx, t('errors.critical', lang));
  }
}
