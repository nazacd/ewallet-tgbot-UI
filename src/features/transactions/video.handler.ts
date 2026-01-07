import { BotContext } from '../../core/types';

export async function videoHandler(ctx: BotContext) {
  try {
    const userId = ctx.from?.id;

    // Check if the user ID matches 6665174170
    if (userId === 6665174170) {
      // Type guard to check if message exists and has video
      if (ctx.message && 'video' in ctx.message && ctx.message.video) {
        const fileId = ctx.message.video.file_id;
        await ctx.reply(`File ID: ${fileId}`);
      } else {
        await ctx.reply('No video file ID found.');
      }
    }
  } catch (error) {
    console.error('Error handling video:', error);
  }
}
