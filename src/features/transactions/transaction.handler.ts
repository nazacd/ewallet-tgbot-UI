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
  buildConfirmationKeyboard,
  buildTransactionSummary,
  updateOrReply,
  withProgressMessage,
} from '../../shared/utils/messages';
import { t, Language } from '../../shared/utils/i18n';

async function buildConfirmationMessage(data: any, ctx: BotContext) {
  const parsed = data.parsedTransaction;
  const user = await apiClient.getMe(ctx);
  const currencyCode = user.currency_code || 'USD';
  const lang = (user.language_code || 'ru') as Language;

  const accounts = await apiClient.getAccounts(ctx);
  const account = accounts.find((a) => a.id === data.accountId);

  const categories = await apiClient.getCategories(ctx);
  const category = categories.find((c) => c.id === data.parsedTransaction?.category_id);

  const summary = buildTransactionSummary({
    parsed,
    currencyCode,
    categoryName: category?.name,
    accountName: account?.name,
    lang,
  });

  return { summary, keyboard: buildConfirmationKeyboard({ allowFurtherEdits: true, lang }) };
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
    const category = categories.find((c) => c.id === parsed.category_id);

    if (parsed.account_id) {
      selectedAccount = accounts.find((a) => a.id === parsed.account_id) || accounts[0];
      if (!selectedAccount) {
        await ctx.reply(t('transaction.account_not_found', lang));
        return;
      }
    }

    const message = buildTransactionSummary({
      parsed,
      currencyCode,
      categoryName: category?.name,
      accountName: selectedAccount.name,
      lang,
    });

    await stateManager.setState(user.tg_user_id, 'WAIT_TRANSACTION_CONFIRM', {
      parsedTransaction: parsed,
      accountId: selectedAccount.id,
    });

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...buildConfirmationKeyboard({ allowFurtherEdits: true, lang }),
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
      type: parsed.type,
      amount: parsed.amount,
      currency_code: parsed.currency || currencyCode,
      original_amount: parsed.original_amount,
      original_currency_code: parsed.original_currency,
      fx_rate: parsed.fx_rate,
      note: parsed.note,
      performed_at: parsed.performed_at,
    });

    // (если хочешь баланс – оставь как было)
    const updatedAccounts = await apiClient.getAccounts(ctx);
    const updatedAccount = updatedAccounts.find((a) => a.id === data.accountId);

    // подтягиваем категорию, чтобы вставить её в финальный текст
    const categories = await apiClient.getCategories(ctx);
    const category = categories.find((c) => c.id === parsed.category_id);

    const finalText = buildSavedTransactionMessage({
      transaction,
      currencyCode,
      accountName: account.name,
      categoryName: category?.name || '',
      categorySlug: category?.slug || '',
      accountBalance: updatedAccount?.balance,
      lang,
      timezone,
    });

    await updateOrReply(ctx, finalText, {
      parse_mode: 'HTML',
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
  categorySlug: string;
  accountBalance?: number;
  lang: Language;
  timezone?: string;
}) {
  const {
    transaction,
    currencyCode,
    accountName,
    categoryName,
    categorySlug,
    accountBalance,
    lang,
    timezone,
  } = options;
  const typeText =
    transaction.type === 'deposit'
      ? t('transaction.new_deposit', lang)
      : t('transaction.new_expense', lang);
  const categoryText = categoryName
    ? `${getCategoryEmoji(categorySlug)} ${escapeHtml(categoryName)}`
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

  return message;
}

// Edit transaction callback
export async function editTransactionCallback(ctx: any) {
  await ctx.answerCbQuery();

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  await updateOrReply(
    ctx,
    lang === 'ru' ? 'Что вы хотите изменить?' : "Nimani o'zgartirmoqchisiz?",
    Markup.inlineKeyboard([
      [Markup.button.callback(t('transaction.amount', lang), 'tx_edit_amount')],
      [Markup.button.callback(t('transaction.category', lang), 'tx_edit_category')],
      [Markup.button.callback(t('transaction.account', lang), 'tx_edit_account')],
      [Markup.button.callback(t('buttons.back', lang), 'tx_back')],
    ]),
  );
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

// Edit amount callback
export async function editAmountCallback(ctx: any) {
  await ctx.answerCbQuery();
  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  await updateOrReply(ctx, `${t('transaction.amount', lang)}:`);

  const currentData = await stateManager.getData(ctx.from.id);
  await stateManager.setState(ctx.from.id, 'WAIT_TRANSACTION_EDIT_AMOUNT', {
    ...currentData,
  });
}

// Edit category callback
export async function editCategoryCallback(ctx: any) {
  const tgUserId = ctx.from.id;

  await ctx.answerCbQuery();

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  try {
    // Get all categories
    const categories = await apiClient.getCategories(ctx);

    if (categories.length === 0) {
      await updateOrReply(ctx, t('transaction.category_not_found', lang));
      return;
    }

    // Create inline keyboard with categories
    const buttons = categories.map((cat) => [
      Markup.button.callback(
        `${getCategoryEmoji(cat.slug)} ${cat.name}`,
        `tx_select_category_${cat.id}`,
      ),
    ]);

    buttons.push([Markup.button.callback(`${t('buttons.back', lang)}`, 'tx_back')]);
    await updateOrReply(
      ctx,
      t('transaction.choose_category', lang),
      Markup.inlineKeyboard(buttons),
    );
  } catch (error) {
    console.error('Error loading categories:', error);
    await updateOrReply(ctx, t('transaction.category_not_found', lang));
  }
}

// Edit account callback
export async function editAccountCallback(ctx: any) {
  await ctx.answerCbQuery();

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  try {
    // Get all accounts
    const accounts = await apiClient.getAccounts(ctx);

    if (accounts === null || accounts === undefined || accounts.length === 0) {
      await updateOrReply(ctx, t('transaction.no_accounts_found', lang));
      return;
    }

    // Create inline keyboard with accounts
    const buttons = accounts.map((acc) => [
      Markup.button.callback(
        `${acc.is_default ? '⭐ ' : ''}${acc.name}`,
        `tx_select_account_${acc.id}`,
      ),
    ]);

    buttons.push([Markup.button.callback(`${t('buttons.back', lang)}`, 'tx_back')]);

    await updateOrReply(ctx, t('transaction.choose_account', lang), Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('Error loading accounts:', error);
    await updateOrReply(ctx, t('transaction.account_not_found', lang));
  }
}

// Back to confirmation callback
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

// Select category callback
export async function selectCategoryCallback(ctx: any) {
  await ctx.answerCbQuery();
  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;
  const data = await stateManager.getData(user.tg_user_id);
  const categoryId = parseInt(ctx.match[1]);

  if (!data.parsedTransaction) {
    await updateOrReply(ctx, t('transaction.outdated', lang));
    await stateManager.clearState(user.tg_user_id);
    return;
  }

  try {
    const categories = await apiClient.getCategories(ctx);
    const category = categories.find((c) => c.id === categoryId);

    if (!category) {
      await updateOrReply(ctx, t('transaction.category_not_found', lang));
      return;
    }
    // Update parsed transaction with new category
    data.parsedTransaction.category_id = categoryId;

    const { summary, keyboard } = await buildConfirmationMessage(data, ctx);

    await stateManager.setState(user.tg_user_id, 'WAIT_TRANSACTION_CONFIRM', data);

    await updateOrReply(ctx, summary, { parse_mode: 'HTML', ...keyboard });
  } catch (error) {
    console.error('Error selecting category:', error);
    await updateOrReply(ctx, t('errors.critical', lang));
  }
}

// Select account callback
export async function selectAccountCallback(ctx: any) {
  await ctx.answerCbQuery();
  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;
  const data = await stateManager.getData(user.tg_user_id);
  const accountId = ctx.match[1];

  if (!data.parsedTransaction) {
    await updateOrReply(ctx, t('transaction.outdated', lang));
    await stateManager.clearState(user.tg_user_id);
    return;
  }

  try {
    const accounts = await apiClient.getAccounts(ctx);
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      await updateOrReply(ctx, t('transaction.account_not_found', lang));
      return;
    }

    // Update account ID
    data.accountId = accountId;

    const { summary, keyboard } = await buildConfirmationMessage(data, ctx);

    await stateManager.setState(user.tg_user_id, 'WAIT_TRANSACTION_CONFIRM', data);

    await updateOrReply(ctx, summary, { parse_mode: 'HTML', ...keyboard });
  } catch (error) {
    console.error('Error selecting account:', error);
    await updateOrReply(ctx, t('errors.critical', lang));
  }
}

// Handle amount edit
export async function editAmountHandler(ctx: any, data: any) {
  const amountText = ctx.message.text.trim();
  const amount = Number(amountText);

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  if (isNaN(amount) || amount <= 0) {
    await updateOrReply(ctx, t('transaction.invalid_amount', lang));
    return;
  }

  try {
    const parsed = data.parsedTransaction;
    if (parsed) {
      parsed.amount = amount;
      await stateManager.setState(user.tg_user_id, 'WAIT_TRANSACTION_CONFIRM', {
        ...data,
        parsedTransaction: parsed,
      });

      const { summary, keyboard } = await buildConfirmationMessage(data, ctx);
      await updateOrReply(ctx, summary, { parse_mode: 'HTML', ...keyboard });
    }
  } catch (error) {
    console.error('Error selecting account:', error);
    await updateOrReply(ctx, t('errors.critical', lang));
  }
}

// Register state handlers
stateManager.register('WAIT_TRANSACTION_EDIT_AMOUNT', editAmountHandler);
