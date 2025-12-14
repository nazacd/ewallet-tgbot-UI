// Format amount with thousand separators
export function formatAmount(amount: number, currencyCode?: string): string {
  const formatted = amount.toLocaleString('en-US');
  return currencyCode ? `${formatted} ${currencyCode}` : formatted;
}

// Format date to readable format
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
