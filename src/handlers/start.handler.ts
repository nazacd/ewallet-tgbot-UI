import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { authService } from '../services/auth.service';
import { apiClient } from '../services/api.client';
import { stateManager } from '../state/state.manager';
import { RETRY_HINT } from '../utils/messages';
import { createStepMessage, buildCancelButton } from '../utils/navigation';
import { tutorialStartHandler } from './tutorial.handler';

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

    // Get user info
    const user = await apiClient.getMe(ctx);

    // Check if user needs onboarding (no currency set)
    if (!user.currency_code) {
      // Start onboarding with welcome message
      await ctx.reply(
        '👋 Добро пожаловать в E-Wallet!\n\n' +
        '🤖 Я помогу вам управлять личными финансами:\n\n' +
        '✅ Добавляйте расходы и доходы естественным языком\n' +
        '✅ Отслеживайте баланс в реальном времени\n' +
        '✅ Смотрите статистику и аналитику\n' +
        '✅ Управляйте несколькими счетами\n\n' +
        '📝 Примеры команд:\n' +
        '• "Кофе 5000" - добавить расход\n' +
        '• "Получил зарплату 1000000" - доход\n' +
        '• Голосовое сообщение 🎤\n\n' +
        'Давайте начнем настройку!'
      );

      const message = createStepMessage(
        1, 4, 'Выбор валюты',
        'Какая валюта будет у ваших счетов?\n\n' +
        'Выберите из следующих вариантов:'
      );

      await ctx.reply(
        message,
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
      // Existing user - show main menu
      const { showMainMenu } = await import('./menu.handler');
      await showMainMenu(ctx, false);
    }
  } catch (error: any) {
    console.error('Start handler error:', error);
    await ctx.reply(
      `❌ Не удалось начать. ${RETRY_HINT}`
    );
  }
}

// Currency selection callback
export async function onboardingCurrencyCallback(ctx: any) {
  const currency = ctx.match[1]; // Extract currency from callback data
  const tgUserId = ctx.from.id;

  try {
    // Update user's currency
    await apiClient.updateMe(ctx, { currency_code: currency });

    await ctx.answerCbQuery();
    await ctx.deleteMessage();

    await stateManager.setState(tgUserId, 'ONBOARDING_ACCOUNT_NAME', {
      onboardingData: { currency },
      stepInfo: { current: 2, total: 4, name: 'Создание счета' }
    });

    const message = createStepMessage(
      2, 4, 'Создание первого счета',
      `✅ Валюта установлена: ${currency}\n\n` +
      'Теперь создадим ваш первый счёт. Это может быть:\n' +
      '💵 Кошелёк наличных\n' +
      '💳 Банковская карта\n' +
      '🏦 Накопительный счёт\n\n' +
      '📝 Как бы вы хотели назвать этот счёт?\n' +
      '(например: "Наличные", "Основная карта", "Сбережения")'
    );

    await ctx.reply(
      message,
      Markup.inlineKeyboard([
        [buildCancelButton('⏭ Пропустить создание счета')],
      ])
    );
  } catch (error: any) {
    console.error('Currency callback error:', error);
    await ctx.answerCbQuery('Ошибка при установке валюты');
    await ctx.reply(`❌ Не удалось установить валюту. ${RETRY_HINT}`);
  }
}

// Account name handler
export async function accountNameHandler(ctx: any, data: any) {
  const accountName = ctx.message.text.trim();

  if (!accountName || accountName.length > 50) {
    await ctx.reply('Название счёта должно быть от 1 до 50 символов.');
    return;
  }

  // Store the name and move to balance step
  await stateManager.setState(ctx.from.id, 'ONBOARDING_BALANCE', {
    onboardingData: { name: accountName, currency: data.onboardingData.currency},
    stepInfo: { current: 3, total: 4, name: 'Начальный баланс' }
  });

  const message = createStepMessage(
    3, 4, 'Начальный баланс',
    `✅ Отлично! Счёт \"${accountName}\" будет создан.\n\n` +
    '💰 Какой сейчас баланс на этом счёте?\n' +
    `(Введите число в ${data.onboardingData.currency}, или 0 если начинаете с нуля)`
  );

  await ctx.reply(message);
}

// Balance handler
export async function onboardingBalanceHandler(ctx: any, data: any) {
  const balanceText = ctx.message.text.trim();
  const balance = Number(balanceText);

  if (isNaN(balance) || balance < 0) {
    await ctx.reply('Введите корректное число (0 или больше).');
    return;
  }

  const tgUserId = ctx.from.id;
  const { name, currency } = data.onboardingData || {};

  if (!name || !currency) {
    await ctx.reply('Что-то пошло не так. Попробуйте снова с /start');
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

    const message = createStepMessage(
      4, 4, 'Настройка завершена!',
      `✅ Счёт успешно создан!\n\n` +
      `📊 ${account.name}\n` +
      `💰 Баланс: ${balance.toLocaleString()} ${currency}\n\n` +
      `🎉 Отличная работа! Теперь всё готово к использованию.`
    );

    await ctx.reply(
      message,
      Markup.inlineKeyboard([
        [Markup.button.callback('✨ Пройти обучение', 'start_tutorial')],
        [Markup.button.callback('🚀 Начать пользоваться', 'skip_tutorial')],
      ])
    );

    // Don't clear state yet - wait for tutorial decision
  } catch (error: any) {
    console.error('Account creation error:', error);
    await ctx.reply(
      `❌ Не удалось создать счёт. ${RETRY_HINT}`
    );
    await stateManager.clearState(tgUserId);
  }
}

// Register state handlers
stateManager.register('ONBOARDING_ACCOUNT_NAME', accountNameHandler);
stateManager.register('ONBOARDING_BALANCE', onboardingBalanceHandler);
