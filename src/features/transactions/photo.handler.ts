import { apiClient } from '../../services/api.client';
import { stateManager } from '../../core/state/state.manager';
import {
  buildConfirmationMessage,
} from './transaction.handler';
import { withProgressMessage } from '../../shared/utils/messages';
import { t, Language } from '../../shared/utils/i18n';

export async function photoHandler(ctx: any) {
  let lang: Language = 'ru';

  try {
    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';
    lang = (user.language_code || 'ru') as Language;

    // Get the largest photo (best quality)
    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1];
    const fileUrl = await ctx.telegram.getFileLink(photo.file_id);
    if (!fileUrl) {
      await ctx.reply(t('transaction.parse_error', lang));
      return;
    }
    const accounts = await apiClient.getAccounts(ctx);

    if (accounts === null || accounts === undefined || accounts.length === 0) {
      // Clear any existing state and redirect to account onboarding
      await stateManager.clearState(user.tg_user_id);
      const { startAccountOnboarding } = await import('../onboarding/onboarding.handler');
      await startAccountOnboarding(ctx);
      return;
    }

    const defaultAccount = accounts.find((a) => a.is_default) || accounts[0];
    const parsed = await withProgressMessage(ctx, t('transaction.loading', lang), () =>
      apiClient.parseImage(ctx, fileUrl.href),
    );

    let selectedAccount = defaultAccount;
    if (parsed.account_id) {
      selectedAccount = accounts.find((a) => a.id === parsed.account_id) || defaultAccount;
    }

    const data = {
      parsedTransaction: parsed,
      accountId: selectedAccount.id,
    };

    const { summary, keyboard } = await buildConfirmationMessage(data, ctx);

    const message = await ctx.reply(summary, {
      parse_mode: 'HTML',
      ...keyboard,
    });

    await stateManager.setState(user.tg_user_id, 'WAIT_TRANSACTION_CONFIRM', {
      ...data,
      parsedTransactionMessage: {
        message_id: message.message_id,
      },
    });
  } catch (error: any) {
    console.error('Receipt parse error:', error);

    if (error.response?.status === 400) {
      await ctx.reply(`${t('transaction.parse_error', lang)}`);
    } else {
      await ctx.reply(`❌ ${t('errors.critical', lang)} ${t('errors.retry_hint', lang)}`);
    }
  }
}
