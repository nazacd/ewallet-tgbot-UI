export type Timezone = {
  offset: string;
  name: string;
};

const cityTimezones: Record<string, Timezone> = {
  ташкент: { offset: 'UTC+5', name: 'Asia/Tashkent' },
  tashkent: { offset: 'UTC+5', name: 'Asia/Tashkent' },
  самарканд: { offset: 'UTC+5', name: 'Asia/Samarkand' },
  samarkand: { offset: 'UTC+5', name: 'Asia/Samarkand' },
  москва: { offset: 'UTC+3', name: 'Europe/Moscow' },
  moscow: { offset: 'UTC+3', name: 'Europe/Moscow' },
  'санкт-петербург': { offset: 'UTC+3', name: 'Europe/Moscow' },
  petersburg: { offset: 'UTC+3', name: 'Europe/Moscow' },
  алматы: { offset: 'UTC+6', name: 'Asia/Almaty' },
  almaty: { offset: 'UTC+6', name: 'Asia/Almaty' },
  астана: { offset: 'UTC+6', name: 'Asia/Almaty' },
  astana: { offset: 'UTC+6', name: 'Asia/Almaty' },
  'нур-султан': { offset: 'UTC+6', name: 'Asia/Almaty' },
  бишкек: { offset: 'UTC+6', name: 'Asia/Bishkek' },
  bishkek: { offset: 'UTC+6', name: 'Asia/Bishkek' },
};

export function parseTimezoneFromCity(cityName: string): Timezone | null {
  const normalized = cityName.toLowerCase().trim();
  return cityTimezones[normalized] || null;
}

export function parseTimezoneFromCoordinates(lat: number, lon: number): Timezone {
  if (lon >= 56 && lon <= 73 && lat >= 37 && lat <= 46) {
    return { offset: 'UTC+5', name: 'Asia/Tashkent' };
  }
  if (lon >= 35 && lon <= 50 && lat >= 50 && lat <= 60) {
    return { offset: 'UTC+3', name: 'Europe/Moscow' };
  }
  if (lon >= 46 && lon <= 87 && lat >= 40 && lat <= 55) {
    return { offset: 'UTC+6', name: 'Asia/Almaty' };
  }
  if (lat >= 35 && lat <= 50) {
    return { offset: 'UTC+5', name: 'Asia/Tashkent' };
  }
  return { offset: 'UTC+0', name: 'UTC' };
}

export function getCommonTimezones(): Array<{ label: string; offset: string }> {
  return [
    { label: '🇺🇿 UTC+5 (Tashkent)', offset: 'UTC+5' },
    { label: '🇷🇺 UTC+3 (Moscow)', offset: 'UTC+3' },
    { label: '🇰🇿 UTC+6 (Almaty)', offset: 'UTC+6' },
  ];
}

export function formatTimezone(timezone: Timezone): string {
  return `${timezone.offset} (${timezone.name})`;
}
