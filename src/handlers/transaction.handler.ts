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
      await ctx.reply("Please enter a valid transaction.");
      return;
    }

    // Get user's accounts
    const accounts = await apiClient.getAccounts(tgUserId);

    if (accounts.length === 0) {
      await ctx.reply(
        "You don't have any accounts yet. Use /start to create one."
      );
      return;
    }

    // Get default account
    const defaultAccount = accounts.find((a) => a.is_default) || accounts[0];

    // Parse the transaction using AI
    await ctx.reply("🤖 Analyzing...");

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
    const typeText = parsed.type === "income" ? "Income" : "Expense";

    let message = `${emoji} New ${typeText}\n\n`;
    message += `💰 Amount: ${formatAmount(
      parsed.amount,
      defaultAccount.currency_code
    )}\n`;

    if (category) {
      message += `${categoryEmoji} Category: ${category.name}\n`;
    }

    message += `📊 Account: ${defaultAccount.name}\n`;

    if (parsed.note) {
      message += `📝 Note: ${parsed.note}\n`;
    }

    if (parsed.confidence < 0.7) {
      message += `\n⚠️ I'm not very confident about this parsing. Please review carefully.`;
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
          Markup.button.callback("✅ Confirm", "tx_confirm"),
          Markup.button.callback("✏️ Edit", "tx_edit"),
        ],
        [Markup.button.callback("❌ Cancel", "tx_cancel")],
      ])
    );
  } catch (error: any) {
    console.error("Transaction parse error:", error);

    if (error.response?.status === 400) {
      await ctx.reply(
        "🤔 I couldn't understand that transaction.\n\n" +
          "Try something like:\n" +
          '• "Coffee 5000"\n' +
          '• "Lunch 25000"\n' +
          '• "Got salary 5000000"\n\n' +
          "Or use /add for step-by-step entry."
      );
    } else {
      await ctx.reply("❌ Something went wrong. Please try again.");
    }
  }
}

// Confirm transaction callback
export async function confirmTransactionCallback(ctx: any) {
  const tgUserId = ctx.from.id;
  const data = stateManager.getData(tgUserId);

  await ctx.answerCbQuery();

  if (!data.parsedTransaction || !data.accountId) {
    await ctx.editMessageText("❌ Transaction data expired. Please try again.");
    stateManager.clearState(tgUserId);
    return;
  }

  try {
    // Get account to get currency
    const accounts = await apiClient.getAccounts(tgUserId);
    const account = accounts.find((a) => a.id === data.accountId);

    if (!account) {
      await ctx.editMessageText("❌ Account not found. Please try again.");
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
      `${emoji} Transaction saved!\n\n` +
        `📊 ${account.name} balance: ${formatAmount(
          updatedAccount?.balance || 0,
          account.currency_code
        )}`
    );

    stateManager.clearState(tgUserId);
  } catch (error: any) {
    console.error("Transaction creation error:", error);
    await ctx.editMessageText(
      "❌ Failed to save transaction. Please try again."
    );
    stateManager.clearState(tgUserId);
  }
}

// Edit transaction callback
export async function editTransactionCallback(ctx: any) {
  await ctx.answerCbQuery();

  await ctx.editMessageText(
    "What would you like to edit?",
    Markup.inlineKeyboard([
      [Markup.button.callback("💰 Amount", "tx_edit_amount")],
      [Markup.button.callback("📁 Category", "tx_edit_category")],
      [Markup.button.callback("📊 Account", "tx_edit_account")],
      [Markup.button.callback("« Back", "tx_back")],
    ])
  );
}

// Cancel transaction callback
export async function cancelTransactionCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.editMessageText("❌ Transaction cancelled.");
  stateManager.clearState(ctx.from.id);
}

// Edit amount callback
export async function editAmountCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.editMessageText("💰 Enter the new amount:");

  stateManager.setState(ctx.from.id, "WAIT_TRANSACTION_EDIT_AMOUNT", {
    ...stateManager.getData(ctx.from.id),
  });
}

// Handle amount edit
export async function editAmountHandler(ctx: any, data: any) {
  const amountText = ctx.message.text.trim();
  const amount = Number(amountText);

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("Please enter a valid positive number.");
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
      `✅ Amount updated to ${formatAmount(amount, account?.currency_code)}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Confirm", "tx_confirm"),
          Markup.button.callback("✏️ Edit More", "tx_edit"),
        ],
        [Markup.button.callback("❌ Cancel", "tx_cancel")],
      ])
    );
  }
}

// Register state handlers
stateManager.register("WAIT_TRANSACTION_EDIT_AMOUNT", editAmountHandler);
