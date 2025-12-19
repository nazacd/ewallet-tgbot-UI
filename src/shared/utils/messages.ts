import { Markup } from 'telegraf';
import { BotContext, ParsedTransaction } from '../../core/types';
import { formatAmount, getTransactionEmoji, escapeHtml, formatFxRate } from './format';
import { t, Language } from './i18n';


export function buildTransactionSummary({
  parsed,
  currencyCode,
  categoryName,
  categoryEmoji,
  accountName,
  lang,
}: {
  parsed: ParsedTransaction;
  currencyCode: string;
  categoryName?: string;
  categoryEmoji?: string;
  accountName?: string;
  lang: Language;
}): string {
  const displayEmoji = categoryEmoji || '📌';
  const typeText =
    parsed.type === 'deposit'
      ? t('transaction.new_deposit', lang)
      : t('transaction.new_expense', lang);

  // ✅ prefer parsed currency if it exists (this is the “final” currency shown/saved)
  const finalCurrency = parsed.currency || currencyCode;

  let message = `${typeText}\n\n`;

  // ✅ Show final amount
  message += `💰 <b>${t('transaction.amount', lang)}</b>: ${formatAmount(parsed.amount, finalCurrency)}\n`;

  // ✅ If conversion exists, show original + rate
  const hasFx =
    parsed.original_amount !== undefined &&
    !!parsed.original_currency &&
    parsed.original_currency !== finalCurrency;

  if (hasFx) {
    message += `💱 <b>Original</b>: ${formatAmount(parsed.original_amount!, parsed.original_currency!)} ${parsed.original_currency}\n`;
    if (parsed.fx_rate) {
      message += `📈 <b>FX</b>: ${formatFxRate(parsed.fx_rate)} (${parsed.original_currency} → ${finalCurrency})\n`;
    }
  }

  if (categoryName) {
    message += `${displayEmoji} <b>${t('transaction.category', lang)}</b>: ${escapeHtml(categoryName)}\n`;
  }

  if (accountName) {
    message += `📊 <b>${t('transaction.account', lang)}</b>: ${escapeHtml(accountName)}\n`;
  }

  if (parsed.note) {
    // ✅ avoid HTML injection
    message += `📝 <b>${t('transaction.note', lang)}</b>: ${escapeHtml(parsed.note)}\n`;
  }

  if (parsed.performed_at) {
    message += `📅 <b>${t('transaction.date', lang)}</b>: ${escapeHtml(parsed.performed_at)}\n`;
  }

  if (parsed.confidence < 0.7) {
    message += '\n' + t('transaction.confidence_warning', lang);
  }

  return message;
}

export async function updateOrReply(ctx: BotContext, text: string, extra?: any) {
  const canEdit = Boolean(ctx.updateType === 'callback_query' && ctx.editMessageText);

  if (canEdit) {
    try {
      return await ctx.editMessageText(text, extra);
    } catch (error) {
      // Message might be too old or already edited; fall back to a fresh reply.
    }
  }

  return ctx.reply(text, extra);
}

export function buildConfirmationKeyboard({
  allowFurtherEdits = true,
  lang,
}: {
  allowFurtherEdits?: boolean;
  lang: Language;
}) {
  const editButton = Markup.button.callback(
    allowFurtherEdits ? t('confirmation.edit', lang) : t('confirmation.edit_more', lang),
    'tx_edit',
  );

  return Markup.inlineKeyboard([
    [Markup.button.callback(t('confirmation.confirm', lang), 'tx_confirm'), editButton],
    [Markup.button.callback(t('confirmation.cancel', lang), 'tx_cancel')],
  ]);
}

export async function withProgressMessage<T>(
  ctx: BotContext,
  message: string,
  action: () => Promise<T>,
): Promise<T> {
  const { withAnimatedLoader } = await import('./loader');

  // Create frames by adding dots progressively
  const frames = [`${message}.`, `${message}..`, `${message}...`];

  return withAnimatedLoader(ctx, frames, action);
}


