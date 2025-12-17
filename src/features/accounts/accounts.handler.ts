import { Markup } from 'telegraf';
import { BotContext } from '../../core/types';
import { apiClient } from '../../services/api.client';
import { stateManager } from '../../core/state/state.manager';
import { formatAmount } from '../../shared/utils/format';
import { createStepMessage } from '../../shared/utils/navigation';
import { buildCloseButton } from '../menu/menu.handler';
import { Language, t } from '../../shared/utils/i18n';

export async function accountsHandler(ctx: BotContext | any) {
  const tgUserId = ctx.from.id;

  try {
    // Get user language
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code as Language) || 'ru';
    const currencyCode = user.currency_code || 'USD';

    const accounts = await apiClient.getAccounts(ctx);

    if (accounts === null || accounts === undefined || accounts.length === 0) {
      // Clear any existing state and redirect to account onboarding
      await stateManager.clearState(user.tg_user_id);
      const { startAccountOnboarding } = await import('../onboarding/onboarding.handler');
      await startAccountOnboarding(ctx);
      return;
    }

    let message = t('accounts.your_accounts', lang);

    accounts.forEach((account) => {
      const defaultIcon = account.is_default ? '✅ ' : '';
      message += `${defaultIcon}<b>${account.name}</b>\n`;
      message += `💰 ${formatAmount(account.balance, currencyCode)}\n\n`;
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t('accounts.add_button', lang), 'acc_add')],
      [Markup.button.callback(t('accounts.manage_button', lang), 'acc_manage')],
      [buildCloseButton(lang)],
    ]);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        ...keyboard,
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'HTML',
        ...keyboard,
      });
    }
  } catch (error: any) {
    console.error('Accounts handler error:', error);
    await ctx.reply(t('accounts.error_load', 'ru')); // Fallback
  }
}

// Add account callback
export async function addAccountCallback(ctx: any) {
  await ctx.answerCbQuery();

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  const message = createStepMessage(
    1,
    2,
    t('accounts.create_step_name', lang),
    t('accounts.create_step_name_prompt', lang),
  );

  await ctx.editMessageText(message, { parse_mode: 'HTML' });

  await stateManager.setState(ctx.from.id, 'WAIT_ACCOUNT_NAME', {
    stepInfo: { current: 1, total: 2, name: 'Название счета' },
  });
}

// Handle account name input
export async function accountNameHandler(ctx: any, data: any) {
  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;
  const accountName = ctx.message.text.trim();

  if (!accountName || accountName.length > 50) {
    await ctx.reply(t('accounts.name_invalid', lang));
    return;
  }

  await stateManager.setState(ctx.from.id, 'WAIT_ACCOUNT_BALANCE', {
    onboardingData: { name: accountName },
    stepInfo: { current: 2, total: 2, name: 'Начальный баланс' },
  });

  // Get user's currency
  const currencyCode = user.currency_code || 'USD';

  const message = createStepMessage(
    2,
    2,
    t('accounts.create_step_balance', lang),
    t('accounts.create_step_balance_prompt', lang, [accountName, currencyCode]),
  );

  await ctx.reply(message, { parse_mode: 'HTML' });
}

// Handle account balance input
export async function accountBalanceHandler(ctx: any, data: any) {
  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;
  const balanceText = ctx.message.text.trim();
  const balance = Number(balanceText);

  if (isNaN(balance) || balance < 0) {
    await ctx.reply(t('accounts.balance_invalid', lang));
    return;
  }

  const tgUserId = ctx.from.id;
  const { name } = data.onboardingData || {};

  if (!name) {
    await ctx.reply(t('accounts.error_generic', lang));
    await stateManager.clearState(tgUserId);
    return;
  }

  try {
    const currencyCode = user.currency_code || 'USD';

    const account = await apiClient.createAccount(ctx, {
      name,
      balance,
      is_default: false,
    });

    await ctx.reply(
      t('accounts.created_success', lang, [account.name, formatAmount(balance, currencyCode)]),
      { parse_mode: 'HTML' },
    );

    await stateManager.clearState(tgUserId);
  } catch (error: any) {
    console.error('Account creation error:', error);
    await ctx.reply(t('accounts.error_create', lang));
    await stateManager.clearState(tgUserId);
  }
}

// Manage accounts callback
export async function manageAccountsCallback(ctx: any) {
  const tgUserId = ctx.from.id;

  await ctx.answerCbQuery();

  try {
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;
    const accounts = await apiClient.getAccounts(ctx);

    const buttons = accounts.map((account) => [
      Markup.button.callback(
        `${account.is_default ? '⭐️ ' : ''}${account.name}`,
        `acc_view_${account.id}`,
      ),
    ]);

    buttons.push([Markup.button.callback(t('accounts.back_to_accounts', lang), 'acc_back')]);

    await ctx.editMessageText(t('accounts.manage_prompt', lang), { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  } catch (error: any) {
    console.error('Manage accounts error:', error);
    await ctx.editMessageText(t('accounts.error_load', 'ru'));
  }
}

// View specific account
export async function viewAccountCallback(ctx: any) {
  const accountId = ctx.match[1];
  const tgUserId = ctx.from.id;

  await ctx.answerCbQuery();

  try {
    const accounts = await apiClient.getAccounts(ctx);
    const account = accounts.find((a) => a.id === accountId);

    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;
    const currencyCode = user.currency_code || 'USD';

    if (!account) {
      await ctx.editMessageText(t('accounts.not_found', lang), { parse_mode: 'HTML' });
      return;
    }

    const message =
      `📊 ${account.name}\n\n` +
      `💰 Баланс: ${formatAmount(account.balance, currencyCode)}\n` +
      `${account.is_default ? t('accounts.is_default', lang) : ''}`;

    const buttons = [];

    if (!account.is_default) {
      buttons.push([
        Markup.button.callback(t('accounts.make_default', lang), `acc_default_${accountId}`),
      ]);
    }

    if (accounts.length > 1) {
      buttons.push([Markup.button.callback(t('accounts.delete', lang), `acc_delete_${accountId}`)]);
    }

    buttons.push([Markup.button.callback(t('accounts.back_to_accounts', lang), 'acc_manage')]);

    await ctx.editMessageText(message, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  } catch (error: any) {
    console.error('View account error:', error);
    await ctx.editMessageText(t('accounts.error_details', 'ru'));
  }
}

// Set account as default
export async function setDefaultAccountCallback(ctx: any) {
  const accountId = ctx.match[1];
  const tgUserId = ctx.from.id;

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  await ctx.answerCbQuery(t('accounts.setting_default', lang));

  try {
    await apiClient.updateAccount(ctx, accountId, { is_default: true });

    const accounts = await apiClient.getAccounts(ctx);
    const account = accounts.find((a) => a.id === accountId);

    await ctx.editMessageText(
      t('accounts.set_default_success', lang, [account?.name || '']),
      {
        parse_mode: 'HTML', ...Markup.inlineKeyboard([
          [Markup.button.callback(t('accounts.back_to_accounts', lang), 'acc_back')],
        ])
      },
    );
  } catch (error: any) {
    console.error('Set default error:', error);
    await ctx.answerCbQuery(t('accounts.error_update', lang));
  }
}

// Delete account
export async function deleteAccountCallback(ctx: any) {
  const accountId = ctx.match[1];

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  await ctx.answerCbQuery();

  await ctx.editMessageText(
    t('accounts.delete_confirm_prompt', lang),
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            t('accounts.delete_confirm_yes', lang),
            `acc_delete_confirm_${accountId}`,
          ),
          Markup.button.callback(t('confirmation.cancel', lang), `acc_view_${accountId}`),
        ],
      ]),
    },
  );
}

// Confirm delete account
export async function confirmDeleteAccountCallback(ctx: any) {
  const accountId = ctx.match[1];
  const tgUserId = ctx.from.id;

  const user = await apiClient.getMe(ctx);
  const lang = (user.language_code || 'ru') as Language;

  await ctx.answerCbQuery(t('accounts.deleting', lang));

  try {
    await apiClient.deleteAccount(ctx, accountId);

    await ctx.editMessageText(
      t('accounts.delete_success', lang),
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(t('accounts.back_to_accounts', lang), 'acc_back')],
        ]),
      },
    );
  } catch (error: any) {
    console.error('Delete account error:', error);
    await ctx.answerCbQuery(t('accounts.error_delete', lang));
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
