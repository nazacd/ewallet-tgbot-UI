import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { authService } from '../services/auth.service';
import { apiClient } from '../services/api.client';
import { stateManager } from '../state/state.manager';

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

    // Check if user has accounts
    const accounts = await apiClient.getAccounts(tgUserId);

    if (accounts.length === 0) {
      // Start onboarding
      await ctx.reply(
        '👋 Welcome to E-Wallet!\n\n' +
        'Let\'s set up your first account. This could be your cash wallet, bank card, or savings account.\n\n' +
        '📝 What would you like to name this account?\n' +
        '(e.g., "Cash", "Main Card", "Savings")',
        Markup.removeKeyboard()
      );
      
      stateManager.setState(tgUserId, 'ONBOARDING_ACCOUNT_NAME');
    } else {
      // User already set up
      const user = await apiClient.getMe(tgUserId);
      
      await ctx.reply(
        `Welcome back, ${ctx.from.first_name}! 👋\n\n` +
        'Send me a transaction like:\n' +
        '• "Coffee 5000"\n' +
        '• "Lunch 25000"\n' +
        '• "Got salary 5000000"\n\n' +
        'Or use commands:\n' +
        '/balance - Check balances\n' +
        '/history - Recent transactions\n' +
        '/accounts - Manage accounts\n' +
        '/help - Show all commands',
        Markup.removeKeyboard()
      );
      
      stateManager.clearState(tgUserId);
    }
  } catch (error: any) {
    console.error('Start handler error:', error);
    await ctx.reply(
      '❌ Sorry, something went wrong. Please try again later.'
    );
  }
}

// Onboarding: Account name step
export async function onboardingAccountNameHandler(ctx: any, data: any) {
  const accountName = ctx.message.text.trim();
  
  if (!accountName || accountName.length > 50) {
    await ctx.reply('Please enter a valid account name (max 50 characters).');
    return;
  }

  // Store the name and move to currency selection
  stateManager.setState(ctx.from.id, 'ONBOARDING_CURRENCY', {
    onboardingData: { name: accountName }
  });

  await ctx.reply(
    `Great! Now, what currency will this account use?\n\n` +
    'Common options:',
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
}

// Onboarding: Currency selection callback
export async function onboardingCurrencyCallback(ctx: any) {
  const currency = ctx.match[1]; // Extract currency code from callback data
  const data = stateManager.getData(ctx.from.id);
  
  await ctx.answerCbQuery();
  await ctx.deleteMessage();

  stateManager.setState(ctx.from.id, 'ONBOARDING_BALANCE', {
    onboardingData: {
      ...data.onboardingData,
      currency,
    }
  });

  await ctx.reply(
    `Perfect! Currency set to ${currency}.\n\n` +
    '💰 What\'s the current balance in this account?\n' +
    '(Enter a number, or send 0 if starting fresh)'
  );
}

// Onboarding: Balance step
export async function onboardingBalanceHandler(ctx: any, data: any) {
  const balanceText = ctx.message.text.trim();
  const balance = Number(balanceText);

  if (isNaN(balance) || balance < 0) {
    await ctx.reply('Please enter a valid number (0 or positive).');
    return;
  }

  const tgUserId = ctx.from.id;
  const { name, currency } = data.onboardingData || {};

  if (!name || !currency) {
    await ctx.reply('Something went wrong. Let\'s start over with /start');
    stateManager.clearState(tgUserId);
    return;
  }

  try {
    // Create the account
    const account = await apiClient.createAccount(tgUserId, {
      name,
      currency_code: currency,
      balance,
      is_default: true,
    });

    await ctx.reply(
      `✅ Account created successfully!\n\n` +
      `📊 ${account.name}\n` +
      `💰 Balance: ${balance.toLocaleString()} ${currency}\n\n` +
      `You're all set! Try adding your first transaction:\n` +
      `• "Coffee 5000"\n` +
      `• "Lunch with friends 25000"\n` +
      `• "Got salary 5000000"\n\n` +
      `Or send a voice message! 🎤`
    );

    stateManager.clearState(tgUserId);
  } catch (error: any) {
    console.error('Account creation error:', error);
    await ctx.reply(
      '❌ Failed to create account. Please try again with /start'
    );
    stateManager.clearState(tgUserId);
  }
}

// Register state handlers
stateManager.register('ONBOARDING_ACCOUNT_NAME', onboardingAccountNameHandler);
stateManager.register('ONBOARDING_BALANCE', onboardingBalanceHandler);
