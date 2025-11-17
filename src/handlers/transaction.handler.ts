import { Markup } from "telegraf";
import { BotContext, ParsedTransaction } from "../types";
import { apiClient } from "../services/api.client";
import { stateManager } from "../state/state.manager";
import {
  formatAmount,
  getTransactionEmoji,
  getCategoryEmoji,
} from "../utils/format";

async function editMenu(data: any, ctx: any) {

  const parsed = data.parsedTransaction;  
  const user = await apiClient.getMe(ctx);
  const tgUserId = ctx.from.id;

  const currencyCode = user.currency_code || 'USD';

  const accounts = await apiClient.getAccounts(ctx);
  const account = accounts.find((a) => a.id === data.accountId);

  const categories = await apiClient.getCategories(ctx);
  const category = categories.find((c) => c.id === data.parsedTransaction?.category_id);

  
  const emoji = getTransactionEmoji(parsed.type);
  const categoryEmoji = category ? getCategoryEmoji(category.name) : "📌";
  const typeText = parsed.type === "income" ? "Доход" : "Расход";

  let message = `${emoji} Новая операция: ${typeText}\n\n`;
  message += `💰 Сумма: ${formatAmount(parsed.amount, currencyCode)}\n`;

  if (category) {
    message += `${categoryEmoji} Категория: ${category.name}\n`;
  }

  if (account) {
    message += `📊 Счёт: ${account.name}\n`;
  }

  if (parsed.note) {
    message += `📝 Комментарий: ${parsed.note}\n`;
  }

  if (parsed.confidence < 0.7) {
    message += `\n⚠️ Я не уверен в распознавании. Пожалуйста, проверьте данные.`;
  }

  return message;

}


export async function transactionHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;
  const text = ctx.text;

  let wait_messege;

  try {
    if (!text) {
      await ctx.reply("Введите корректную транзакцию.");
      return;
    }

    // Get user's accounts
    const accounts = await apiClient.getAccounts(ctx);

    if (accounts.length === 0) {
      await ctx.reply(
        "У вас ещё нет счетов. Используйте /start, чтобы создать первый."
      );
      return;
    }

    // Get default account
    const defaultAccount = accounts.find((a) => a.is_default) || accounts[0];

    // Parse the transaction using AI
    wait_messege = await ctx.reply("🤖 Анализирую...");

    const parsed = await apiClient.parseTransaction(
      ctx,
      text,
      ctx.from.language_code
    );
   const user = await apiClient.getMe(ctx);

    const currencyCode = user.currency_code || 'USD';

    // Get categories to find the category name
    const categories = await apiClient.getCategories(ctx);
    const category = categories.find((c) => c.id === parsed.category_id);

    // Build confirmation message
    const emoji = getTransactionEmoji(parsed.type);
    const categoryEmoji = category ? getCategoryEmoji(category.name) : "📌";
    const typeText = parsed.type === "income" ? "Доход" : "Расход";

    let message = `${emoji} Новая операция: ${typeText}\n\n`;
    message += `💰 Сумма: ${formatAmount(
      parsed.amount,
      currencyCode
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
      await ctx.reply("❌ Что-то пошло не так. Попробуйте начать с /start");
    }
  } finally {
    ctx.deleteMessage(wait_messege?.message_id)
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
    const accounts = await apiClient.getAccounts(ctx);
    const account = accounts.find((a) => a.id === data.accountId);

    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';

    if (!account) {
      await ctx.editMessageText("❌ Счёт не найден. Попробуйте снова.");
      stateManager.clearState(tgUserId);
      return;
    }

    const parsed = data.parsedTransaction;

    // Create the transaction
    const transaction = await apiClient.createTransaction(ctx, {
      account_id: data.accountId,
      category_id: parsed.category_id,
      type: parsed.type,
      amount: parsed.amount,
      currency_code: currencyCode,
      note: parsed.note,
      performed_at: parsed.performed_at,
    });

    // Get updated account balance
    const updatedAccounts = await apiClient.getAccounts(ctx);
    const updatedAccount = updatedAccounts.find((a) => a.id === data.accountId);

    const emoji = getTransactionEmoji(parsed.type);
    await ctx.editMessageText(
      `${emoji} Транзакция сохранена!\n\n` +
        `📊 Баланс ${account.name}: ${formatAmount(
          updatedAccount?.balance || 0,
          currencyCode
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

// Edit category callback
export async function editCategoryCallback(ctx: any) {
  const tgUserId = ctx.from.id;
  
  await ctx.answerCbQuery();

  try {
    // Get all categories
    const categories = await apiClient.getCategories(ctx);
    
    if (categories.length === 0) {
      await ctx.editMessageText("❌ Категории не найдены. Попробуйте снова.");
      return;
    }

    // Create inline keyboard with categories
    const buttons = categories.map((cat) => [
      Markup.button.callback(
        `${getCategoryEmoji(cat.name)} ${cat.name}`,
        `tx_select_category_${cat.id}`
      ),
    ]);

    buttons.push([Markup.button.callback("« Назад", "tx_back")]);

    await ctx.editMessageText(
      "📁 Выберите категорию:",
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error("Error loading categories:", error);
    await ctx.editMessageText("❌ Не удалось загрузить категории.");
  }
}

// Edit account callback
export async function editAccountCallback(ctx: any) {
  const tgUserId = ctx.from.id;
  
  await ctx.answerCbQuery();

  try {
    // Get all accounts
    const accounts = await apiClient.getAccounts(ctx);
    
    if (accounts.length === 0) {
      await ctx.editMessageText("❌ Счета не найдены. Попробуйте снова.");
      return;
    }

    // Create inline keyboard with accounts
    const buttons = accounts.map((acc) => [
      Markup.button.callback(
        `${acc.is_default ? "⭐ " : ""}${acc.name}`,
        `tx_select_account_${acc.id}`
      ),
    ]);

    buttons.push([Markup.button.callback("« Назад", "tx_back")]);

    console.log(buttons);
    

    await ctx.editMessageText(
      "📊 Выберите счёт:",
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error("Error loading accounts:", error);
    await ctx.editMessageText("❌ Не удалось загрузить счета.");
  }
}

// Back to confirmation callback
export async function backToConfirmCallback(ctx: any) {
  const tgUserId = ctx.from.id;
  const data = stateManager.getData(tgUserId);

  await ctx.answerCbQuery();

  if (!data.parsedTransaction || !data.accountId) {
    await ctx.editMessageText("❌ Данные транзакции устарели. Попробуйте снова.");
    stateManager.clearState(tgUserId);
    return;
  }

  try {
    const message = await editMenu(data, ctx)

    stateManager.setState(tgUserId, "WAIT_TRANSACTION_CONFIRM", data);

    await ctx.editMessageText(
      message,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Подтвердить", "tx_confirm"),
          Markup.button.callback("✏️ Редактировать", "tx_edit"),
        ],
        [Markup.button.callback("❌ Отмена", "tx_cancel")],
      ])
    );
  } catch (error) {
    console.error("Error going back to confirmation:", error);
    await ctx.editMessageText("❌ Произошла ошибка. Попробуйте снова.");
  }
}

// Select category callback
export async function selectCategoryCallback(ctx: any) {
  const tgUserId = ctx.from.id;
  const data = stateManager.getData(tgUserId);
  const categoryId = parseInt(ctx.match[1]);

  await ctx.answerCbQuery();

  if (!data.parsedTransaction) {
    await ctx.editMessageText("❌ Данные транзакции устарели. Попробуйте снова.");
    stateManager.clearState(tgUserId);
    return;
  }

  try {
    const categories = await apiClient.getCategories(ctx);
    const category = categories.find((c) => c.id === categoryId);

    if (!category) {
      await ctx.editMessageText("❌ Категория не найдена.");
      return;
    }
    // Update parsed transaction with new category
    data.parsedTransaction.category_id = categoryId;

    const message = await editMenu(data, ctx)

    stateManager.setState(tgUserId, "WAIT_TRANSACTION_CONFIRM", data);

    await ctx.editMessageText(
      `✅ Категория обновлена: ${getCategoryEmoji(category.name)} ${category.name}\n\n`+
      message,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Подтвердить", "tx_confirm"),
          Markup.button.callback("✏️ Редактировать ещё", "tx_edit"),
        ],
        [Markup.button.callback("❌ Отмена", "tx_cancel")],
      ])
    );
  } catch (error) {
    console.error("Error selecting category:", error);
    await ctx.editMessageText("❌ Произошла ошибка. Попробуйте снова.");
  }
}

// Select account callback
export async function selectAccountCallback(ctx: any) {
  const tgUserId = ctx.from.id;
  const data = stateManager.getData(tgUserId);
  const accountId = ctx.match[1];

  await ctx.answerCbQuery();

  if (!data.parsedTransaction) {
    await ctx.editMessageText("❌ Данные транзакции устарели. Попробуйте снова.");
    stateManager.clearState(tgUserId);
    return;
  }

  try {
    const accounts = await apiClient.getAccounts(ctx);
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      await ctx.editMessageText("❌ Счёт не найден.");
      return;
    }

   
    // Update account ID
    data.accountId = accountId;
    
    const message = await editMenu(data, ctx)

    stateManager.setState(tgUserId, "WAIT_TRANSACTION_CONFIRM", data);

    await ctx.editMessageText(
      `✅ Счёт обновлён: ${account.name}\n\n`+
      message,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Подтвердить", "tx_confirm"),
          Markup.button.callback("✏️ Редактировать ещё", "tx_edit"),
        ],
        [Markup.button.callback("❌ Отмена", "tx_cancel")],
      ])
    );
  } catch (error) {
    console.error("Error selecting account:", error);
    await ctx.editMessageText("❌ Произошла ошибка. Попробуйте снова.");
  }
}

// Handle amount edit
export async function editAmountHandler(ctx: any, data: any) {
  const amountText = ctx.message.text.trim();
  const amount = Number(amountText);

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("Введите корректное положительное число.");
    return;
  }

  try {
    const parsed = data.parsedTransaction;
    if (parsed) {
      parsed.amount = amount;
      stateManager.setState(ctx.from.id, "WAIT_TRANSACTION_CONFIRM", {
        ...data,
        parsedTransaction: parsed,
      });

      const message = await editMenu(data, ctx.from.id)

      // Get account for currency
      const user = await apiClient.getMe(ctx);
      const currencyCode = user.currency_code || 'USD';

      await ctx.reply(
        `✅ Сумма обновлена: ${formatAmount(amount, currencyCode)}\n\n` + message,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Подтвердить", "tx_confirm"),
            Markup.button.callback("✏️ Редактировать ещё", "tx_edit"),
          ],
          [Markup.button.callback("❌ Отмена", "tx_cancel")],
        ])
      );
    }
    
  } catch (error) {
    console.error("Error selecting account:", error);
    await ctx.editMessageText("❌ Произошла ошибка. Попробуйте снова.");
  }
}

// Register state handlers
stateManager.register("WAIT_TRANSACTION_EDIT_AMOUNT", editAmountHandler);
