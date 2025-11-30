import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { stateManager } from '../state/state.manager';
import { createStepMessage, getContextualHint, buildCancelButton } from '../utils/navigation';

/**
 * Starts the interactive tutorial for new users
 */
export async function tutorialStartHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  try {
    await ctx.reply(
      '🎓 Давайте я покажу как пользоваться ботом!\n\n' +
      'Это займет всего минуту. Вы научитесь:\n' +
      '✅ Добавлять транзакции\n' +
      '✅ Просматривать баланс\n' +
      '✅ Смотреть статистику\n\n' +
      'Готовы начать?',
      Markup.inlineKeyboard([
        [Markup.button.callback('✨ Начать обучение', 'tutorial_begin')],
        [Markup.button.callback('⏭ Пропустить', 'tutorial_skip')],
      ])
    );

    await stateManager.setState(tgUserId, 'TUTORIAL_WELCOME', {
      tutorialStep: 0,
    });
  } catch (error) {
    console.error('Tutorial start error:', error);
    await ctx.reply('❌ Не удалось начать обучение. Используйте /help для справки.');
  }
}

/**
 * Begin tutorial callback
 */
export async function tutorialBeginCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.deleteMessage();

  const message = createStepMessage(
    1, 3, 'Добавление транзакции',
    '💡 Самое главное - добавлять транзакции очень просто!\n\n' +
    'Просто отправьте сообщение в свободной форме:\n\n' +
    '📝 Примеры:\n' +
    '• "Кофе 5000"\n' +
    '• "Ужин с друзьями 35000"\n' +
    '• "Получил зарплату 5000000"\n\n' +
    '🤖 Я автоматически распознаю сумму, категорию и тип операции!\n\n' +
    '✨ Попробуйте прямо сейчас - отправьте "Кофе 5000"'
  );

  await ctx.reply(message, Markup.inlineKeyboard([
    [buildCancelButton('⏭ Пропустить обучение')],
  ]));

  await stateManager.setState(ctx.from.id, 'TUTORIAL_FIRST_TRANSACTION', {
    tutorialStep: 1,
    isTutorial: true, // Mark that user is in tutorial mode
  });
}

/**
 * Skip tutorial callback
 */
export async function tutorialSkipCallback(ctx: any) {
  await ctx.answerCbQuery('Обучение пропущено');
  await ctx.deleteMessage();

  await tutorialCompleteHandler(ctx, true);
}

/**
 * Handle first tutorial transaction
 */
export async function tutorialTransactionHandler(ctx: any, data: any) {
  const tgUserId = ctx.from.id;

  // This would be called from the transaction handler
  // when user is in TUTORIAL_FIRST_TRANSACTION state

  const message = createStepMessage(
    2, 3, 'Отлично!',
    '🎉 Вы успешно создали транзакцию!\n\n' +
    '💡 После создания транзакции вы всегда можете:\n' +
    '• Отредактировать сумму\n' +
    '• Изменить категорию\n' +
    '• Выбрать другой счёт\n\n' +
    'Далее посмотрите доступные команды:'
  );

  await ctx.reply(message, Markup.inlineKeyboard([
    [Markup.button.callback('➡️ Продолжить', 'tutorial_commands')],
  ]));

  await stateManager.setState(tgUserId, 'TUTORIAL_COMPLETE', {
    tutorialStep: 2,
  });
}

/**
 * Show commands step
 */
export async function tutorialCommandsCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.deleteMessage();

  const message = createStepMessage(
    3, 3, 'Основные команды',
    '📚 Вот основные команды бота:\n\n' +
    '/balance - Посмотреть все балансы\n' +
    '/history - История транзакций\n' +
    '/stats - Статистика расходов\n' +
    '/accounts - Управление счетами\n' +
    '/cancel - Отменить текущее действие\n' +
    '/help - Справка\n\n' +
    '✅ Обучение завершено! Теперь вы готовы пользоваться ботом.'
  );

  await ctx.reply(message, Markup.inlineKeyboard([
    [Markup.button.callback('🎯 Завершить обучение', 'tutorial_finish')],
  ]));
}

/**
 * Complete tutorial
 */
export async function tutorialCompleteHandler(ctx: any, skipped: boolean = false) {
  await stateManager.clearState(ctx.from.id);

  if (skipped) {
    await ctx.reply(
      '👍 Вы можете начать обучение в любое время, отправив /start\n\n' +
      'Или просто начните пользоваться ботом!\n' +
      'Отправьте транзакцию, например: "Кофе 5000"' +
      getContextualHint('account_created')
    );
  } else {
    await ctx.reply(
      '🎉 Поздравляю! Вы прошли обучение.\n\n' +
      '🚀 Теперь можете:\n' +
      '• Добавлять транзакции просто отправляя сообщения\n' +
      '• Смотреть статистику с помощью /stats\n' +
      '• Управлять счетами через /accounts\n\n' +
      'Приятного использования!' +
      getContextualHint('account_created')
    );
  }
}

/**
 * Finish tutorial callback
 */
export async function tutorialFinishCallback(ctx: any) {
  await ctx.answerCbQuery('Обучение завершено! 🎉');
  await ctx.deleteMessage();
  await tutorialCompleteHandler(ctx, false);
}
