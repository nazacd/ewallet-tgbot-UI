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
    minute: '2-digit'
  });
}

// Get transaction emoji based on type
export function getTransactionEmoji(type: 'income' | 'expense'): string {
  return type === 'income' ? '↗️' : '↘️';
}

// Get category emoji (you can expand this)
export function getCategoryEmoji(categoryName: string): string {
  const emojiMap: Record<string, string> = {
    'food': '🍽️',
    'transport': '🚗',
    'groceries': '🛒',
    'shopping': '🛍️',
    'entertainment': '🎬',
    'health': '⚕️',
    'housing': '🏠',
    'salary': '💼',
    'other': '📦',
  };
  
  const key = categoryName.toLowerCase();
  return emojiMap[key] || '📌';
}

// Escape markdown special characters for Telegram
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}
