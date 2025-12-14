import { Markup } from 'telegraf';

/**
 * Форматирует прогресс в виде "Шаг X из Y: Название"
 */
export function formatStepProgress(
  currentStep: number,
  totalSteps: number,
  stepName: string,
): string {
  return `🔹 Шаг ${currentStep} из ${totalSteps}: ${stepName}\n\n`;
}

/**
 * Создает сообщение с индикатором прогресса
 */
export function createStepMessage(
  step: number,
  total: number,
  stepName: string,
  message: string,
): string {
  return formatStepProgress(step, total, stepName) + message;
}

/**
 * Возвращает контекстную подсказку в зависимости от выполненного действия
 */
export function getContextualHint(
  action: 'transaction_saved' | 'account_created' | 'stats_viewed',
): string {
  const hints = {
    transaction_saved: '\n\n💡 Используйте /history чтобы посмотреть все транзакции',
    account_created: '\n\n💡 Теперь можете добавить транзакцию, например: "Кофе 5000"',
    stats_viewed: '\n\n💡 Используйте /balance чтобы посмотреть баланс всех счетов',
  };

  return hints[action] || '';
}

/**
 * Создает универсальную кнопку отмены
 */
export function buildCancelButton(text: string = '❌ Отменить') {
  return Markup.button.callback(text, 'action_cancel');
}

/**
 * Создает клавиатуру с кнопкой отмены
 */
export function addCancelButton(buttons: any[]): any[] {
  return [...buttons, [buildCancelButton()]];
}

/**
 * Форматирует сообщение об отмене операции
 */
export function getCancelMessage(context?: string): string {
  if (context) {
    return `❌ ${context} отменено.`;
  }
  return '❌ Операция отменена.';
}

/**
 * Создает сообщение о тайм-ауте состояния
 */
export function getTimeoutMessage(): string {
  return (
    '⏱ Время ожидания истекло. Операция отменена.\n\n' +
    'Начните заново, отправив команду или сообщение.'
  );
}

/**
 * Визуальный индикатор прогресса (прогресс бар)
 */
export function createProgressBar(current: number, total: number): string {
  const filled = '●';
  const empty = '○';
  const progress = Array(total).fill(empty);

  for (let i = 0; i < current; i++) {
    progress[i] = filled;
  }

  return progress.join(' ');
}

/**
 * Полное сообщение о прогрессе с визуальным баром
 */
export function createProgressMessage(current: number, total: number, stepName: string): string {
  const bar = createProgressBar(current, total);
  return `${bar}\n${formatStepProgress(current, total, stepName)}`;
}

/**
 * Удаляет инлайн-клавиатуру у сообщения с кнопками
 */
export async function clearInlineKeyboard(ctx: any) {
  try {
    // Удаляем инлайн-клавиатуру у сообщения с кнопками
    if (ctx.editMessageReplyMarkup) {
      await ctx.editMessageReplyMarkup(undefined);
    }
  } catch (e) {
    console.error('Failed to clear inline keyboard:', e);
  }
}
