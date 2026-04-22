// src/services/firebaseService.ts
// Firebase Firestore integration service (modular API for v22+)
//
// MAT / MIT PRIORITY CHAIN (highest → lowest):
//   ① scheduledTimes[today][prayer]  — per-date advance override (new app only)
//   ② dailyConfig.dailyPrayers[prayer] — default manual times (old + new app)
//   ③ APT + fallbackRules[prayer].matOffset / mitOffset — auto calc (old + new app)
//
// The old installed app never reads "scheduledTimes" — it only reads
// "dailyConfig", "apiConfig", "fallbackRules", "announcements", "menuLinks".
// Publishing this update therefore has ZERO impact on currently installed devices.

import {
  getFirestore,
  doc,
  getDoc,
} from '@react-native-firebase/firestore';
import { getApps } from '@react-native-firebase/app';
import { FIREBASE_CONFIG, PRAYER_NAMES } from '../utils/constants';
import { ApiConfig, DailyConfig, AnnouncementsData, CombinedPrayerData, Prayer } from '../types';
import {
  fetchPrayerTimesFromAladhan,
  convertAladhanTimings,
  formatAladhanGregorianDate,
  formatAladhanHijriDate,
} from './aladhanService';
import { applyTimeOffset } from '../utils/dateUtils';
import { getNextPrayer } from '../utils/prayerUtils';

export type MenuLink = {
  id: string;
  displayName: string;
  url: string;
  icon: string;
};

// Per-prayer fallback offsets fetched from Firebase fallbackRules document
type PrayerFallbackRule = {
  matOffset: number; // Minutes to add to APT when MAT is still empty after all checks
  mitOffset: number; // Minutes to add to MAT when MIT is still empty after all checks
};

type FallbackRules = {
  fajr: PrayerFallbackRule;
  dhuhr: PrayerFallbackRule;
  asr: PrayerFallbackRule;
  maghrib: PrayerFallbackRule;
  isha: PrayerFallbackRule;
};

// Per-prayer scheduled values for a specific date
type ScheduledPrayerTimes = {
  fajr:    { mat: string; mit: string };
  dhuhr:   { mat: string; mit: string };
  asr:     { mat: string; mit: string };
  maghrib: { mat: string; mit: string };
  isha:    { mat: string; mit: string };
};

// Safe defaults used if fallbackRules document is missing
const DEFAULT_FALLBACK_RULES: FallbackRules = {
  fajr:    { matOffset: 0, mitOffset: 5 },
  dhuhr:   { matOffset: 0, mitOffset: 5 },
  asr:     { matOffset: 0, mitOffset: 5 },
  maghrib: { matOffset: 0, mitOffset: 5 },
  isha:    { matOffset: 0, mitOffset: 5 },
};

/**
 * Returns today's date key in YYYY-MM-DD format using local device time.
 */
const getTodayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Returns true only if a time string is a valid, non-empty, non-zero time.
 */
const isValidTime = (t: string | undefined | null): boolean => {
  return !!t && t !== '' && t !== '00:00';
};

// ─────────────────────────────────────────────────────────────────────────
// Initialize Firebase
// ─────────────────────────────────────────────────────────────────────────
export const initializeFirebase = async (): Promise<void> => {
  try {
    const apps = getApps();
    if (apps.length > 0) {
      console.log('✅ Firebase already initialized');
      return;
    }
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Fetch API config  (prayerTimes/apiConfig)
// ✅ Used by: old app + new app
// ─────────────────────────────────────────────────────────────────────────
export const fetchApiConfig = async (): Promise<ApiConfig | null> => {
  try {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.API_CONFIG));

    if (!docSnap.exists) {
      console.error('❌ API config document not found');
      return null;
    }

    const r = docSnap.data();
    const data: ApiConfig = {
      method:    r?.method    || 4,
      latitude:  r?.latitude  || 54.15,
      longitude: r?.longitude || -4.48,
      timezone:  'Europe/Jersey',
      offsetMinutes: {
        fajr:    r?.offsets?.fajr    || 0,
        dhuhr:   r?.offsets?.dhuhr   || 0,
        asr:     r?.offsets?.asr     || 0,
        maghrib: r?.offsets?.maghrib || 0,
        isha:    r?.offsets?.isha    || 0,
        school:  r?.offsets?.school  || 0,
      },
    };

    console.log('✅ API config fetched');
    return data;
  } catch (error) {
    console.error('❌ Error fetching API config:', error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Fetch fallback rules  (prayerTimes/fallbackRules)
// ✅ Used by: old app + new app
// ─────────────────────────────────────────────────────────────────────────
export const fetchFallbackRules = async (): Promise<FallbackRules> => {
  try {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.FALLBACK_RULES));

    if (!docSnap.exists) {
      console.warn('⚠️ fallbackRules not found, using defaults');
      return DEFAULT_FALLBACK_RULES;
    }

    const r = docSnap.data();
    const rules: FallbackRules = {
      fajr:    { matOffset: r?.fajr?.matOffset    ?? 0, mitOffset: r?.fajr?.mitOffset    ?? 5 },
      dhuhr:   { matOffset: r?.dhuhr?.matOffset   ?? 0, mitOffset: r?.dhuhr?.mitOffset   ?? 5 },
      asr:     { matOffset: r?.asr?.matOffset     ?? 0, mitOffset: r?.asr?.mitOffset     ?? 5 },
      maghrib: { matOffset: r?.maghrib?.matOffset ?? 0, mitOffset: r?.maghrib?.mitOffset ?? 5 },
      isha:    { matOffset: r?.isha?.matOffset    ?? 0, mitOffset: r?.isha?.mitOffset    ?? 5 },
    };

    console.log('✅ Fallback rules fetched');
    return rules;
  } catch (error) {
    console.error('❌ Error fetching fallback rules, using defaults:', error);
    return DEFAULT_FALLBACK_RULES;
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Fetch daily config  (prayerTimes/dailyConfig)
// ✅ Used by: old app + new app
// ─────────────────────────────────────────────────────────────────────────
export const fetchDailyConfig = async (): Promise<DailyConfig | null> => {
  try {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.DAILY_CONFIG));

    if (!docSnap.exists) {
      console.error('❌ Daily config document not found');
      return null;
    }

    const rawData = docSnap.data();

    if (!rawData?.dailyPrayers) {
      console.error('❌ dailyPrayers field not found');
      return null;
    }

    const dp = rawData.dailyPrayers;

    const data: DailyConfig = {
      mat: {
        fajr:    dp?.fajr?.mat    || '00:00',
        dhuhr:   dp?.dhuhr?.mat   || '00:00',
        asr:     dp?.asr?.mat     || '00:00',
        maghrib: dp?.maghrib?.mat || '00:00',
        isha:    dp?.isha?.mat    || '00:00',
      },
      mit: {
        fajr:    dp?.fajr?.mit    || '00:00',
        dhuhr:   dp?.dhuhr?.mit   || '00:00',
        asr:     dp?.asr?.mit     || '00:00',
        maghrib: dp?.maghrib?.mit || '00:00',
        isha:    dp?.isha?.mit    || '00:00',
      },
      specialPrayers: {
        jumaa: rawData.jumaa ? {
          adhan: rawData.jumaa.adhan_khutba || '',
          iqama: rawData.jumaa.iqama || '',
        } : undefined,
        taraweeh: rawData.taraweeh?.time ? {
          time: rawData.taraweeh.time,
        } : undefined,
        eidAdha: rawData.eid?.adha ? {
          prayer1: rawData.eid.adha.prayer1 || { time: '' },
          prayer2: rawData.eid.adha.prayer2 || { time: '' },
        } : undefined,
        eidFitr: rawData.eid?.fitr ? {
          prayer1: rawData.eid.fitr.prayer1 || { time: '' },
          prayer2: rawData.eid.fitr.prayer2 || { time: '' },
        } : undefined,
      },
    };

    console.log('✅ Daily config fetched');
    return data;
  } catch (error) {
    console.error('❌ Error fetching daily config:', error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Fetch scheduled times for today  (prayerTimes/scheduledTimes)
// ★ Used by: new app ONLY
//   The old installed app never calls this function and never reads this
//   Firestore document. Publishing the new app does not affect live users.
// ─────────────────────────────────────────────────────────────────────────
export const fetchScheduledTimesForToday = async (): Promise<ScheduledPrayerTimes | null> => {
  try {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.SCHEDULED_TIMES));

    if (!docSnap.exists) {
      console.log('📅 No scheduledTimes document — using daily config');
      return null;
    }

    const all = docSnap.data();
    const todayKey = getTodayKey();
    const todayEntry = all?.[todayKey];

    if (!todayEntry) {
      console.log(`📅 No scheduled entry for today (${todayKey}) — using daily config`);
      return null;
    }

    console.log(`✅ Scheduled times found for today (${todayKey})`);
    return todayEntry as ScheduledPrayerTimes;
  } catch (error) {
    // Non-fatal: if this fails, the app falls back gracefully to dailyConfig
    console.error('❌ Error fetching scheduled times (falling back to daily config):', error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Fetch menu links  (prayerTimes/menuLinks)
// ✅ Used by: old app + new app
// ─────────────────────────────────────────────────────────────────────────
export const fetchMenuLinks = async (): Promise<MenuLink[] | null> => {
  try {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.MENU_LINKS));

    if (!docSnap.exists) return [];

    const rawData = docSnap.data();
    const links: MenuLink[] = (rawData?.links || []).map((link: any) => ({
      id: link.id,
      displayName: link.displayName,
      url: link.url,
      icon: link.icon,
    }));

    console.log('✅ Menu links fetched');
    return links;
  } catch (error) {
    console.error('❌ Error fetching menu links:', error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Fetch announcements  (prayerTimes/announcements)
// ✅ Used by: old app + new app
// ─────────────────────────────────────────────────────────────────────────
export const fetchAnnouncements = async (): Promise<AnnouncementsData | null> => {
  try {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.ANNOUNCEMENTS));

    if (!docSnap.exists) return { list: [], lastUpdated: null };

    console.log('✅ Announcements fetched');
    return docSnap.data() as AnnouncementsData;
  } catch (error) {
    console.error('❌ Error fetching announcements:', error);
    return { list: [], lastUpdated: null };
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Combine all data — main entry point called by the app
// ─────────────────────────────────────────────────────────────────────────
export const fetchAllPrayerData = async (): Promise<CombinedPrayerData | null> => {
  try {
    console.log('🔄 Starting data fetch...');

    // 1. API config
    const apiConfig = await fetchApiConfig();
    if (!apiConfig) throw new Error('Failed to fetch API config');

    // 2. Aladhan prayer times (APT)
    const today = new Date();
    const aladhanData = await fetchPrayerTimesFromAladhan(
      today,
      apiConfig.method,
      apiConfig.latitude,
      apiConfig.longitude
    );
    if (!aladhanData) throw new Error('Failed to fetch prayer times from Aladhan');

    const aptTimings = convertAladhanTimings(aladhanData.timings);
    const apt = {
      fajr:    applyTimeOffset(aptTimings.fajr,    apiConfig.offsetMinutes.fajr),
      sunrise: aptTimings.sunrise,
      dhuhr:   applyTimeOffset(aptTimings.dhuhr,   apiConfig.offsetMinutes.dhuhr),
      asr:     applyTimeOffset(aptTimings.asr,     apiConfig.offsetMinutes.asr),
      maghrib: applyTimeOffset(aptTimings.maghrib, apiConfig.offsetMinutes.maghrib),
      isha:    applyTimeOffset(aptTimings.isha,    apiConfig.offsetMinutes.isha),
    };

    // 3. Daily config (② priority)
    const dailyConfig = await fetchDailyConfig();
    if (!dailyConfig) throw new Error('Failed to fetch daily config');

    // 4. Scheduled times for today (① priority — new app only)
    //    Returns null if no entry exists for today, which is the common case.
    //    Failure here is non-fatal and silently falls back to dailyConfig.
    const scheduled = await fetchScheduledTimesForToday();

    // 5. Fallback rules (③ priority)
    const fallbackRules = await fetchFallbackRules();

    // 6. Announcements
    const announcementsData = await fetchAnnouncements() || { list: [], lastUpdated: null };

    // ── Resolve MAT/MIT for each prayer ──────────────────────────────────
    //
    //  Priority:
    //    ① scheduled[prayer].mat/mit  (non-empty)
    //    ② dailyConfig.mat/mit[prayer] (non-empty)
    //    ③ APT + fallbackRules[prayer].matOffset / mitOffset
    //
    const buildPrayer = (
      prayerKey: string,
      aptTime: string,
      dailyMat: string,
      dailyMit: string,
      schedMat: string | undefined,
      schedMit: string | undefined,
      rules: PrayerFallbackRule,
    ): Prayer => {
      // Resolve MAT: scheduled first, then daily, then APT+offset
      const resolvedMat = isValidTime(schedMat)  ? schedMat!
                        : isValidTime(dailyMat)   ? dailyMat
                        : applyTimeOffset(aptTime, rules.matOffset);

      // Resolve MIT: scheduled first, then daily, then resolvedMAT+offset
      const resolvedMit = isValidTime(schedMit)  ? schedMit!
                        : isValidTime(dailyMit)   ? dailyMit
                        : applyTimeOffset(resolvedMat, rules.mitOffset);

      return {
        name:       PRAYER_NAMES[prayerKey as keyof typeof PRAYER_NAMES].en,
        nameArabic: PRAYER_NAMES[prayerKey as keyof typeof PRAYER_NAMES].ar,
        apt:        aptTime,
        mat:        resolvedMat,
        mit:        resolvedMit,
        isNext:     false,
      };
    };

    const prayers: Prayer[] = [
      buildPrayer('fajr',    apt.fajr,    dailyConfig.mat.fajr,    dailyConfig.mit.fajr,    scheduled?.fajr?.mat,    scheduled?.fajr?.mit,    fallbackRules.fajr),
      {
        name: PRAYER_NAMES.sunrise.en,
        nameArabic: PRAYER_NAMES.sunrise.ar,
        apt: apt.sunrise, mat: '--:--', mit: '--:--', isNext: false,
      },
      buildPrayer('dhuhr',   apt.dhuhr,   dailyConfig.mat.dhuhr,   dailyConfig.mit.dhuhr,   scheduled?.dhuhr?.mat,   scheduled?.dhuhr?.mit,   fallbackRules.dhuhr),
      buildPrayer('asr',     apt.asr,     dailyConfig.mat.asr,     dailyConfig.mit.asr,     scheduled?.asr?.mat,     scheduled?.asr?.mit,     fallbackRules.asr),
      buildPrayer('maghrib', apt.maghrib, dailyConfig.mat.maghrib, dailyConfig.mit.maghrib, scheduled?.maghrib?.mat, scheduled?.maghrib?.mit, fallbackRules.maghrib),
      buildPrayer('isha',    apt.isha,    dailyConfig.mat.isha,    dailyConfig.mit.isha,    scheduled?.isha?.mat,    scheduled?.isha?.mit,    fallbackRules.isha),
    ];

    // Special prayers (not affected by scheduled times — use dailyConfig as before)
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

    // Mark next prayer
    const nextPrayer = getNextPrayer(prayers);
    prayers.forEach(p => { p.isNext = nextPrayer ? p.name === nextPrayer.name : false; });

    const result: CombinedPrayerData = {
      prayers,
      gregorianDate: formatAladhanGregorianDate(aladhanData.date),
      hijriDate:     formatAladhanHijriDate(aladhanData.date),
      announcements: announcementsData.list || [],
      lastUpdated:   new Date().toISOString(),
      nextPrayer,
      apiConfig,
    };

    console.log('✅ All prayer data combined successfully');
    return result;
  } catch (error) {
    console.error('❌ Error fetching all prayer data:', error);
    return null;
  }
};
