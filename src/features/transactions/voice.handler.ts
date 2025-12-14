import { apiClient } from '../../services/api.client';
import { stateManager } from '../../core/state/state.manager';
import {
  buildConfirmationKeyboard,
  buildTransactionSummary,
  withProgressMessage,
} from '../../shared/utils/messages';
import { t, Language } from '../../shared/utils/i18n';

export async function voiceHandler(ctx: any) {
  let lang: Language = 'ru';
  try {
    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';
    lang = (user.language_code || 'ru') as Language;
    const fileUrl = await ctx.telegram.getFileLink(ctx.message.voice.file_id);

    if (!fileUrl) {
      await ctx.reply(t('transaction.parse_error', lang));
      return;
    }

    const accounts = await apiClient.getAccounts(ctx);
    if (accounts.length === 0) {
      await ctx.reply(t('transaction.no_accounts_found', lang));
      return;
    }

    const defaultAccount = accounts.find((a) => a.is_default) || accounts[0];

    const parsed = await withProgressMessage(ctx, t('transaction.loading', lang), () =>
      apiClient.parseVoice(ctx, fileUrl),
    );

    const categories = await apiClient.getCategories(ctx);
    const category = categories.find((c) => c.id === parsed.category_id);

    const message = buildTransactionSummary({
      parsed,
      currencyCode,
      categoryName: category?.name,
      accountName: defaultAccount.name,
      lang,
    });

    await stateManager.setState(user.tg_user_id, 'WAIT_TRANSACTION_CONFIRM', {
      parsedTransaction: parsed,
      accountId: defaultAccount.id,
    });

    await ctx.reply(message, { parse_mode: "HTML", ...buildConfirmationKeyboard({ allowFurtherEdits: true, lang })});
  } catch (error: any) {
    console.error('Transaction parse error:', error);

    if (error.response?.status === 400) {
      await ctx.reply(`${t('transaction.parse_error', lang)}`);
    } else {
      await ctx.reply(`❌ ${t('errors.critical', lang)} ${t('errors.retry_hint', lang)}`);
    }
  }
}
