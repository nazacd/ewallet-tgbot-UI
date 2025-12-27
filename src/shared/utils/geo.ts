// @ts-ignore - no type declarations available
import * as GeoTz from 'geo-tz';
// @ts-ignore - no type declarations available
import cityTimezones from 'city-timezones';
// @ts-ignore - no type declarations available
import moment from 'moment-timezone';

export type Timezone = {
  offset: string;
  name: string;
};

/**
 * Get timezone from city name using city-timezones lib
 */
export function parseTimezoneFromCity(cityName: string): Timezone | null {
  const cityLookup = cityTimezones.lookupViaCity(cityName);

  if (cityLookup && cityLookup.length > 0) {
    // Take the first match
    const timezoneName = cityLookup[0].timezone;
    return createTimezoneObject(timezoneName);
  }

  return null;
}

/**
 * Get timezone from coordinates using geo-tz lib
 */
export function parseTimezoneFromCoordinates(lat: number, lon: number): Timezone {
  try {
    const timezones = GeoTz.find(lat, lon);
    if (timezones && timezones.length > 0) {
      return createTimezoneObject(timezones[0]);
    }
  } catch (error) {
    console.error('Error finding timezone from coordinates:', error);
  }

  // Default to UTC if not found
  return { offset: 'UTC+0', name: 'UTC' };
}

/**
 * Helper to create Timezone object with formatted offset
 */
function createTimezoneObject(timezoneName: string): Timezone {
  const now = moment();
  const zone = moment.tz.zone(timezoneName);

  if (!zone) {
    return { offset: 'UTC+0', name: timezoneName };
  }

  // Use the IANA name as the primary identifier (stored in 'name')
  // We still calculate offset for display purposes

  const formattedOffset = moment.tz(timezoneName).format('Z');
  // Format: +05:00 -> UTC+5
  const shortOffset = 'UTC' + formattedOffset.replace(':00', '').replace(/^0/, '');

  return {
    offset: shortOffset, // Keep for backward compatibility/display
    name: timezoneName   // This is now the IANA name (e.g., 'Asia/Tashkent')
  };
}

export function getCommonTimezones(): Array<{ label: string; value: string }> {
  return [
    { label: '🇺🇿 Tashkent (Asia/Tashkent)', value: 'Asia/Tashkent' },
    { label: '🇷🇺 Moscow (Europe/Moscow)', value: 'Europe/Moscow' },
    { label: '🇰🇿 Almaty (Asia/Almaty)', value: 'Asia/Almaty' },
    { label: '🇺🇸 New York (America/New_York)', value: 'America/New_York' },
    { label: '🇬🇧 London (Europe/London)', value: 'Europe/London' },
    { label: '🇦🇪 Dubai (Asia/Dubai)', value: 'Asia/Dubai' },
  ];
}

export function formatTimezone(timezone: Timezone): string {
  // Prefer showing the Name (IANA) but maybe include offset for clarity?
  // Current UI exp: "UTC+5 (Asia/Tashkent)"
  return `${timezone.offset} (${timezone.name})`;
}
