import { BotContext } from '../types';

export async function helpHandler(ctx: BotContext) {
  const helpText = `
📚 *E-Wallet Bot Commands*

*Quick Transaction Entry:*
Just send a message like:
• "Coffee 5000"
• "Lunch with colleagues 25000"
• "Got salary 5000000"
• Or send a voice message! 🎤

*Commands:*
/start - Start the bot or create first account
/balance - Check your account balances
/history - View recent transactions
/accounts - Manage your accounts
/help - Show this help message

*Tips:*
✅ Natural language works! "Taxi yesterday 15000"
✅ The bot will ask you to confirm before saving
✅ You can edit transactions before confirming
✅ Set a default account for quick entries

Need help? Just ask! 😊
  `.trim();

  await ctx.reply(helpText, { parse_mode: 'Markdown' });
}
