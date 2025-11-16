import { Markup } from "telegraf";
import { BotContext, ParsedTransaction } from "../types";
import { apiClient } from "../services/api.client";
import { stateManager } from "../state/state.manager";
import {
  formatAmount,
  getTransactionEmoji,
  getCategoryEmoji,
} from "../utils/format";

export async function transactionHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;
  const text = ctx.text;

  try {
    if (!text) {
      await ctx.reply("Введите корректную транзакцию.");
      return;
    }

    // Get user's accounts
    const accounts = await apiClient.getAccounts(tgUserId);

    if (accounts.length === 0) {
      await ctx.reply(
        "У вас ещё нет счетов. Используйте /start, чтобы создать первый."
      );
      return;
    }

    // Get default account
    const defaultAccount = accounts.find((a) => a.is_default) || accounts[0];

    // Parse the transaction using AI
    await ctx.reply("🤖 Анализирую...");

    const parsed = await apiClient.parseTransaction(
      tgUserId,
      text,
      ctx.from.language_code
    );

    // Get categories to find the category name
    const categories = await apiClient.getCategories(tgUserId);
    const category = categories.find((c) => c.id === parsed.category_id);

    // Build confirmation message
    const emoji = getTransactionEmoji(parsed.type);
    const categoryEmoji = category ? getCategoryEmoji(category.name) : "📌";
    const typeText = parsed.type === "income" ? "Доход" : "Расход";

    let message = `${emoji} Новая операция: ${typeText}\n\n`;
    message += `💰 Сумма: ${formatAmount(
      parsed.amount,
      defaultAccount.currency_code
    )}\n`;

    if (category) {
      message += `${categoryEmoji} Категория: ${category.name}\n`;
    }

    message += `📊 Счёт: ${defaultAccount.name}\n`;

    if (parsed.note) {
      message += `📝 Комментарий: ${parsed.note}\n`;
    }

    if (parsed.confidence < 0.7) {
      message += `\n⚠️ Я не уверен в распознавании. Пожалуйста, проверьте данные.`;
    }

    // Store parsed data in state
    stateManager.setState(tgUserId, "WAIT_TRANSACTION_CONFIRM", {
      parsedTransaction: parsed,
      accountId: defaultAccount.id,
    });

    await ctx.reply(
      message,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Подтвердить", "tx_confirm"),
          Markup.button.callback("✏️ Редактировать", "tx_edit"),
        ],
        [Markup.button.callback("❌ Отмена", "tx_cancel")],
      ])
    );
  } catch (error: any) {
    console.error("Transaction parse error:", error);

    if (error.response?.status === 400) {
      await ctx.reply(
        "🤔 Я не смог понять эту транзакцию.\n\n" +
          "Попробуйте, например:\n" +
          '• "Кофе 5000"\n' +
          '• "Обед 25000"\n' +
          '• "Получил зарплату 5000000"\n\n' +
          "Или используйте /add для пошагового ввода."
      );
    } else {
      await ctx.reply("❌ Что-то пошло не так. Попробуйте снова.");
    }
  }
}

// Confirm transaction callback
export async function confirmTransactionCallback(ctx: any) {
  const tgUserId = ctx.from.id;
  const data = stateManager.getData(tgUserId);

  await ctx.answerCbQuery();

  if (!data.parsedTransaction || !data.accountId) {
    await ctx.editMessageText("❌ Данные транзакции устарели. Попробуйте снова.");
    stateManager.clearState(tgUserId);
    return;
  }

  try {
    // Get account to get currency
    const accounts = await apiClient.getAccounts(tgUserId);
    const account = accounts.find((a) => a.id === data.accountId);

    if (!account) {
      await ctx.editMessageText("❌ Счёт не найден. Попробуйте снова.");
      stateManager.clearState(tgUserId);
      return;
    }

    const parsed = data.parsedTransaction;

    // Create the transaction
    const transaction = await apiClient.createTransaction(tgUserId, {
      account_id: data.accountId,
      category_id: parsed.category_id,
      type: parsed.type,
      amount: parsed.amount,
      currency_code: account.currency_code,
      note: parsed.note,
      performed_at: parsed.performed_at,
    });

    // Get updated account balance
    const updatedAccounts = await apiClient.getAccounts(tgUserId);
    const updatedAccount = updatedAccounts.find((a) => a.id === data.accountId);

    const emoji = getTransactionEmoji(parsed.type);
    await ctx.editMessageText(
      `${emoji} Транзакция сохранена!\n\n` +
        `📊 Баланс ${account.name}: ${formatAmount(
          updatedAccount?.balance || 0,
          account.currency_code
        )}`
    );

    stateManager.clearState(tgUserId);
  } catch (error: any) {
    console.error("Transaction creation error:", error);
    await ctx.editMessageText(
      "❌ Не удалось сохранить транзакцию. Попробуйте снова."
    );
    stateManager.clearState(tgUserId);
  }
}

// Edit transaction callback
export async function editTransactionCallback(ctx: any) {
  await ctx.answerCbQuery();

  await ctx.editMessageText(
    "Что вы хотите изменить?",
    Markup.inlineKeyboard([
      [Markup.button.callback("💰 Сумму", "tx_edit_amount")],
      [Markup.button.callback("📁 Категорию", "tx_edit_category")],
      [Markup.button.callback("📊 Счёт", "tx_edit_account")],
      [Markup.button.callback("« Назад", "tx_back")],
    ])
  );
}

// Cancel transaction callback
export async function cancelTransactionCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.editMessageText("❌ Транзакция отменена.");
  stateManager.clearState(ctx.from.id);
}

// Edit amount callback
export async function editAmountCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.editMessageText("💰 Введите новую сумму:");

  stateManager.setState(ctx.from.id, "WAIT_TRANSACTION_EDIT_AMOUNT", {
    ...stateManager.getData(ctx.from.id),
  });
}

// Handle amount edit
export async function editAmountHandler(ctx: any, data: any) {
  const amountText = ctx.message.text.trim();
  const amount = Number(amountText);

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("Введите корректное положительное число.");
    return;
  }

  // Update parsed transaction with new amount
  const parsed = data.parsedTransaction;
  if (parsed) {
    parsed.amount = amount;
    stateManager.setState(ctx.from.id, "WAIT_TRANSACTION_CONFIRM", {
      ...data,
      parsedTransaction: parsed,
    });

    // Get account for currency
    const accounts = await apiClient.getAccounts(ctx.from.id);
    const account = accounts.find((a) => a.id === data.accountId);

    await ctx.reply(
      `✅ Сумма обновлена: ${formatAmount(amount, account?.currency_code)}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Подтвердить", "tx_confirm"),
          Markup.button.callback("✏️ Редактировать ещё", "tx_edit"),
        ],
        [Markup.button.callback("❌ Отмена", "tx_cancel")],
      ])
    );
  }
}

// Register state handlers
stateManager.register("WAIT_TRANSACTION_EDIT_AMOUNT", editAmountHandler);
