import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { apiClient } from '../services/api.client';
import { stateManager } from '../state/state.manager';
import { formatAmount } from '../utils/format';

export async function accountsHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  try {
    const accounts = await apiClient.getAccounts(tgUserId);

    if (accounts.length === 0) {
      await ctx.reply(
        'You don\'t have any accounts yet. Use /start to create one.'
      );
      return;
    }

    let message = '📊 Your Accounts:\n\n';
    let total = 0;
    const currencyCode = accounts[0].currency_code;

    accounts.forEach(account => {
      const star = account.is_default ? '⭐️ ' : '';
      message += `${star}${account.name} - ${formatAmount(account.balance, account.currency_code)}\n`;
      total += account.balance;
    });

    if (accounts.length > 1) {
      message += `\n💰 Total: ${formatAmount(total, currencyCode)}`;
    }

    await ctx.reply(
      message,
      Markup.inlineKeyboard([
        [Markup.button.callback('➕ Add Account', 'acc_add')],
        [Markup.button.callback('⚙️ Manage', 'acc_manage')],
      ])
    );
  } catch (error: any) {
    console.error('Accounts handler error:', error);
    await ctx.reply('❌ Failed to fetch accounts. Please try again.');
  }
}

// Add account callback
export async function addAccountCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '➕ Create New Account\n\n' +
    'What would you like to name this account?\n' +
    '(e.g., "Savings", "Credit Card", "Cash")'
  );
  
  stateManager.setState(ctx.from.id, 'WAIT_ACCOUNT_NAME');
}

// Handle account name input
export async function accountNameHandler(ctx: any, data: any) {
  const accountName = ctx.message.text.trim();
  
  if (!accountName || accountName.length > 50) {
    await ctx.reply('Please enter a valid account name (max 50 characters).');
    return;
  }

  stateManager.setState(ctx.from.id, 'WAIT_ACCOUNT_BALANCE', {
    onboardingData: { name: accountName }
  });

  // Get user's currency
  const user = await apiClient.getMe(ctx.from.id);
  const currencyCode = user.currency_code || 'USD';

  await ctx.reply(
    `Great! What's the current balance in ${accountName}?\n` +
    `(Enter a number in ${currencyCode}, or 0 if starting fresh)`
  );
}

// Handle account balance input
export async function accountBalanceHandler(ctx: any, data: any) {
  const balanceText = ctx.message.text.trim();
  const balance = Number(balanceText);

  if (isNaN(balance) || balance < 0) {
    await ctx.reply('Please enter a valid number (0 or positive).');
    return;
  }

  const tgUserId = ctx.from.id;
  const { name } = data.onboardingData || {};

  if (!name) {
    await ctx.reply('Something went wrong. Please try again with /accounts');
    stateManager.clearState(tgUserId);
    return;
  }

  try {
    const user = await apiClient.getMe(tgUserId);
    const currencyCode = user.currency_code || 'USD';

    const account = await apiClient.createAccount(tgUserId, {
      name,
      currency_code: currencyCode,
      balance,
      is_default: false,
    });

    await ctx.reply(
      `✅ Account created!\n\n` +
      `📊 ${account.name}\n` +
      `💰 Balance: ${formatAmount(balance, currencyCode)}\n\n` +
      `Use /accounts to manage your accounts.`
    );

    stateManager.clearState(tgUserId);
  } catch (error: any) {
    console.error('Account creation error:', error);
    await ctx.reply('❌ Failed to create account. Please try again.');
    stateManager.clearState(tgUserId);
  }
}

// Manage accounts callback
export async function manageAccountsCallback(ctx: any) {
  const tgUserId = ctx.from.id;
  
  await ctx.answerCbQuery();

  try {
    const accounts = await apiClient.getAccounts(tgUserId);

    const buttons = accounts.map(account => [
      Markup.button.callback(
        `${account.is_default ? '⭐️ ' : ''}${account.name}`,
        `acc_view_${account.id}`
      )
    ]);

    buttons.push([Markup.button.callback('« Back', 'acc_back')]);

    await ctx.editMessageText(
      'Select an account to manage:',
      Markup.inlineKeyboard(buttons)
    );
  } catch (error: any) {
    console.error('Manage accounts error:', error);
    await ctx.editMessageText('❌ Failed to load accounts.');
  }
}

// View specific account
export async function viewAccountCallback(ctx: any) {
  const accountId = ctx.match[1];
  const tgUserId = ctx.from.id;
  
  await ctx.answerCbQuery();

  try {
    const accounts = await apiClient.getAccounts(tgUserId);
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      await ctx.editMessageText('❌ Account not found.');
      return;
    }

    const message = 
      `📊 ${account.name}\n\n` +
      `💰 Balance: ${formatAmount(account.balance, account.currency_code)}\n` +
      `${account.is_default ? '⭐️ Default account' : ''}`;

    const buttons = [];
    
    if (!account.is_default) {
      buttons.push([Markup.button.callback('⭐️ Set as Default', `acc_default_${accountId}`)]);
    }
    
    if (accounts.length > 1) {
      buttons.push([Markup.button.callback('🗑 Delete Account', `acc_delete_${accountId}`)]);
    }
    
    buttons.push([Markup.button.callback('« Back', 'acc_manage')]);

    await ctx.editMessageText(
      message,
      Markup.inlineKeyboard(buttons)
    );
  } catch (error: any) {
    console.error('View account error:', error);
    await ctx.editMessageText('❌ Failed to load account details.');
  }
}

// Set account as default
export async function setDefaultAccountCallback(ctx: any) {
  const accountId = ctx.match[1];
  const tgUserId = ctx.from.id;
  
  await ctx.answerCbQuery('Setting as default...');

  try {
    await apiClient.updateAccount(tgUserId, accountId, { is_default: true });
    
    const accounts = await apiClient.getAccounts(tgUserId);
    const account = accounts.find(a => a.id === accountId);

    await ctx.editMessageText(
      `✅ ${account?.name} is now your default account!`,
      Markup.inlineKeyboard([[Markup.button.callback('« Back to Accounts', 'acc_back')]])
    );
  } catch (error: any) {
    console.error('Set default error:', error);
    await ctx.answerCbQuery('❌ Failed to update account');
  }
}

// Delete account
export async function deleteAccountCallback(ctx: any) {
  const accountId = ctx.match[1];
  
  await ctx.answerCbQuery();

  await ctx.editMessageText(
    '⚠️ Are you sure you want to delete this account?\n' +
    'All transactions will also be deleted. This cannot be undone!',
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Yes, Delete', `acc_delete_confirm_${accountId}`),
        Markup.button.callback('❌ Cancel', `acc_view_${accountId}`),
      ],
    ])
  );
}

// Confirm delete account
export async function confirmDeleteAccountCallback(ctx: any) {
  const accountId = ctx.match[1];
  const tgUserId = ctx.from.id;
  
  await ctx.answerCbQuery('Deleting...');

  try {
    await apiClient.deleteAccount(tgUserId, accountId);
    
    await ctx.editMessageText(
      '✅ Account deleted successfully.',
      Markup.inlineKeyboard([[Markup.button.callback('« Back to Accounts', 'acc_back')]])
    );
  } catch (error: any) {
    console.error('Delete account error:', error);
    await ctx.answerCbQuery('❌ Failed to delete account');
  }
}

// Back to accounts list
export async function backToAccountsCallback(ctx: any) {
  await ctx.answerCbQuery();
  await accountsHandler(ctx as BotContext);
}

// Register state handlers
stateManager.register('WAIT_ACCOUNT_NAME', accountNameHandler);
stateManager.register('WAIT_ACCOUNT_BALANCE', accountBalanceHandler);
