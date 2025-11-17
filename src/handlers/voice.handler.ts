import { Context, Markup } from "telegraf";
import { apiClient } from "../services/api.client";
import { stateManager } from "../state/state.manager";
import { formatAmount, getCategoryEmoji, getTransactionEmoji } from "../utils/format";
import { config } from "../config/env";
import { BotContext } from "../types";


export async function voiceHandler(ctx: any) {
    const tgUserId = ctx.message.from.id;

    
    // 2. Формируем URL
    const fileUrl = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    
  
    let wait_messege;
  
    try {
      if (!fileUrl) {
        await ctx.reply("Скажите корректную транзакцию.");
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


      console.log('Voice file URL:', fileUrl);
  
      const parsed = await apiClient.parseVoice(
        ctx,
        fileUrl
      );
      
      console.log(parsed);
      

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