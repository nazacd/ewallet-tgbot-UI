import { Markup } from "telegraf";
import { BotContext, Transaction } from "../types";
import { apiClient } from "../services/api.client";
import { stateManager } from "../state/state.manager";
import {
  formatAmount,
  getTransactionEmoji,
  getCategoryEmoji,
  escapeHtml,
  formatDate,
} from "../utils/format";
import {
  RETRY_HINT,
  buildConfirmationKeyboard,
  buildTransactionSummary,
  updateOrReply,
  withProgressMessage,
} from "../utils/messages";

async function buildConfirmationMessage(data: any, ctx: BotContext) {
  const parsed = data.parsedTransaction;
  const user = await apiClient.getMe(ctx);
  const currencyCode = user.currency_code || "USD";

  const accounts = await apiClient.getAccounts(ctx);
  const account = accounts.find((a) => a.id === data.accountId);

  const categories = await apiClient.getCategories(ctx);
  const category = categories.find((c) => c.id === data.parsedTransaction?.category_id);

  const summary = buildTransactionSummary({
    parsed,
    currencyCode,
    categoryName: category?.name,
    accountName: account?.name,
  });

  return { summary, keyboard: buildConfirmationKeyboard({ allowFurtherEdits: true }) };
}


export async function transactionHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;
  const text = ctx.text;

  try {
    if (!text) {
      await ctx.reply("Введите корректную транзакцию.");
      return;
    }

    const accounts = await apiClient.getAccounts(ctx);

    if (accounts.length === 0) {
      await ctx.reply(
        "У вас ещё нет счетов. Используйте /start, чтобы создать первый."
      );
      return;
    }

    const defaultAccount = accounts.find((a) => a.is_default) || accounts[0];

    const parsed = await withProgressMessage(ctx, "🤖 Анализирую...", () =>
      apiClient.parseText(ctx, text)
    );

    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || "USD";

    const categories = await apiClient.getCategories(ctx);
    const category = categories.find((c) => c.id === parsed.category_id);

    const message = buildTransactionSummary({
      parsed,
      currencyCode,
      categoryName: category?.name,
      accountName: defaultAccount.name,
    });

    // Check if user is in tutorial mode
    const currentState = await stateManager.getState(tgUserId);
    const currentData = await stateManager.getData(tgUserId);
    const isTutorial = currentState === 'TUTORIAL_FIRST_TRANSACTION' || currentData.isTutorial;

    await stateManager.setState(tgUserId, "WAIT_TRANSACTION_CONFIRM", {
      parsedTransaction: parsed,
      accountId: defaultAccount.id,
      isTutorial: isTutorial, // Preserve tutorial flag
    });

    await ctx.reply(message, buildConfirmationKeyboard({ allowFurtherEdits: true }));
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
      await ctx.reply(
        `❌ Что-то пошло не так. ${RETRY_HINT}`
      );
    }
  }
}

// Confirm transaction callback
export async function confirmTransactionCallback(ctx: BotContext) {
  const tgUserId = ctx.from.id;
  const data = await stateManager.getData(tgUserId);

  await ctx.answerCbQuery();

  if (!data.parsedTransaction || !data.accountId) {
    await updateOrReply(ctx, "❌ Данные транзакции устарели. Попробуйте снова.");
    await stateManager.clearState(tgUserId);
    return;
  }

  try {
    const isTutorial = data.isTutorial === true;

    const accounts = await apiClient.getAccounts(ctx);
    const account = accounts.find((a) => a.id === data.accountId);

    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || "USD";

    if (!account) {
      await updateOrReply(ctx, "❌ Счёт не найден. Попробуйте снова.");
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
      currency_code: currencyCode,
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
      categoryName: category?.name || "",
      categorySlug: category?.slug || "",
      accountBalance: updatedAccount?.balance,
    });

    await updateOrReply(ctx, finalText, {
      parse_mode: 'HTML',
    });

    await stateManager.clearState(tgUserId);

    if (isTutorial) {
      const { tutorialTransactionHandler } = await import("./tutorial.handler");
      await tutorialTransactionHandler(ctx, data);
    }
  } catch (error: any) {
    console.error("Transaction creation error:", error);
    await updateOrReply(
      ctx,
      `❌ Не удалось сохранить транзакцию. ${RETRY_HINT}`
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
}) {
  const { transaction, currencyCode, accountName, categoryName, categorySlug, accountBalance } = options;
  const emoji = getTransactionEmoji(transaction.type);
  const typeText = transaction.type === 'deposit' ? 'Доход' : 'Расход';
  const categoryText = categoryName
    ? `${getCategoryEmoji(categorySlug)} ${escapeHtml(categoryName)}`
    : '📌 Прочее';

  const dateStr = formatDate(transaction.created_at)

  const formattedAmount = formatAmount(transaction.amount, transaction.currency_code || 'USD');

  let message = '';
  message += `<b>✅ Транзакция сохранена!</b>\n\n`;
  if (accountBalance !== undefined) {
    message += `💳 <b>Баланс:</b> ${formatAmount(accountBalance, currencyCode)}\n\n`;
  }
  message += '---\n';

  message += `\n${emoji} <b>Тип:</b> ${typeText}\n`;
  message += `💰 <b>Сумма:</b> ${formattedAmount} ${currencyCode}\n`;
  message += `📁 <b>Категория:</b> ${categoryText}\n`;
  message += `📊 <b>Счёт:</b> ${accountName}\n`;
  message += `📅 <b>Дата:</b> ${dateStr}\n`;

  if (transaction.note) {
    message += `\n📝 <b>Комментарий:</b>\n`;
    message += `<code>${escapeHtml(transaction.note)}</code>\n`;
  };

  message += `\n<i>Нажмите /start чтобы вернуться в главное меню</i>`;

  return message;
}



// Edit transaction callback
export async function editTransactionCallback(ctx: any) {
  await ctx.answerCbQuery();

  await updateOrReply(
    ctx,
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
export async function cancelTransactionCallback(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  await ctx.answerCbQuery('Отменено');
  await updateOrReply(ctx, '❌ Транзакция отменена.\n\n' + ctx.text);
  await stateManager.clearState(tgUserId);

  // Return to main menu - send as new message
  const { showMainMenu } = await import('./menu.handler');
  await showMainMenu(ctx, true, false); // forceNew = true, deleteLast = false
}


// Edit amount callback
export async function editAmountCallback(ctx: any) {
  await ctx.answerCbQuery();
  await updateOrReply(ctx, "💰 Введите новую сумму:");

  const currentData = await stateManager.getData(ctx.from.id);
  await stateManager.setState(ctx.from.id, "WAIT_TRANSACTION_EDIT_AMOUNT", {
    ...currentData,
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
      await updateOrReply(ctx, "❌ Категории не найдены. Попробуйте снова.");
      return;
    }

    // Create inline keyboard with categories
    const buttons = categories.map((cat) => [
      Markup.button.callback(
        `${getCategoryEmoji(cat.slug)} ${cat.name}`,
        `tx_select_category_${cat.id}`
      ),
    ]);

    buttons.push([Markup.button.callback("« Назад", "tx_back")]);

    await updateOrReply(
      ctx,
      "📁 Выберите категорию:",
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error("Error loading categories:", error);
    await updateOrReply(ctx, "❌ Не удалось загрузить категории.");
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
      await updateOrReply(ctx, "❌ Счета не найдены. Попробуйте снова.");
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

    await updateOrReply(
      ctx,
      "📊 Выберите счёт:",
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error("Error loading accounts:", error);
    await updateOrReply(ctx, "❌ Не удалось загрузить счета.");
  }
}

// Back to confirmation callback
export async function backToConfirmCallback(ctx: any) {
  const tgUserId = ctx.from.id;
  const data = await stateManager.getData(tgUserId);

  await ctx.answerCbQuery();

  if (!data.parsedTransaction || !data.accountId) {
    await updateOrReply(ctx, "❌ Данные транзакции устарели. Попробуйте снова.");
    await stateManager.clearState(tgUserId);
    return;
  }

  try {
    const { summary, keyboard } = await buildConfirmationMessage(data, ctx);

    await stateManager.setState(tgUserId, "WAIT_TRANSACTION_CONFIRM", data);

    await updateOrReply(ctx, summary, keyboard);
  } catch (error) {
    console.error("Error going back to confirmation:", error);
    await updateOrReply(ctx, "❌ Произошла ошибка. Попробуйте снова.");
  }
}

// Select category callback
export async function selectCategoryCallback(ctx: any) {
  const tgUserId = ctx.from.id;
  const data = await stateManager.getData(tgUserId);
  const categoryId = parseInt(ctx.match[1]);

  await ctx.answerCbQuery();

  if (!data.parsedTransaction) {
    await updateOrReply(ctx, "❌ Данные транзакции устарели. Попробуйте снова.");
    await stateManager.clearState(tgUserId);
    return;
  }

  try {
    const categories = await apiClient.getCategories(ctx);
    const category = categories.find((c) => c.id === categoryId);

    if (!category) {
      await updateOrReply(ctx, "❌ Категория не найдена.");
      return;
    }
    // Update parsed transaction with new category
    data.parsedTransaction.category_id = categoryId;

    const { summary, keyboard } = await buildConfirmationMessage(data, ctx);

    await stateManager.setState(tgUserId, "WAIT_TRANSACTION_CONFIRM", data);

    await updateOrReply(
      ctx,
      `✅ Категория обновлена: ${getCategoryEmoji(category.slug)} ${category.name}\n\n${summary}`,
      keyboard
    );
  } catch (error) {
    console.error("Error selecting category:", error);
    await updateOrReply(ctx, "❌ Произошла ошибка. Попробуйте снова.");
  }
}

// Select account callback
export async function selectAccountCallback(ctx: any) {
  const tgUserId = ctx.from.id;
  const data = await stateManager.getData(tgUserId);
  const accountId = ctx.match[1];

  await ctx.answerCbQuery();

  if (!data.parsedTransaction) {
    await updateOrReply(ctx, "❌ Данные транзакции устарели. Попробуйте снова.");
    await stateManager.clearState(tgUserId);
    return;
  }

  try {
    const accounts = await apiClient.getAccounts(ctx);
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      await updateOrReply(ctx, "❌ Счёт не найден.");
      return;
    }


    // Update account ID
    data.accountId = accountId;

    const { summary, keyboard } = await buildConfirmationMessage(data, ctx);

    await stateManager.setState(tgUserId, "WAIT_TRANSACTION_CONFIRM", data);

    await updateOrReply(
      ctx,
      `✅ Счёт обновлён: ${account.name}\n\n${summary}`,
      keyboard
    );
  } catch (error) {
    console.error("Error selecting account:", error);
    await updateOrReply(ctx, "❌ Произошла ошибка. Попробуйте снова.");
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
      await stateManager.setState(ctx.from.id, "WAIT_TRANSACTION_CONFIRM", {
        ...data,
        parsedTransaction: parsed,
      });

      const { summary, keyboard } = await buildConfirmationMessage(data, ctx);

      // Get account for currency
      const user = await apiClient.getMe(ctx);
      const currencyCode = user.currency_code || "USD";

      await ctx.reply(
        `✅ Сумма обновлена: ${formatAmount(amount, currencyCode)}\n\n${summary}`,
        keyboard
      );
    }

  } catch (error) {
    console.error("Error selecting account:", error);
    await updateOrReply(ctx, "❌ Произошла ошибка. Попробуйте снова.");
  }
}

// Register state handlers
stateManager.register("WAIT_TRANSACTION_EDIT_AMOUNT", editAmountHandler);
