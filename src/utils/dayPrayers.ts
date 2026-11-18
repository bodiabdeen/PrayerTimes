// src/utils/dayPrayers.ts
// Builds one day's prayer list. v1.6: used for today AND tomorrow, so both follow exactly the same rules.
// Moved unchanged from fetchAllPrayerData (firebaseService.ts). Pure functions only, so it is unit tested.
//
// MAT / MIT priority (highest first):
//   1. scheduledTimes[date][prayer]     per-date override
//   2. dailyConfig (daily manual times)  default
//   3. start time + fallbackRules offsets (MIT uses the resolved MAT)

import {ApiConfig, DailyConfig, Prayer, SpecialPrayerItem} from '../types';
import {PRAYER_NAMES} from './constants';
import {applyTimeOffset} from './dateUtils';
import {buildSpecialPrayerRows} from './specialPrayers';

type DailyPrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type PrayerFallbackRule = {
  matOffset: number; // Minutes to add to APT when MAT is still empty after all checks
  mitOffset: number; // Minutes to add to MAT when MIT is still empty after all checks
};

export type FallbackRules = Record<DailyPrayerKey, PrayerFallbackRule>;

/** Per-prayer scheduled values for one date (any of them may be missing) */
export type ScheduledPrayerTimes = Partial<Record<DailyPrayerKey, {mat?: string; mit?: string}>>;

/** Aladhan times for one day, before offsets, as "HH:MM" */
export type RawDayTimes = Record<DailyPrayerKey | 'sunrise', string>;

export interface DayPrayersInput {
  rawTimes: RawDayTimes;
  offsets: ApiConfig['offsetMinutes'];
  dailyConfig: DailyConfig;
  scheduled: ScheduledPrayerTimes | null | undefined;
  fallbackRules: FallbackRules;
  /** Admin special prayers to list for this day (already chosen by the caller) */
  specialPrayers: SpecialPrayerItem[];
  now: Date;
}

/** Returns true only if a time string is a valid, non-empty, non-zero time. */
const isValidTime = (t: string | undefined | null): boolean => {
  return !!t && t !== '' && t !== '00:00';
};

const buildPrayer = (
  prayerKey: DailyPrayerKey,
  aptTime: string,
  dailyMat: string,
  dailyMit: string,
  schedMat: string | undefined,
  schedMit: string | undefined,
  rules: PrayerFallbackRule,
): Prayer => {
  // Resolve MAT: scheduled first, then daily, then APT+offset
  const resolvedMat = isValidTime(schedMat) ? schedMat!
                    : isValidTime(dailyMat) ? dailyMat
                    : applyTimeOffset(aptTime, rules.matOffset);

  // Resolve MIT: scheduled first, then daily, then resolvedMAT+offset
  const resolvedMit = isValidTime(schedMit) ? schedMit!
                    : isValidTime(dailyMit) ? dailyMit
                    : applyTimeOffset(resolvedMat, rules.mitOffset);

  return {
    name: PRAYER_NAMES[prayerKey].en,
    nameArabic: PRAYER_NAMES[prayerKey].ar,
    apt: aptTime,
    mat: resolvedMat,
    mit: resolvedMit,
    isNext: false,
  };
};

export const buildDayPrayers = (input: DayPrayersInput): Prayer[] => {
  const {rawTimes, offsets, dailyConfig, scheduled, fallbackRules, specialPrayers, now} = input;

  const apt = {
    fajr: applyTimeOffset(rawTimes.fajr, offsets.fajr),
    sunrise: rawTimes.sunrise,
    dhuhr: applyTimeOffset(rawTimes.dhuhr, offsets.dhuhr),
    asr: applyTimeOffset(rawTimes.asr, offsets.asr),
    maghrib: applyTimeOffset(rawTimes.maghrib, offsets.maghrib),
    isha: applyTimeOffset(rawTimes.isha, offsets.isha),
  };

  const row = (key: DailyPrayerKey) =>
    buildPrayer(key, apt[key], dailyConfig.mat[key], dailyConfig.mit[key], scheduled?.[key]?.mat, scheduled?.[key]?.mit, fallbackRules[key]);

  const prayers: Prayer[] = [
    row('fajr'),
    {
      name: PRAYER_NAMES.sunrise.en,
      nameArabic: PRAYER_NAMES.sunrise.ar,
      apt: apt.sunrise, mat: '--:--', mit: '--:--', isNext: false,
    },
    row('dhuhr'),
    row('asr'),
    row('maghrib'),
    row('isha'),
  ];

  // Special prayers (not affected by scheduled times: they use dailyConfig as before)
  if (dailyConfig.specialPrayers.jumaa?.iqama) {
    const idx = prayers.findIndex(p => p.name === PRAYER_NAMES.dhuhr.en);
    if (idx !== -1) {
      prayers.splice(idx + 1, 0, {
        name: PRAYER_NAMES.jumaa.en, nameArabic: PRAYER_NAMES.jumaa.ar,
        apt: '--:--', mat: dailyConfig.specialPrayers.jumaa.adhan,
        mit: dailyConfig.specialPrayers.jumaa.iqama, isNext: false,
      });
    }
  }

  // 2nd Jumu'ah: optional, only shown when set in dailyConfig (new app only field)
  if (dailyConfig.specialPrayers.jumaa2?.iqama) {
    const jumaaIdx = prayers.findIndex(p => p.name === PRAYER_NAMES.jumaa.en);
    const dhuhrIdx = prayers.findIndex(p => p.name === PRAYER_NAMES.dhuhr.en);
    const insertAt = jumaaIdx !== -1 ? jumaaIdx + 1 : dhuhrIdx + 1;
    if (insertAt !== -1) {
      prayers.splice(insertAt, 0, {
        name: PRAYER_NAMES.jumaa2.en, nameArabic: PRAYER_NAMES.jumaa2.ar,
        apt: '--:--', mat: dailyConfig.specialPrayers.jumaa2.adhan,
        mit: dailyConfig.specialPrayers.jumaa2.iqama, isNext: false,
      });
    }
  }

  if (dailyConfig.specialPrayers.taraweeh?.time) {
    const idx = prayers.findIndex(p => p.name === PRAYER_NAMES.isha.en);
    if (idx !== -1) {
      prayers.splice(idx + 1, 0, {
        name: PRAYER_NAMES.taraweeh.en, nameArabic: PRAYER_NAMES.taraweeh.ar,
        apt: '--:--', mat: dailyConfig.specialPrayers.taraweeh.time,
        mit: dailyConfig.specialPrayers.taraweeh.time, isNext: false, isSpecial: true,
      });
    }
  }

  if (dailyConfig.specialPrayers.eidFitr?.prayer1?.time) {
    prayers.push({ name: `${PRAYER_NAMES.eidFitr.en} - Prayer 1`, nameArabic: `${PRAYER_NAMES.eidFitr.ar} - صلاة ١`, apt: '--:--', mat: '--:--', mit: dailyConfig.specialPrayers.eidFitr.prayer1.time, isNext: false, isSpecial: true });
  }
  if (dailyConfig.specialPrayers.eidFitr?.prayer2?.time) {
    prayers.push({ name: `${PRAYER_NAMES.eidFitr.en} - Prayer 2`, nameArabic: `${PRAYER_NAMES.eidFitr.ar} - صلاة ٢`, apt: '--:--', mat: '--:--', mit: dailyConfig.specialPrayers.eidFitr.prayer2.time, isNext: false, isSpecial: true });
  }
  if (dailyConfig.specialPrayers.eidAdha?.prayer1?.time) {
    prayers.push({ name: `${PRAYER_NAMES.eidAdha.en} - Prayer 1`, nameArabic: `${PRAYER_NAMES.eidAdha.ar} - صلاة ١`, apt: '--:--', mat: '--:--', mit: dailyConfig.specialPrayers.eidAdha.prayer1.time, isNext: false, isSpecial: true });
  }
  if (dailyConfig.specialPrayers.eidAdha?.prayer2?.time) {
    prayers.push({ name: `${PRAYER_NAMES.eidAdha.en} - Prayer 2`, nameArabic: `${PRAYER_NAMES.eidAdha.ar} - صلاة ٢`, apt: '--:--', mat: '--:--', mit: dailyConfig.specialPrayers.eidAdha.prayer2.time, isNext: false, isSpecial: true });
  }

  // v1.6: special prayers created by the admin, after the built-in special prayers.
  // They have no APT, so they never become the "next prayer", the widget or the countdown.
  prayers.push(...buildSpecialPrayerRows(specialPrayers, now));

  return prayers;
};
