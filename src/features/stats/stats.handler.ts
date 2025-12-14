import { Markup } from 'telegraf';
import { BotContext } from '../../core/types';
import { apiClient } from '../../services/api.client';
import { formatAmount, getCategoryEmoji } from '../../shared/utils/format';
import { withAnimatedLoader, STATS_FRAMES } from '../../shared/utils/loader';
import { renderPieChart } from '../../services/charts/pieChart';
import { generateDesktopDashboard } from '../../services/dashboard/desktopDashboard';
import { t, Language } from '../../shared/utils/i18n';

/**
 * Calculate date range based on period and start date
 */
function calculateDateRange(
  period: 'month' | 'week' | 'day' | undefined,
  startDate?: string,
  lang: Language = 'ru',
): {
  from?: string;
  to?: string;
  displayRange?: string;
} {
  if (!period) {
    return {}; // All time - no date filtering
  }

  const baseDate = startDate ? new Date(startDate) : new Date();

  if (period === 'month') {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const from = new Date(year, month, 1);
    const to = new Date(year, month + 1, 0); // Last day of month

    const monthNames = (t('stats.months', lang) as unknown) as string[];
    const displayRange = `${monthNames[month]} ${year}`;

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
      displayRange,
    };
  }

  if (period === 'week') {
    // Find Monday of the week containing baseDate
    const dayOfWeek = baseDate.getDay();
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      return `${day}.${month < 10 ? '0' + month : month}`;
    };

    const displayRange = `${formatDate(monday)} - ${formatDate(sunday)}`;

    return {
      from: monday.toISOString().split('T')[0],
      to: sunday.toISOString().split('T')[0],
      displayRange,
    };
  }

  if (period === 'day') {
    const dateStr = baseDate.toISOString().split('T')[0];
    const day = baseDate.getDate();
    const month = baseDate.getMonth() + 1;
    const year = baseDate.getFullYear();
    const displayRange = `${day}.${month < 10 ? '0' + month : month}.${year}`;

    return {
      from: dateStr,
      to: dateStr,
      displayRange,
    };
  }

  return {};
}

/**
 * Calculate the date for previous period
 */
function calculatePreviousPeriod(
  period: 'month' | 'week' | 'day' | undefined,
  currentDate: string,
): string {
  if (!period) return currentDate;

  const date = new Date(currentDate);

  if (period === 'month') {
    date.setMonth(date.getMonth() - 1);
  } else if (period === 'week') {
    date.setDate(date.getDate() - 7);
  } else if (period === 'day') {
    date.setDate(date.getDate() - 1);
  }

  return date.toISOString().split('T')[0];
}

/**
 * Calculate the date for next period
 */
function calculateNextPeriod(
  period: 'month' | 'week' | 'day' | undefined,
  currentDate: string,
): string {
  if (!period) return currentDate;

  const date = new Date(currentDate);

  if (period === 'month') {
    date.setMonth(date.getMonth() + 1);
  } else if (period === 'week') {
    date.setDate(date.getDate() + 7);
  } else if (period === 'day') {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split('T')[0];
}

/**
 * Check if a date would be in the future
 * This checks if the START of the period would be after today
 */
function isFutureDate(dateStr: string, period: 'month' | 'week' | 'day' | undefined): boolean {
  if (!period) return false;

  const { from } = calculateDateRange(period, dateStr);
  if (!from) return false;

  const startDate = new Date(from);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Only prevent if the START of the period is after today
  return startDate > today;
}

/**
 * Main stats handler with support for periods, accounts, and date navigation
 */
export async function statsHandler(
  ctx: BotContext,
  period?: 'month' | 'week' | 'day',
  accountId?: string,
  startDate?: string,
) {
  const tgUserId = ctx.from.id;

  try {
    const user = await apiClient.getMe(ctx);
    const currencyCode = user.currency_code || 'USD';
    const lang = (user.language_code || 'ru') as Language;

    // Calculate date range
    const currentDate = startDate || new Date().toISOString().split('T')[0];
    const { from, to, displayRange } = calculateDateRange(period, currentDate, lang);

    // Get account name if specific account (need this before checking stats)
    let accountName = '';
    if (accountId) {
      const accounts = await apiClient.getAccounts(ctx);
      const account = accounts.find((a) => a.id === accountId);
      accountName = account ? ` • ${account.name}` : '';
    }

    // Fetch stats with filters
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (accountId) params.account_id = accountId;

    const stats = await apiClient.getStats(ctx, params);

    // Check if there are any transactions
    const hasExpenses = stats && stats.expense_by_category && stats.expense_by_category.length > 0;
    const hasIncome = stats && stats.income_by_category && stats.income_by_category.length > 0;
    const hasTransactions = hasExpenses || hasIncome;

    if (!hasTransactions) {
      // Build message for no transactions
      let noDataMessage = `<b>${t('stats.title', lang)}`;
      if (accountName) {
        noDataMessage += accountName; // Already has " • " prefix
      }
      noDataMessage += '</b>\n';
      if (displayRange) {
        noDataMessage += `<i>${displayRange}</i>\n`;
      }
      noDataMessage += '\n';
      noDataMessage += t('stats.no_transactions', lang);

      // Build keyboard (same as below but without chart)
      const keyboard = buildStatsKeyboard(period, accountId, currentDate, lang);

      await ctx.reply(noDataMessage, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(keyboard),
      });
      return;
    }

    // Generate charts locally using chartjs-node-canvas
    let expensesChart: Buffer | undefined;
    let incomeChart: Buffer | undefined;

    // Generate expenses chart if data exists
    if (hasExpenses) {
      const expenseData = stats.expense_by_category.map((c: any) => ({
        label: c.category_name,
        value: Math.abs(c.total),
      }));

      // Sort and take top 5, group rest into "Other"
      const sorted = expenseData.sort((a, b) => b.value - a.value);
      const top = sorted.slice(0, 5);
      const rest = sorted.slice(5);

      if (rest.length > 0) {
        top.push({
          label: t('stats.other', lang),
          value: rest.reduce((sum, x) => sum + x.value, 0),
        });
      }

      const labels = top.map((item) => {
        // Find the category to get emoji
        const category = stats.expense_by_category.find((c: any) => c.category_name === item.label);
        const emoji = category ? getCategoryEmoji(category.category_slug) : '📌';
        return `${emoji} ${item.label}`;
      });
      const values = top.map((item) => item.value);

      expensesChart = await renderPieChart(labels, values, t('stats.expenses_by_category', lang));
    }

    // Generate income chart if data exists
    if (hasIncome) {
      const incomeData = stats.income_by_category.map((c: any) => ({
        label: c.category_name,
        value: Math.abs(c.total),
      }));

      // Sort and take top 5, group rest into "Other"
      const sorted = incomeData.sort((a, b) => b.value - a.value);
      const top = sorted.slice(0, 5);
      const rest = sorted.slice(5);

      if (rest.length > 0) {
        top.push({
          label: t('stats.other', lang),
          value: rest.reduce((sum, x) => sum + x.value, 0),
        });
      }

      const labels = top.map((item) => {
        // Find the category to get emoji
        const category = stats.income_by_category.find((c: any) => c.category_name === item.label);
        const emoji = category ? getCategoryEmoji(category.category_slug) : '📌';
        return `${emoji} ${item.label}`;
      });
      const values = top.map((item) => item.value);

      incomeChart = await renderPieChart(labels, values, t('stats.income_by_category', lang));
    }

    // Generate dashboard
    const dashboard = await generateDesktopDashboard({
      period: displayRange,
      totalIncome: stats.total_income,
      totalExpense: Math.abs(stats.total_expense),
      currencyCode,
      expensesChart,
      incomeChart,
      accountName: accountName || undefined,
    });

    // Build detailed caption message
    let caption = `<b>${t('stats.title', lang)}${accountName}</b>\n`;
    if (displayRange) {
      caption += `<i>${displayRange}</i>\n`;
    }
    caption += `\n`;
    caption += `${t('stats.total_expenses', lang)}: ${formatAmount(stats.total_expense, currencyCode)}\n`;
    caption += `${t('stats.total_income', lang)}: ${formatAmount(stats.total_income, currencyCode)}\n`;
    caption += `${t('stats.balance', lang)}: ${formatAmount(stats.balance, currencyCode)}\n\n`;

    // Show expenses by category if available
    if (hasExpenses) {
      caption += `<b>${t('stats.expenses_title', lang)}</b>\n`;
      caption += `<blockquote expandable>`;
      stats.expense_by_category.forEach((c) => {
        caption += `${getCategoryEmoji(c.category_slug)} ${c.category_name}: ${formatAmount(c.total, currencyCode)}\n`;
      });
      caption += `</blockquote>`;
    }

    // Show income by category if available
    if (hasIncome) {
      caption += `\n<b>${t('stats.income_title', lang)}</b>\n`;
      caption += `<blockquote expandable>`;
      stats.income_by_category.forEach((c) => {
        caption += `${getCategoryEmoji(c.category_slug)} ${c.category_name}: ${formatAmount(c.total, currencyCode)}\n`;
      });
      caption += `</blockquote>`;
    }

    // Build keyboard and send dashboard
    const keyboard = buildStatsKeyboard(period, accountId, currentDate, lang);

    await ctx.replyWithPhoto(
      { source: dashboard },
      {
        caption,
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(keyboard),
      },
    );
  } catch (error) {
    console.error('Stats handler error:', error);
    await ctx.reply(t('stats.error', 'ru')); // Fallback to ru if lang not available
  }
}

/**
 * Build the stats keyboard with navigation and period selection buttons
 */
function buildStatsKeyboard(
  period: 'month' | 'week' | 'day' | undefined,
  accountId: string | undefined,
  currentDate: string,
  lang: Language,
) {
  const keyboard = [];

  // Helper to create compact callback data
  const compactAccountId = accountId ? accountId.substring(0, 8) : 'all';
  const compactDate = (date: string) => date.replace(/-/g, ''); // Remove dashes: 2025-12-07 -> 20251207

  // Navigation buttons (if period is selected)
  if (period) {
    const prevDate = calculatePreviousPeriod(period, currentDate);
    const nextDate = calculateNextPeriod(period, currentDate);
    const canGoForward = !isFutureDate(nextDate, period);

    // Calculate display labels for navigation buttons
    const prevRange = calculateDateRange(period, prevDate, lang);
    const nextRange = calculateDateRange(period, nextDate, lang);

    const prevButton = `← ${prevRange.displayRange}`;
    const nextButton = `${nextRange.displayRange} →`;

    // Use compact format: s_np_{period}_{compactAccId}_{compactDate}
    const navButtons = [
      Markup.button.callback(
        prevButton,
        `s_np_${period[0]}_${compactAccountId}_${compactDate(currentDate)}`,
      ),
    ];

    if (canGoForward) {
      navButtons.push(
        Markup.button.callback(
          nextButton,
          `s_nn_${period[0]}_${compactAccountId}_${compactDate(currentDate)}`,
        ),
      );
    }

    keyboard.push(navButtons);
  }

  // Period selection buttons - use compact format: s_p{period}_{compactAccId}
  keyboard.push(
    [
      Markup.button.callback(t('stats.periods.month', lang), `s_pm_${compactAccountId}`),
      Markup.button.callback(t('stats.periods.week', lang), `s_pw_${compactAccountId}`),
      Markup.button.callback(t('stats.periods.day', lang), `s_pd_${compactAccountId}`),
    ],
    [Markup.button.callback(t('stats.periods.all', lang), `s_pa_${compactAccountId}`)],
    [Markup.button.callback(t('stats.change_account', lang), 'stats_change_account')],
    [Markup.button.callback(t('stats.back_to_menu', lang), 'stats_to_menu')],
  );

  return keyboard;
}

// Callback to return to menu from stats
export async function statsToMenuCallback(ctx: any) {
  await ctx.answerCbQuery();
  // Delete stats message (has image) and show menu
  await ctx.deleteMessage().catch(() => {});

  const { showMainMenu } = await import('../menu/menu.handler');
  await showMainMenu(ctx, false);
}

// Helper to expand compact account ID back to full UUID
async function expandAccountId(ctx: any, compactId: string): Promise<string | undefined> {
  if (compactId === 'all') return undefined;

  // Get all accounts and find the one that starts with compactId
  const accounts = await apiClient.getAccounts(ctx);
  const account = accounts.find((a) => a.id.startsWith(compactId));

  return account?.id;
}

// Helper to expand compact date back to ISO format
function expandDate(compactDate: string): string {
  // Convert 20251207 -> 2025-12-07
  return `${compactDate.substring(0, 4)}-${compactDate.substring(4, 6)}-${compactDate.substring(6, 8)}`;
}

// Period selection callbacks - parse compact format: s_p{period}_{compactAccId}
export async function statsPeriodMonthCallback(ctx: any) {
  const compactAccId = ctx.match[1];
  const accountId = await expandAccountId(ctx, compactAccId);

  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  await withAnimatedLoader(ctx, STATS_FRAMES, () => statsHandler(ctx, 'month', accountId));
}

export async function statsPeriodWeekCallback(ctx: any) {
  const compactAccId = ctx.match[1];
  const accountId = await expandAccountId(ctx, compactAccId);

  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  await withAnimatedLoader(ctx, STATS_FRAMES, () => statsHandler(ctx, 'week', accountId));
}

export async function statsPeriodDayCallback(ctx: any) {
  const compactAccId = ctx.match[1];
  const accountId = await expandAccountId(ctx, compactAccId);

  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  await withAnimatedLoader(ctx, STATS_FRAMES, () => statsHandler(ctx, 'day', accountId));
}

export async function statsPeriodAllCallback(ctx: any) {
  const compactAccId = ctx.match[1];
  const accountId = await expandAccountId(ctx, compactAccId);

  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  await withAnimatedLoader(ctx, STATS_FRAMES, () => statsHandler(ctx, undefined, accountId));
}

// Navigation callbacks - parse compact format: s_n{p|n}_{period_char}_{compactAccId}_{compactDate}
export async function statsNavigatePrevCallback(ctx: any) {
  const periodChar = ctx.match[1]; // m, w, or d
  const compactAccId = ctx.match[2];
  const compactDateStr = ctx.match[3];

  const periodMap: { [key: string]: 'month' | 'week' | 'day' } = {
    m: 'month',
    w: 'week',
    d: 'day',
  };
  const period = periodMap[periodChar];
  const accountId = await expandAccountId(ctx, compactAccId);
  const currentDate = expandDate(compactDateStr);

  const prevDate = calculatePreviousPeriod(period, currentDate);

  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  await withAnimatedLoader(ctx, STATS_FRAMES, () => statsHandler(ctx, period, accountId, prevDate));
}

export async function statsNavigateNextCallback(ctx: any) {
  const periodChar = ctx.match[1]; // m, w, or d
  const compactAccId = ctx.match[2];
  const compactDateStr = ctx.match[3];

  const periodMap: { [key: string]: 'month' | 'week' | 'day' } = {
    m: 'month',
    w: 'week',
    d: 'day',
  };
  const period = periodMap[periodChar];
  const accountId = await expandAccountId(ctx, compactAccId);
  const currentDate = expandDate(compactDateStr);

  const nextDate = calculateNextPeriod(period, currentDate);

  await ctx.answerCbQuery();
  await ctx.deleteMessage().catch(() => {});

  await withAnimatedLoader(ctx, STATS_FRAMES, () => statsHandler(ctx, period, accountId, nextDate));
}
