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

  const offset = zone.utcOffset(now.valueOf());
  // moment returns offset in minutes, positive is BEHIND UTC (e.g. New York is 300 (5 hours))
  // We want standard ISO format (e.g. UTC-5)
  // Actually moment.utcOffset() returns negative for behind UTC.
  // Let's use moment.format('Z') which gives +05:00

  const formattedOffset = moment.tz(timezoneName).format('Z');
  // Format: +05:00 -> UTC+5
  const shortOffset = 'UTC' + formattedOffset.replace(':00', '').replace(/^0/, '');

  return {
    offset: shortOffset,
    name: timezoneName
  };
}

export function getCommonTimezones(): Array<{ label: string; offset: string }> {
  return [
    { label: '🇺🇿 Tashkent (UTC+5)', offset: 'UTC+5' },
    { label: '🇷🇺 Moscow (UTC+3)', offset: 'UTC+3' },
    { label: '🇰🇿 Almaty (UTC+5)', offset: 'UTC+5' },
    { label: '🇺🇸 New York (UTC-5)', offset: 'UTC-5' },
    { label: '🇬🇧 London (UTC+0)', offset: 'UTC+0' },
    { label: '🇦🇪 Dubai (UTC+4)', offset: 'UTC+4' },
  ];
}

export function formatTimezone(timezone: Timezone): string {
  return `${timezone.offset} (${timezone.name})`;
}
