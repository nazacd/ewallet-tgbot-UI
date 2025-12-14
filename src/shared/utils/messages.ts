import { Markup } from 'telegraf';
import { BotContext, ParsedTransaction } from '../../core/types';
import { formatAmount, getCategoryEmoji, getTransactionEmoji } from './format';
import { t, Language } from './i18n';

export function buildTransactionSummary({
  parsed,
  currencyCode,
  categoryName,
  categorySlug,
  accountName,
  lang,
}: {
  parsed: ParsedTransaction;
  currencyCode: string;
  categoryName?: string;
  categorySlug?: string;
  accountName?: string;
  lang: Language;
}): string {
  const emoji = getTransactionEmoji(parsed.type);
  const categoryEmoji = categorySlug ? getCategoryEmoji(categorySlug) : '📌';
  const typeText =
    parsed.type === 'deposit'
      ? t('transaction.new_deposit', lang)
      : t('transaction.new_expense', lang);

  let message = `${emoji} ${typeText}\n\n`;
  message += `💰 <b>${t('transaction.amount', lang)}</b>: ${formatAmount(parsed.amount, currencyCode)}\n`;

  if (categoryName) {
    message += `${categoryEmoji} <b>${t('transaction.category', lang)}</b>: ${categoryName}\n`;
  }

  if (accountName) {
    message += `📊 <b>${t('transaction.account', lang)}</b>: ${accountName}\n`;
  }

  if (parsed.note) {
    message += `📝 <b>${t('transaction.note', lang)}</b>: ${parsed.note}\n`;
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


