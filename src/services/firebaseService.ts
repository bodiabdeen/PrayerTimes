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
import { FIREBASE_CONFIG } from '../utils/constants';
import { ApiConfig, DailyConfig, AnnouncementsData, CombinedPrayerData, DayView, SpecialPrayerItem } from '../types';
import { formatShortDate, parseSpecialPrayers, toDateKey } from '../utils/specialPrayers';
import { buildDayPrayers, FallbackRules, ScheduledPrayerTimes } from '../utils/dayPrayers';
import {
  fetchPrayerTimesFromAladhan,
  convertAladhanTimings,
  formatAladhanGregorianDate,
  formatAladhanHijriDate,
} from './aladhanService';
import { getNextPrayer } from '../utils/prayerUtils';

export type MenuLink = {
  id: string;
  displayName: string;
  url: string;
  icon: string;
};

// v1.6: the fallback rule and scheduled-time types live in src/utils/dayPrayers.ts,
// together with the rules that build one day's prayer list (used for today and tomorrow).

// Safe defaults used if fallbackRules document is missing
const DEFAULT_FALLBACK_RULES: FallbackRules = {
  fajr:    { matOffset: 0, mitOffset: 5 },
  dhuhr:   { matOffset: 0, mitOffset: 5 },
  asr:     { matOffset: 0, mitOffset: 5 },
  maghrib: { matOffset: 0, mitOffset: 5 },
  isha:    { matOffset: 0, mitOffset: 5 },
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
      timezone:  'Europe/Isle_of_Man',
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
        jumaa2: rawData.jumaa2 ? {
          adhan: rawData.jumaa2.adhan_khutba || '',
          iqama: rawData.jumaa2.iqama || '',
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
// Fetch scheduled times  (prayerTimes/scheduledTimes)
// ★ Used by: new app ONLY
//   The old installed app never calls this function and never reads this
//   Firestore document. Publishing the new app does not affect live users.
// v1.6: returns every date's entry ("YYYY-MM-DD" → times), so today and
//   tomorrow are read in one go. Missing dates simply fall back to daily config.
// ─────────────────────────────────────────────────────────────────────────
export const fetchScheduledTimes = async (): Promise<Record<string, ScheduledPrayerTimes> | null> => {
  try {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.SCHEDULED_TIMES));

    if (!docSnap.exists) {
      console.log('📅 No scheduledTimes document — using daily config');
      return null;
    }

    const all = docSnap.data();
    return (all ?? null) as Record<string, ScheduledPrayerTimes> | null;
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
// Fetch special prayers  (prayerTimes/specialPrayers)
// ★ v1.6, new app only: older app versions never read this document.
// Never fatal: any problem returns an empty list and prayer times load as normal.
// ─────────────────────────────────────────────────────────────────────────
export const fetchSpecialPrayers = async (): Promise<SpecialPrayerItem[]> => {
  try {
    const db = getFirestore();
    const docSnap = await getDoc(doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.SPECIAL_PRAYERS));
    if (!docSnap.exists()) return [];
    const items = parseSpecialPrayers(docSnap.data());
    console.log(`✅ Special prayers fetched (${items.length})`);
    return items;
  } catch (error) {
    console.error('❌ Error fetching special prayers (ignored):', error);
    return [];
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

    // 3. Daily config (② priority)
    const dailyConfig = await fetchDailyConfig();
    if (!dailyConfig) throw new Error('Failed to fetch daily config');

    // 4. Scheduled times (① priority — new app only), today's and tomorrow's entries.
    //    Usually there is no entry for a date, which is the common case.
    //    Failure here is non-fatal and silently falls back to dailyConfig.
    const scheduledAll = await fetchScheduledTimes();
    const todayKey = toDateKey(today);
    const tomorrowDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const tomorrowKey = toDateKey(tomorrowDate);

    // 5. Fallback rules (③ priority)
    const fallbackRules: FallbackRules = await fetchFallbackRules();

    // 6. Announcements
    const announcementsData = await fetchAnnouncements() || { list: [], lastUpdated: null };

    // 7. v1.6: special prayers created by the admin (never fatal)
    const specialPrayers = await fetchSpecialPrayers();

    // ── Today's prayers (rules in src/utils/dayPrayers.ts) ───────────────
    const prayers = buildDayPrayers({
      rawTimes: convertAladhanTimings(aladhanData.timings),
      offsets: apiConfig.offsetMinutes,
      dailyConfig,
      scheduled: scheduledAll?.[todayKey],
      fallbackRules,
      specialPrayers,
      now: today,
    });

    // ── v1.6: tomorrow's prayers, for the Today | Tomorrow switch (never fatal) ──
    let tomorrow: DayView | null = null;
    const tomorrowAladhan = await fetchPrayerTimesFromAladhan(
      tomorrowDate,
      apiConfig.method,
      apiConfig.latitude,
      apiConfig.longitude
    );
    if (tomorrowAladhan) {
      tomorrow = {
        dateKey: tomorrowKey,
        label: formatShortDate(tomorrowKey), // e.g. "Thu 19 Nov"
        gregorianDate: formatAladhanGregorianDate(tomorrowAladhan.date),
        hijriDate: formatAladhanHijriDate(tomorrowAladhan.date),
        prayers: buildDayPrayers({
          rawTimes: convertAladhanTimings(tomorrowAladhan.timings),
          offsets: apiConfig.offsetMinutes,
          dailyConfig,
          scheduled: scheduledAll?.[tomorrowKey],
          fallbackRules,
          specialPrayers: specialPrayers.filter(item => item.date === tomorrowKey),
          now: today,
        }),
      };
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
      tomorrow,
    };

    console.log('✅ All prayer data combined successfully');
    return result;
  } catch (error) {
    console.error('❌ Error fetching all prayer data:', error);
    return null;
  }
};
