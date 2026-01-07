import { Markup } from 'telegraf';
import { BotContext, Transaction, ParsedDebt, Debt } from '../../core/types';
import { apiClient } from '../../services/api.client';
import { stateManager } from '../../core/state/state.manager';
import {
    formatAmount,
    getCategoryEmoji,
    escapeHtml,
    formatDate,
} from '../../shared/utils/format';
import { updateOrReply } from '../../shared/utils/messages';
import { t, Language } from '../../shared/utils/i18n';

const DEBTS_CATEGORY_ID = 26;

/**
 * Check if transaction belongs to Debts & Loans category
 */
export function checkDebtCategory(categoryId?: number): boolean {
    return categoryId === DEBTS_CATEGORY_ID;
}

/**
 * Calculate default due date (1 week from now)
 */
function getDefaultDueDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7); // 1 week from now
    return date.toISOString();
}

/**
 * Calculate due date based on interval
 */
function calculateDueDate(interval: string): string {
    const date = new Date();

    switch (interval) {
        case '3d':
            date.setDate(date.getDate() + 3);
            break;
        case '1w':
            date.setDate(date.getDate() + 7);
            break;
        case '2w':
            date.setDate(date.getDate() + 14);
            break;
        case '1m':
            date.setMonth(date.getMonth() + 1);
            break;
        default:
            date.setDate(date.getDate() + 7); // Default to 1 week
    }

    return date.toISOString();
}

/**
 * Send debt detection message after transaction confirmation
 */
export async function sendDebtDetectionMessage(
    ctx: BotContext,
    transaction: Transaction,
    lang: Language,
) {
    // Deposit = borrowed (приход), Withdrawal = lent (уход)
    const messageKey = transaction.type === 'deposit'
        ? 'debt.detection_message_borrowed'
        : 'debt.detection_message_lent';

    const message = t(messageKey, lang);

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback(t('debt.yes_track', lang), 'debt_accept'),
            Markup.button.callback(t('debt.no_track', lang), 'debt_reject'),
        ],
    ]);

    await ctx.reply(message, {
        parse_mode: 'HTML',
        ...keyboard,
    });

    // Store transaction ID in state for later debt creation
    await stateManager.setState(ctx.from.id, 'WAIT_DEBT_TRACKING', {
        debtTracking: {
            transaction_id: transaction.id,
            transaction,
        },
    });
}

/**
 * Handle "Yes" response to debt tracking
 */
export async function handleDebtAcceptCallback(ctx: BotContext) {
    await ctx.answerCbQuery();

    const tgUserId = ctx.from.id;
    const data = await stateManager.getData(tgUserId);

    if (!data.debtTracking?.transaction_id) {
        const user = await apiClient.getMe(ctx);
        const lang = (user.language_code || 'ru') as Language;
        await updateOrReply(ctx, t('debt.outdated', lang));
        await stateManager.clearState(tgUserId);
        return;
    }

    try {
        const user = await apiClient.getMe(ctx);
        const lang = (user.language_code || 'ru') as Language;

        // Call parseDebtText API to get parsed debt information
        const parsedDebt = await apiClient.parseDebtText(ctx, {
            transaction_id: data.debtTracking.transaction_id,
            content: data.debtTracking.transaction?.note || '',
        });

        // Calculate default due date (1 week)
        const defaultDueDate = getDefaultDueDate();

        // Store parsed debt with default due date
        await stateManager.setState(tgUserId, 'WAIT_DEBT_TRACKING', {
            debtTracking: {
                ...data.debtTracking,
                parsedDebt: {
                    ...parsedDebt,
                    due_at: defaultDueDate,
                },
            },
        });

        // Show confirmation message
        await sendDebtConfirmation(ctx, parsedDebt, defaultDueDate, lang);
    } catch (error: any) {
        console.error('Debt parsing error:', error);
        const user = await apiClient.getMe(ctx);
        const lang = (user.language_code || 'ru') as Language;
        await updateOrReply(ctx, t('debt.parse_error', lang));
        await stateManager.clearState(tgUserId);
    }
}

/**
 * Get relative time text for due date intervals
 */
function getRelativeTimeText(dueDate: string, lang: Language): string {
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) {
        return t('debt.remind_in_3d', lang);
    } else if (diffDays <= 7) {
        return t('debt.remind_in_1w', lang);
    } else if (diffDays <= 14) {
        return t('debt.remind_in_2w', lang);
    } else {
        return t('debt.remind_in_1m', lang);
    }
}

/**
 * Send debt confirmation message with details
 */
async function sendDebtConfirmation(
    ctx: BotContext,
    parsedDebt: ParsedDebt,
    dueDate: string,
    lang: Language,
) {
    const typeText = parsedDebt.type === 'borrow'
        ? t('debt.type_borrow', lang)
        : t('debt.type_lend', lang);

    // Use different label based on debt type
    const counterpartyLabel = parsedDebt.type === 'borrow'
        ? t('debt.from_whom', lang)  // От кого
        : t('debt.to_whom', lang);   // Кому

    const relativeTime = getRelativeTimeText(dueDate, lang);

    let message = '';
    message += `<b>${t('debt.confirmation_title', lang)}</b>\n\n`;
    message += `💼 <b>${t('debt.type', lang)}:</b> ${typeText}\n`;
    message += `👤 <b>${counterpartyLabel}:</b> ${escapeHtml(parsedDebt.counterparty_name)}\n`;
    message += `💰 <b>${t('debt.amount', lang)}:</b> ${formatAmount(parsedDebt.amount, parsedDebt.currency)}\n`;
    message += `🔔 <b>${t('debt.remind', lang)}:</b> ${relativeTime}\n`;

    if (parsedDebt.note) {
        message += `\n📝 <b>${t('debt.note', lang)}:</b>\n`;
        message += `<code>${escapeHtml(parsedDebt.note)}</code>\n`;
    }

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback(t('debt.confirm', lang), 'debt_confirm'),
            Markup.button.callback(t('debt.edit_due_date', lang), 'debt_edit_due'),
        ],
        [Markup.button.callback(t('debt.cancel', lang), 'debt_cancel')],
    ]);

    await updateOrReply(ctx, message, {
        parse_mode: 'HTML',
        ...keyboard,
    });
}

/**
 * Handle debt confirmation - create debt via API
 */
export async function handleDebtConfirmCallback(ctx: BotContext) {
    await ctx.answerCbQuery();

    const tgUserId = ctx.from.id;
    const data = await stateManager.getData(tgUserId);

    if (!data.debtTracking?.parsedDebt || !data.debtTracking?.transaction_id) {
        const user = await apiClient.getMe(ctx);
        const lang = (user.language_code || 'ru') as Language;
        await updateOrReply(ctx, t('debt.outdated', lang));
        await stateManager.clearState(tgUserId);
        return;
    }

    try {
        const user = await apiClient.getMe(ctx);
        const lang = (user.language_code || 'ru') as Language;
        const timezone = user.timezone;

        const parsedDebt = data.debtTracking.parsedDebt;

        // Create debt via API
        const debt = await apiClient.createDebt(ctx, {
            transaction_id: data.debtTracking.transaction_id,
            type: parsedDebt.type,
            name: parsedDebt.counterparty_name,
            due_at: parsedDebt.due_at,
            note: parsedDebt.note,
        });

        // Show success message
        const locale = lang === 'uz' ? 'uz-UZ' : 'ru-RU';
        const typeText = debt.type === 'borrow'
            ? t('debt.type_borrow', lang)
            : t('debt.type_lend', lang);

        // Use different label based on debt type
        const counterpartyLabel = debt.type === 'borrow'
            ? t('debt.from_whom', lang)  // От кого / Kimdan
            : t('debt.to_whom', lang);   // Кому / Kimga


        const relativeTime = getRelativeTimeText(debt.due_at!, lang);

        let message = '';
        message += `<b>${t('debt.created', lang)}</b>\n\n`;
        message += `💼 <b>${t('debt.type', lang)}:</b> ${typeText}\n`;
        message += `👤 <b>${counterpartyLabel}:</b> ${escapeHtml(debt.name)}\n`;
        message += `💰 <b>${t('debt.amount', lang)}:</b> ${formatAmount(debt.amount, debt.currency_code)}\n`;
        message += `🔔 <b>${t('debt.remind', lang)}:</b> ${relativeTime}\n`;

        await updateOrReply(ctx, message, { parse_mode: 'HTML' });
        await stateManager.clearState(tgUserId);
    } catch (error: any) {
        console.error('Debt creation error:', error);
        const user = await apiClient.getMe(ctx);
        const lang = (user.language_code || 'ru') as Language;
        await updateOrReply(ctx, t('debt.create_error', lang));
        await stateManager.clearState(tgUserId);
    }
}

/**
 * Handle "No" response to debt tracking
 */
export async function handleDebtRejectCallback(ctx: BotContext) {
    await ctx.answerCbQuery();

    const tgUserId = ctx.from.id;
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;

    await updateOrReply(ctx, t('debt.rejected', lang));
    await stateManager.clearState(tgUserId);
}

/**
 * Handle debt cancellation
 */
export async function handleDebtCancelCallback(ctx: BotContext) {
    await ctx.answerCbQuery();

    const tgUserId = ctx.from.id;
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;

    await updateOrReply(ctx, t('debt.canceled', lang));
    await stateManager.clearState(tgUserId);
}

/**
 * Handle edit due date request
 */
export async function handleEditDueDateCallback(ctx: BotContext) {
    await ctx.answerCbQuery();

    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;

    const message = t('debt.choose_due_date', lang);

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback(t('debt.interval_3d', lang), 'debt_due_3d'),
            Markup.button.callback(t('debt.interval_1w', lang), 'debt_due_1w'),
        ],
        [
            Markup.button.callback(t('debt.interval_2w', lang), 'debt_due_2w'),
            Markup.button.callback(t('debt.interval_1m', lang), 'debt_due_1m'),
        ],
        [Markup.button.callback(t('buttons.back', lang), 'debt_back_to_confirm')],
    ]);

    await updateOrReply(ctx, message, {
        parse_mode: 'HTML',
        ...keyboard,
    });
}

/**
 * Handle due date interval selection
 */
export async function handleDueDateSelectionCallback(ctx: BotContext) {
    await ctx.answerCbQuery();

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) {
        return;
    }

    const callbackData = callbackQuery.data;
    const interval = callbackData.replace('debt_due_', '');

    const tgUserId = ctx.from.id;
    const data = await stateManager.getData(tgUserId);

    if (!data.debtTracking?.parsedDebt) {
        const user = await apiClient.getMe(ctx);
        const lang = (user.language_code || 'ru') as Language;
        await updateOrReply(ctx, t('debt.outdated', lang));
        await stateManager.clearState(tgUserId);
        return;
    }

    // Calculate new due date based on interval
    const newDueDate = calculateDueDate(interval);

    // Update parsed debt with new due date
    await stateManager.setState(tgUserId, 'WAIT_DEBT_TRACKING', {
        debtTracking: {
            ...data.debtTracking,
            parsedDebt: {
                ...data.debtTracking.parsedDebt,
                due_at: newDueDate,
            },
        },
    });

    // Return to confirmation with updated due date
    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;

    await sendDebtConfirmation(
        ctx,
        { ...data.debtTracking.parsedDebt, due_at: newDueDate } as ParsedDebt,
        newDueDate,
        lang,
    );
}

/**
 * Handle back to confirmation
 */
export async function handleBackToConfirmCallback(ctx: BotContext) {
    await ctx.answerCbQuery();

    const tgUserId = ctx.from.id;
    const data = await stateManager.getData(tgUserId);

    if (!data.debtTracking?.parsedDebt) {
        const user = await apiClient.getMe(ctx);
        const lang = (user.language_code || 'ru') as Language;
        await updateOrReply(ctx, t('debt.outdated', lang));
        await stateManager.clearState(tgUserId);
        return;
    }

    const user = await apiClient.getMe(ctx);
    const lang = (user.language_code || 'ru') as Language;

    await sendDebtConfirmation(
        ctx,
        data.debtTracking.parsedDebt,
        data.debtTracking.parsedDebt.due_at!,
        lang,
    );
}
