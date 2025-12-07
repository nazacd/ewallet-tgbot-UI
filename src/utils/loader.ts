import { BotContext } from '../types';

/**
 * Shows an animated loader by cycling through message frames while executing an async action.
 *
 * @param ctx - Bot context
 * @param frames - Array of message strings to cycle through
 * @param action - Async action to execute while showing the loader
 * @param intervalMs - Interval between frame updates in milliseconds (default: 500)
 * @returns The result of the async action
 */
export async function withAnimatedLoader<T>(
  ctx: BotContext,
  frames: string[],
  action: () => Promise<T>,
  intervalMs: number = 500
): Promise<T> {
  if (frames.length === 0) {
    throw new Error('Frames array cannot be empty');
  }

  // Send initial message with first frame
  const loaderMessage = await ctx.reply(frames[0]);
  let currentFrameIndex = 0;

  // Set up interval to cycle through frames
  const interval = setInterval(async () => {
    currentFrameIndex = (currentFrameIndex + 1) % frames.length;
    try {
      await ctx.telegram.editMessageText(
        ctx.chat?.id,
        loaderMessage.message_id,
        undefined,
        frames[currentFrameIndex]
      );
    } catch (error) {
      // Ignore edit errors (message might be too old)
    }
  }, intervalMs);

  try {
    // Execute the actual action
    const result = await action();
    return result;
  } finally {
    // Clean up: clear interval and delete loader message
    clearInterval(interval);
    if (loaderMessage?.message_id) {
      try {
        await ctx.deleteMessage(loaderMessage.message_id);
      } catch (error) {
        // Ignore deletion errors
      }
    }
  }
}

/**
 * Predefined loading frames for parsing transactions
 */
export const PARSE_FRAMES = [
  '🤖 Анализирую.',
  '🤖 Анализирую..',
  '🤖 Анализирую...',
];

/**
 * Predefined loading frames for statistics
 */
export const STATS_FRAMES = [
  '📊 Загружаю статистику.',
  '📊 Загружаю статистику..',
  '📊 Загружаю статистику...',
  '📈 Генерирую графики.',
  '📈 Генерирую графики..',
  '📈 Генерирую графики...',
];
