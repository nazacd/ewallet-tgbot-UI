import { Markup } from "telegraf";
import { BotContext, ParsedTransaction } from "../types";
import { formatAmount, getCategoryEmoji, getTransactionEmoji } from "./format";

export function buildTransactionSummary({
  parsed,
  currencyCode,
  categoryName,
  accountName,
}: {
  parsed: ParsedTransaction;
  currencyCode: string;
  categoryName?: string;
  accountName?: string;
}): string {
  const emoji = getTransactionEmoji(parsed.type);
  const categoryEmoji = categoryName ? getCategoryEmoji(categoryName) : "📌";
  const typeText = parsed.type === "deposit" ? "Доход" : "Расход";

  let message = `${emoji} Новая операция: ${typeText}\n\n`;
  message += `💰 Сумма: ${formatAmount(parsed.amount, currencyCode)}\n`;

  if (categoryName) {
    message += `${categoryEmoji} Категория: ${categoryName}\n`;
  }

  if (accountName) {
    message += `📊 Счёт: ${accountName}\n`;
  }

  if (parsed.note) {
    message += `📝 Комментарий: ${parsed.note}\n`;
  }

  if (parsed.confidence < 0.7) {
    message += `\n⚠️ Я не уверен в распознавании. Пожалуйста, проверьте данные.`;
  }

  return message;
}

export async function updateOrReply(
  ctx: BotContext,
  text: string,
  extra?: any
) {
  const canEdit = Boolean(ctx.updateType === "callback_query" && ctx.editMessageText);

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
}: {
  allowFurtherEdits?: boolean;
}) {
  const editButton = Markup.button.callback(
    allowFurtherEdits ? "✏️ Редактировать" : "✏️ Редактировать ещё",
    "tx_edit"
  );

  return Markup.inlineKeyboard([
    [Markup.button.callback("✅ Подтвердить", "tx_confirm"), editButton],
    [Markup.button.callback("❌ Отмена", "tx_cancel")],
  ]);
}

export async function withProgressMessage<T>(
  ctx: BotContext,
  message: string,
  action: () => Promise<T>
): Promise<T> {
  const sent = await ctx.reply(message);

  try {
    return await action();
  } finally {
    if (sent?.message_id) {
      try {
        await ctx.deleteMessage(sent.message_id);
      } catch (error) {
        // Message might already be deleted or not editable; ignore.
      }
    }
  }
}

export const RETRY_HINT =
  "Попробуйте ещё раз или начните заново с /start, чтобы обновить данные.";
