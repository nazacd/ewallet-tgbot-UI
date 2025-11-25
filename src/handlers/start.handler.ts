import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { authService } from '../services/auth.service';
import { apiClient } from '../services/api.client';
import { stateManager } from '../state/state.manager';
import { RETRY_HINT } from '../utils/messages';

export async function startHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  try {
    // Authenticate user
    await authService.ensureToken(tgUserId, {
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
      username: ctx.from.username,
      language_code: ctx.from.language_code,
    });

    // Check if user has account
    const user = await apiClient.getMe(ctx);

    if (!user.currency_code) {
      // Start onboarding
      // await ctx.reply(
      //   '👋 Добро пожаловать в E-Wallet!\n\n' +
      //   'Давайте настроим ваш первый счёт. Это может быть кошелёк наличных, банковская карта или накопительный счёт.\n\n' +
      //   '📝 Как бы вы хотели назвать этот счёт?\n' +
      //   '(например, "Наличные", "Основная карта", "Сбережения")',
      //   Markup.removeKeyboard()
      // );

      await ctx.reply(
        '👋 Добро пожаловать в E-Wallet!\n\n'+
        `Какая валюта будет у ваших счетов?\n\n` +
        'Выберите из следующих вариантов:',
        Markup.inlineKeyboard([
          [
            Markup.button.callback('🇺🇿 UZS', 'currency_UZS'),
            Markup.button.callback('🇺🇸 USD', 'currency_USD'),
          ],
          [
            Markup.button.callback('🇪🇺 EUR', 'currency_EUR'),
            Markup.button.callback('🇷🇺 RUB', 'currency_RUB'),
          ],
        ])
      );

      await stateManager.setState(tgUserId, 'ONBOARDING_CURRENCY');
    } else {
      // User already set up
      const user = await apiClient.getMe(ctx);

      await ctx.reply(
        `С возвращением, ${ctx.from.first_name}! 👋\n\n` +
        'Отправьте мне транзакцию, например:\n' +
        '• "Кофе 5000"\n' +
        '• "Обед 25000"\n' +
        '• "Получил зарплату 5000000"\n\n' +
        'Или используйте команды:\n' +
        '/balance - Проверить балансы\n' +
        '/history - Последние транзакции\n' +
        '/stats - Статистика расходов\n' +
        '/accounts - Управление счетами\n' +
        '/help - Справка по командам',
        Markup.removeKeyboard()
      );

      await stateManager.clearState(tgUserId);
    }
  } catch (error: any) {
    console.error('Start handler error:', error);
    await ctx.reply(
      '❌ Извините, что-то пошло не так. Попробуйте позже.'
    );
  }
}

// Onboarding: Currency selection callback
export async function onboardingCurrencyCallback(ctx: any) {
  const currency = ctx.match[1]; // Extract currency code from callback data

  try {
    await apiClient.updateMe(ctx, {
      currency_code: currency
    })
  } catch (error) {
    await stateManager.clearState(ctx.from.id);
    return ctx.reply(`Что-то пошло не так. ${RETRY_HINT}`);
  }

  await ctx.answerCbQuery();
  await ctx.deleteMessage();

  await stateManager.setState(ctx.from.id, 'ONBOARDING_ACCOUNT_NAME', {
    onboardingData: { currency }
  });

  // await ctx.reply(
  //   `Готово! Валюта установлена: ${currency}.\n\n` +
  //   '💰 Какой текущий баланс на этом счёте?\n' +
  //   '(Введите число или отправьте 0, если начинаете с нуля)'
  // );

  await ctx.reply(
    `Готово! Валюта установлена: ${currency}.\n\n` +
    'Давайте настроим ваш первый счёт. Это может быть кошелёк наличных, банковская карта или накопительный счёт.\n\n' +
    '📝 Как бы вы хотели назвать этот счёт?\n' +
    '(например, "Наличные", "Основная карта", "Сбережения")',
    Markup.removeKeyboard()
  );
}

// Onboarding: Account name step
export async function onboardingAccountNameHandler(ctx: any, data: any) {
  const accountName = ctx.message.text.trim();

  if (!accountName || accountName.length > 50) {
    await ctx.reply('Введите корректное имя счёта (не более 50 символов).');
    return;
  }



  // Store the name and move to currency selection
  await stateManager.setState(ctx.from.id, 'ONBOARDING_BALANCE', {
    onboardingData: { name: accountName, currency: data.onboardingData.currency}
  });

  await ctx.reply(
    '💰 Какой текущий баланс на этом счёте?\n' +
    '(Введите число или отправьте 0, если начинаете с нуля)'
  );
}

// Onboarding: Balance step
export async function onboardingBalanceHandler(ctx: any, data: any) {
  const balanceText = ctx.message.text.trim();
  const balance = Number(balanceText);

  if (isNaN(balance) || balance < 0) {
    await ctx.reply('Введите корректное число (0 или больше).');
    return;
  }

  const tgUserId = ctx.from.id;
  const { name, currency } = data.onboardingData || {};

  if (!name) {
    await ctx.reply('Что-то пошло не так. Давайте начнём заново с /start');
    await stateManager.clearState(tgUserId);
    return;
  }

  try {
    // Create the account
    const account = await apiClient.createAccount(ctx, {
      name,
      balance,
      is_default: true,
    });

    await ctx.reply(
      `✅ Счёт успешно создан!\n\n` +
      `📊 ${account.name}\n` +
      `💰 Баланс: ${balance.toLocaleString()} ${currency}\n\n` +
      `Всё готово! Попробуйте добавить первую транзакцию:\n` +
      `• "Кофе 5000"\n` +
      `• "Ужин с друзьями 25000"\n` +
      `• "Получил зарплату 5000000"\n\n` +
      `Или отправьте голосовое сообщение! 🎤`
    );

    await stateManager.clearState(tgUserId);
  } catch (error: any) {
    console.error('Account creation error:', error);
    await ctx.reply(
      '❌ Не удалось создать счёт. Попробуйте снова с /start'
    );
    await stateManager.clearState(tgUserId);
  }
}

// Register state handlers
stateManager.register('ONBOARDING_ACCOUNT_NAME', onboardingAccountNameHandler);
stateManager.register('ONBOARDING_BALANCE', onboardingBalanceHandler);
