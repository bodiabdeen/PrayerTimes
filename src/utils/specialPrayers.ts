// src/utils/specialPrayers.ts
// Special prayers created by the admin (Firestore: prayerTimes/specialPrayers).
//
// Each item: { id, name, date: 'YYYY-MM-DD', time: 'HH:MM', showFrom, hideAfter }, where showFrom and
// hideAfter are 'YYYY-MM-DDTHH:MM' in local masjid time. An item is shown while showFrom <= now < hideAfter.
// Without hideAfter, it hides one hour after its time. The admin panel, the TV page and the website
// widget (v2) apply exactly the same rules.
//
// Pure functions only (no React Native or Firebase imports), so they are unit tested.

import {Prayer, SpecialPrayerItem} from '../types';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_HIDE_MINUTES = 60;
export const MAX_NAME_LENGTH = 60;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local date as 'YYYY-MM-DD' */
export const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Local date and time as 'YYYY-MM-DDTHH:MM' (sorts and compares correctly as text) */
export const toMinuteKey = (d: Date): string =>
  `${toDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** dateKey + time + minutes, as a minute key. Uses local time, so clock changes are handled. */
export const addMinutesToKey = (dateKey: string, time: string, minutes: number): string => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return toMinuteKey(new Date(y, m - 1, d, hh, mm + minutes));
};

/** Reads the Firestore document safely. Bad items are skipped; the result is sorted by date and time. */
export const parseSpecialPrayers = (data: unknown): SpecialPrayerItem[] => {
  const list = (data as {list?: unknown} | null | undefined)?.list;
  if (!Array.isArray(list)) {
    return [];
  }
  const items: SpecialPrayerItem[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, MAX_NAME_LENGTH) : '';
    const date = typeof r.date === 'string' ? r.date : '';
    const time = typeof r.time === 'string' ? r.time : '';
    if (!name || !DATE_RE.test(date) || !TIME_RE.test(time)) {
      continue;
    }
    const showFrom =
      typeof r.showFrom === 'string' && DATETIME_RE.test(r.showFrom) ? r.showFrom : '';
    const hideAfter =
      typeof r.hideAfter === 'string' && DATETIME_RE.test(r.hideAfter)
        ? r.hideAfter
        : addMinutesToKey(date, time, DEFAULT_HIDE_MINUTES);
    items.push({
      id: r.id !== undefined && r.id !== null ? String(r.id) : `${date}T${time}`,
      name,
      date,
      time,
      showFrom,
      hideAfter,
    });
  }
  return items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
};

/** True while showFrom <= now < hideAfter */
export const isSpecialPrayerVisible = (
  item: {showFrom?: string; hideAfter?: string},
  now: Date,
): boolean => {
  if (!item.hideAfter) {
    return false;
  }
  const key = toMinuteKey(now);
  return (!item.showFrom || item.showFrom <= key) && key < item.hideAfter;
};

/**
 * Rows for the prayer list: every item that has not expired yet. Items whose showFrom is still in the
 * future are kept too, so they appear on time while the app stays open; the list re-checks visibility
 * every minute when it draws.
 */
export const buildSpecialPrayerRows = (items: SpecialPrayerItem[], now: Date): Prayer[] => {
  const nowKey = toMinuteKey(now);
  return items
    .filter(item => nowKey < item.hideAfter)
    .map(item => ({
      name: item.name,
      nameArabic: '',
      apt: '--:--',
      mat: '--:--',
      mit: item.time,
      isNext: false,
      isSpecial: true,
      isCustom: true,
      customId: item.id,
      date: item.date,
      showFrom: item.showFrom,
      hideAfter: item.hideAfter,
    }));
};

/** A short date such as "Fri 20 Nov" for a 'YYYY-MM-DD' key */
export const formatShortDate = (dateKey: string): string => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAYS[date.getDay()]} ${d} ${MONTHS[m - 1]}`;
};

/** "Today", "Tomorrow" or a short date such as "Fri 20 Nov", with Arabic where it is a word. */
export const formatSpecialPrayerDay = (dateKey: string, now: Date): {en: string; ar: string} => {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (dateKey === toDateKey(now)) {
    return {en: 'Today', ar: 'اليوم'};
  }
  if (dateKey === toDateKey(tomorrow)) {
    return {en: 'Tomorrow', ar: 'غدًا'};
  }
  return {en: formatShortDate(dateKey), ar: ''};
};
