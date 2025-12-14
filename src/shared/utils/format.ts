// Format amount with thousand separators
export function formatAmount(amount: number, currencyCode?: string): string {
  const formatted = amount.toLocaleString('en-US');
  return currencyCode ? `${formatted} ${currencyCode}` : formatted;
}

// Convert timezone offset string (e.g. "UTC+5", "+05:30") to minutes
export function getTimezoneOffsetMinutes(timezone?: string): number {
  if (!timezone) return 0;

  const cleaned = timezone.toUpperCase().replace('UTC', '').replace('GMT', '').trim();
  if (!cleaned) return 0;

  const match = cleaned.match(/^([+-]?)(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === '-' ? -1 : 1;
  const hours = parseInt(match[2], 10) || 0;
  const minutes = parseInt(match[3] || '0', 10) || 0;

  return sign * (hours * 60 + minutes);
}

// Convert a date to user's timezone (offset-based) while keeping backend values in UTC
export function convertToTimezone(
  dateInput: string | number | Date,
  timezone?: string,
): Date {
  const baseDate =
    typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : new Date(dateInput.getTime());

  const timestamp = baseDate.getTime();
  if (Number.isNaN(timestamp)) {
    return new Date();
  }

  const offsetMinutes = getTimezoneOffsetMinutes(timezone);
  return new Date(timestamp + offsetMinutes * 60 * 1000);
}

// Format date to readable format
export function formatDate(
  dateInput: string | Date,
  options: { timezone?: string; locale?: string } = {},
): string {
  const { timezone, locale = 'en-US' } = options;
  console.log('timezone', timezone);

  // Shift to the user's timezone first, then format in UTC to avoid host timezone side effects
  const date = convertToTimezone(dateInput, timezone);
  const now = convertToTimezone(new Date(), timezone);

  const dateKey = date.toISOString().slice(0, 10);
  const todayKey = now.toISOString().slice(0, 10);

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const isToday = dateKey === todayKey;
  const isYesterday = dateKey === yesterdayKey;

  if (isToday) {
    return `Today, ${date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    })}`;
  }

  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    })}`;
  }

  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function formatDateTime(
  dateInput: string | Date,
  options: {
    timezone?: string;
    locale?: string;
    formatOptions?: Intl.DateTimeFormatOptions;
  } = {},
): string {
  const { timezone, locale = 'en-US', formatOptions } = options;
  const date = convertToTimezone(dateInput, timezone);

  return date.toLocaleString(locale, {
    timeZone: 'UTC',
    ...formatOptions,
  });
}

// Get transaction emoji based on type
export function getTransactionEmoji(type: 'withdrawal' | 'deposit'): string {
  return type === 'withdrawal' ? '↗️' : '↘️';
}

// Get category emoji (you can expand this)
export function getCategoryEmoji(categorySlug: string): string {
  const emojiMap: Record<string, string> = {
    'food-dining': '🍽️',
    transport: '🚌',
    groceries: '🛒',
    shopping: '🛍️',
    entertainment: '🎉',
    'health-medical': '🩺',
    housing: '🏠',
    utilities: '💡',
    education: '📚',
    'personal-care': '💅',
    travel: '✈️',
    'gifts-donations': '🎁',
    insurance: '🛡️',
    investments: '📈',
    salary: '💼',
    freelance: '🧑‍💻',
    'business-income': '🏢',
    refunds: '↩️',
    'fees-charges': '💸',
    subscriptions: '🔁',
    pets: '🐾',
    'sports-fitness': '🏋️‍♂️',
    bills: '🧾',
    taxes: '🏦',
    other: '📦',
  };

  const key = categorySlug.toLowerCase();
  return emojiMap[key] || '📌';
}

// Escape markdown special characters for Telegram
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

export function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function truncateLabel(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

export function formatCompactAmount(amount: number): string {
  const abs = Math.abs(amount);

  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    const str = v >= 10 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, '');
    return `${str}M`;
  }

  if (abs >= 1_000) {
    const v = abs / 1_000;
    const str = v >= 10 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, '');
    return `${str}K`;
  }

  return abs.toString();
}
