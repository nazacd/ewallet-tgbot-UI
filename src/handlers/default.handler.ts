export async function defaultHandler(ctx: any) {
    await ctx.reply(`Обычное сообщение: ${ctx.message.text}`);
}