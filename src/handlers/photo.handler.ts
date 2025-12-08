import { apiClient } from "../services/api.client";
import { stateManager } from "../state/state.manager";
import {
  RETRY_HINT,
  buildConfirmationKeyboard,
  buildTransactionSummary,
  withProgressMessage,
} from "../utils/messages";

export async function photoHandler(ctx: any) {
  const tgUserId = ctx.message.from.id;

  // Get the largest photo (best quality)
  const photos = ctx.message.photo;
  const photo = photos[photos.length - 1];

  const fileUrl = await ctx.telegram.getFileLink(photo.file_id);

  try {
    if (!fileUrl) {
      await ctx.reply("Отправьте корректное фото чека.");
      return;
    }

    const accounts = await apiClient.getAccounts(ctx);

    if (accounts.length === 0) {
      await ctx.reply("У вас ещё нет счетов. Используйте /start, чтобы создать первый.");
      return;
    }

    const defaultAccount = accounts.find((a) => a.is_default) || accounts[0];

    const parsed = await withProgressMessage(ctx, "📸 Анализирую чек...", () =>
      apiClient.parseImage(ctx, fileUrl.href)
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
    console.error("Receipt parse error:", error);

    if (error.response?.status === 400) {
      await ctx.reply(
        "🤔 Я не смог распознать чек на этом фото.\\n\\n" +
          "Попробуйте:\\n" +
          '• Сделать фото более чётким\\n' +
          '• Убедиться, что виден весь чек\\n' +
          '• Проверить освещение\\n\\n' +
          "Или используйте текст/голос для ввода транзакции."
      );
    } else {
      await ctx.reply(`❌ Что-то пошло не так. ${RETRY_HINT}`);
    }
  }
}
