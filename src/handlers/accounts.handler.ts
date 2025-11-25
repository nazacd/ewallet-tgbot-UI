import { Markup } from 'telegraf';
import { BotContext } from '../types';
import { apiClient } from '../services/api.client';
import { stateManager } from '../state/state.manager';
import { formatAmount } from '../utils/format';

export async function accountsHandler(ctx: BotContext) {
  const tgUserId = ctx.from.id;

  try {
    const accounts = await apiClient.getAccounts(ctx);
    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';

    if (accounts.length === 0) {
      await ctx.reply(
        'У вас ещё нет счетов. Используйте /start, чтобы создать первый.'
      );
      return;
    }

    let message = '📊 Ваши счета:\n\n';
    let total = 0;

    accounts.forEach(account => {
      const star = account.is_default ? '⭐️ ' : '';
      message += `${star}${account.name} - ${formatAmount(account.balance, currencyCode)}\n`;
      total += account.balance;
    });

    if (accounts.length > 1) {
      message += `\n💰 Итого: ${formatAmount(total, currencyCode)}`;
    }

    await ctx.reply(
      message,
      Markup.inlineKeyboard([
        [Markup.button.callback('➕ Добавить счёт', 'acc_add')],
        [Markup.button.callback('⚙️ Управлять', 'acc_manage')],
      ])
    );
  } catch (error: any) {
    console.error('Accounts handler error:', error);
    await ctx.reply('❌ Не удалось получить счета. Попробуйте снова.');
  }
}

// Add account callback
export async function addAccountCallback(ctx: any) {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '➕ Создать новый счёт\n\n' +
    'Как вы хотите его назвать?\n' +
    '(например, "Сбережения", "Кредитка", "Наличные")'
  );

  await stateManager.setState(ctx.from.id, 'WAIT_ACCOUNT_NAME');
}

// Handle account name input
export async function accountNameHandler(ctx: any, data: any) {
  const accountName = ctx.message.text.trim();

  if (!accountName || accountName.length > 50) {
    await ctx.reply('Введите корректное имя счёта (не более 50 символов).');
    return;
  }

  await stateManager.setState(ctx.from.id, 'WAIT_ACCOUNT_BALANCE', {
    onboardingData: { name: accountName }
  });

  // Get user's currency
  const user = await apiClient.getMe(ctx);
  const currencyCode = user.currency_code || 'USD';

  await ctx.reply(
    `Отлично! Какой текущий баланс у ${accountName}?\n` +
    `(Введите число в ${currencyCode}, либо 0, если начинаете с нуля)`
  );
}

// Handle account balance input
export async function accountBalanceHandler(ctx: any, data: any) {
  const balanceText = ctx.message.text.trim();
  const balance = Number(balanceText);

  if (isNaN(balance) || balance < 0) {
    await ctx.reply('Введите корректное число (0 или больше).');
    return;
  }

  const tgUserId = ctx.from.id;
  const { name } = data.onboardingData || {};

  if (!name) {
    await ctx.reply('Что-то пошло не так. Попробуйте снова с /accounts');
    await stateManager.clearState(tgUserId);
    return;
  }

  try {
    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';

    const account = await apiClient.createAccount(ctx, {
      name,
      balance,
      is_default: false,
    });

    await ctx.reply(
      `✅ Счёт создан!\n\n` +
      `📊 ${account.name}\n` +
      `💰 Баланс: ${formatAmount(balance, currencyCode)}\n\n` +
      `Используйте /accounts, чтобы управлять счетами.`
    );

    await stateManager.clearState(tgUserId);
  } catch (error: any) {
    console.error('Account creation error:', error);
    await ctx.reply('❌ Не удалось создать счёт. Попробуйте снова.');
    await stateManager.clearState(tgUserId);
  }
}

// Manage accounts callback
export async function manageAccountsCallback(ctx: any) {
  const tgUserId = ctx.from.id;

  await ctx.answerCbQuery();

  try {
    const accounts = await apiClient.getAccounts(ctx);

    const buttons = accounts.map(account => [
      Markup.button.callback(
        `${account.is_default ? '⭐️ ' : ''}${account.name}`,
        `acc_view_${account.id}`
      )
    ]);

    buttons.push([Markup.button.callback('« Назад', 'acc_back')]);

    await ctx.editMessageText(
      'Выберите счёт для управления:',
      Markup.inlineKeyboard(buttons)
    );
  } catch (error: any) {
    console.error('Manage accounts error:', error);
    await ctx.editMessageText('❌ Не удалось загрузить счета.');
  }
}

// View specific account
export async function viewAccountCallback(ctx: any) {
  const accountId = ctx.match[1];
  const tgUserId = ctx.from.id;

  await ctx.answerCbQuery();

  try {
    const accounts = await apiClient.getAccounts(ctx);
    const account = accounts.find(a => a.id === accountId);

    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';

    if (!account) {
      await ctx.editMessageText('❌ Счёт не найден.');
      return;
    }

    const message =
      `📊 ${account.name}\n\n` +
      `💰 Баланс: ${formatAmount(account.balance, currencyCode)}\n` +
      `${account.is_default ? '⭐️ Счёт по умолчанию' : ''}`;

    const buttons = [];

    if (!account.is_default) {
      buttons.push([Markup.button.callback('⭐️ Сделать основным', `acc_default_${accountId}`)]);
    }

    if (accounts.length > 1) {
      buttons.push([Markup.button.callback('🗑 Удалить счёт', `acc_delete_${accountId}`)]);
    }

    buttons.push([Markup.button.callback('« Назад', 'acc_manage')]);

    await ctx.editMessageText(
      message,
      Markup.inlineKeyboard(buttons)
    );
  } catch (error: any) {
    console.error('View account error:', error);
    await ctx.editMessageText('❌ Не удалось загрузить детали счёта.');
  }
}

// Set account as default
export async function setDefaultAccountCallback(ctx: any) {
  const accountId = ctx.match[1];
  const tgUserId = ctx.from.id;

  await ctx.answerCbQuery('Устанавливаю по умолчанию...');

  try {
    await apiClient.updateAccount(ctx, accountId, { is_default: true });

    const accounts = await apiClient.getAccounts(ctx);
    const account = accounts.find(a => a.id === accountId);

    await ctx.editMessageText(
      `✅ ${account?.name} теперь счёт по умолчанию!`,
      Markup.inlineKeyboard([[Markup.button.callback('« Назад к счетам', 'acc_back')]])
    );
  } catch (error: any) {
    console.error('Set default error:', error);
    await ctx.answerCbQuery('❌ Не удалось обновить счёт');
  }
}

// Delete account
export async function deleteAccountCallback(ctx: any) {
  const accountId = ctx.match[1];

  await ctx.answerCbQuery();

  await ctx.editMessageText(
    '⚠️ Вы уверены, что хотите удалить этот счёт?\n' +
    'Все связанные транзакции тоже будут удалены. Это действие необратимо!',
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Да, удалить', `acc_delete_confirm_${accountId}`),
        Markup.button.callback('❌ Отмена', `acc_view_${accountId}`),
      ],
    ])
  );
}

// Confirm delete account
export async function confirmDeleteAccountCallback(ctx: any) {
  const accountId = ctx.match[1];
  const tgUserId = ctx.from.id;

  await ctx.answerCbQuery('Удаляю...');

  try {
    await apiClient.deleteAccount(ctx, accountId);

    await ctx.editMessageText(
      '✅ Счёт успешно удалён.',
      Markup.inlineKeyboard([[Markup.button.callback('« Назад к счетам', 'acc_back')]])
    );
  } catch (error: any) {
    console.error('Delete account error:', error);
    await ctx.answerCbQuery('❌ Не удалось удалить счёт');
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
