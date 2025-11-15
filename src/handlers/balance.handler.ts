import { stateManager } from '../state/state.manager';
import { updateBalance } from '../services/update-balance';

export async function balanceHandler(ctx: any) {
  const text = ctx.message.text;

  const amount = Number(text);
  if (isNaN(amount)) {
    await ctx.reply('Введите корректное число.');
    return;
  }

  await ctx.reply(`Сумма принята: ${amount}`);
  stateManager.clearState(ctx.from.id);
}