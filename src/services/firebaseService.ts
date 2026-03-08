// src/services/firebaseService.ts
// Firebase Firestore integration service (modular API for v22+)

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
  matOffset: number; // Minutes to add to APT when MAT is empty
  mitOffset: number; // Minutes to add to MAT when MIT is empty
};

type FallbackRules = {
  fajr: PrayerFallbackRule;
  dhuhr: PrayerFallbackRule;
  asr: PrayerFallbackRule;
  maghrib: PrayerFallbackRule;
  isha: PrayerFallbackRule;
};

// Safe defaults if fallbackRules document is missing
const DEFAULT_FALLBACK_RULES: FallbackRules = {
  fajr:    { matOffset: 0, mitOffset: 5 },
  dhuhr:   { matOffset: 0, mitOffset: 5 },
  asr:     { matOffset: 0, mitOffset: 5 },
  maghrib: { matOffset: 0, mitOffset: 5 },
  isha:    { matOffset: 0, mitOffset: 5 },
};

/**
 * Initialize Firebase (must be called before any Firestore operations)
 */
export const initializeFirebase = async (): Promise<void> => {
  try {
    const apps = getApps();
    if (apps.length > 0) {
      console.log('✅ Firebase already initialized');
      return;
    }
    // Firebase will auto-initialize from google-services.json
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

/**
 * Fetch API configuration from Firebase
 */
export const fetchApiConfig = async (): Promise<ApiConfig | null> => {
  try {
    const db = getFirestore();
    const docRef = doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.API_CONFIG);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists) {
      console.error('❌ API config document not found');
      return null;
    }

    const rawData = docSnap.data();

    const data: ApiConfig = {
      method: rawData?.method || 4,
      latitude: rawData?.latitude || 54.15,
      longitude: rawData?.longitude || -4.48,
      timezone: 'Europe/Jersey',
      offsetMinutes: {
        fajr:    rawData?.offsets?.fajr    || 0,
        dhuhr:   rawData?.offsets?.dhuhr   || 0,
        asr:     rawData?.offsets?.asr     || 0,
        maghrib: rawData?.offsets?.maghrib || 0,
        isha:    rawData?.offsets?.isha    || 0,
        school:  rawData?.offsets?.school  || 0,
      }
    };

    console.log('✅ API config fetched from Firebase');
    return data;
  } catch (error) {
    console.error('❌ Error fetching API config:', error);
    return null;
  }
};

/**
 * Fetch fallback rules from Firebase.
 * These define how many minutes to offset APT→MAT and MAT→MIT
 * when the mosque hasn't set those times in dailyConfig.
 */
export const fetchFallbackRules = async (): Promise<FallbackRules> => {
  try {
    const db = getFirestore();
    const docRef = doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.FALLBACK_RULES);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists) {
      console.warn('⚠️ fallbackRules document not found, using defaults');
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

    console.log('✅ Fallback rules fetched from Firebase');
    return rules;
  } catch (error) {
    console.error('❌ Error fetching fallback rules, using defaults:', error);
    return DEFAULT_FALLBACK_RULES;
  }
};

/**
 * Fetch daily configuration from Firebase
 */
export const fetchDailyConfig = async (): Promise<DailyConfig | null> => {
  try {
    const db = getFirestore();
    const docRef = doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.DAILY_CONFIG);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists) {
      console.error('❌ Daily config document not found');
      return null;
    }

    const rawData = docSnap.data();

    if (!rawData?.dailyPrayers) {
      console.error('❌ dailyPrayers field not found');
      return null;
    }

    const dailyPrayers = rawData.dailyPrayers;

    const data: DailyConfig = {
      mat: {
        fajr:    dailyPrayers?.fajr?.mat    || '00:00',
        dhuhr:   dailyPrayers?.dhuhr?.mat   || '00:00',
        asr:     dailyPrayers?.asr?.mat     || '00:00',
        maghrib: dailyPrayers?.maghrib?.mat || '00:00',
        isha:    dailyPrayers?.isha?.mat    || '00:00',
      },
      mit: {
        fajr:    dailyPrayers?.fajr?.mit    || '00:00',
        dhuhr:   dailyPrayers?.dhuhr?.mit   || '00:00',
        asr:     dailyPrayers?.asr?.mit     || '00:00',
        maghrib: dailyPrayers?.maghrib?.mit || '00:00',
        isha:    dailyPrayers?.isha?.mit    || '00:00',
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
      }
    };

    console.log('✅ Daily config fetched from Firebase');
    return data;
  } catch (error) {
    console.error('❌ Error fetching daily config:', error);
    return null;
  }
};

/**
 * Fetch menu links from Firebase
 */
export const fetchMenuLinks = async (): Promise<MenuLink[] | null> => {
  try {
    const db = getFirestore();
    const docRef = doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.MENU_LINKS);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists) {
      console.log('📭 No menuLinks document found');
      return [];
    }

    const rawData = docSnap.data();
    const links: MenuLink[] = (rawData?.links || []).map((link: any) => ({
      id: link.id,
      displayName: link.displayName,
      url: link.url,
      icon: link.icon,
    }));

    console.log('✅ Menu links fetched from Firebase');
    return links;
  } catch (error) {
    console.error('❌ Error fetching menu links:', error);
    return null;
  }
};

/**
 * Fetch announcements from Firebase
 */
export const fetchAnnouncements = async (): Promise<AnnouncementsData | null> => {
  try {
    const db = getFirestore();
    const docRef = doc(db, FIREBASE_CONFIG.COLLECTION, FIREBASE_CONFIG.DOCUMENTS.ANNOUNCEMENTS);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists) {
      console.log('📭 No announcements document found');
      return { list: [], lastUpdated: null };
    }

    const data = docSnap.data() as AnnouncementsData;
    console.log('✅ Announcements fetched from Firebase');
    return data;
  } catch (error) {
    console.error('❌ Error fetching announcements:', error);
    return { list: [], lastUpdated: null };
  }
};

/**
 * Combine data from all sources into one object
 */
export const fetchAllPrayerData = async (): Promise<CombinedPrayerData | null> => {
  try {
    console.log('🔄 Starting data fetch...');

    // Step 1: Fetch API config
    const apiConfig = await fetchApiConfig();
    if (!apiConfig) {
      throw new Error('Failed to fetch API config');
    }

    // Step 2: Fetch prayer times from Aladhan
    const today = new Date();
    const aladhanData = await fetchPrayerTimesFromAladhan(
      today,
      apiConfig.method,
      apiConfig.latitude,
      apiConfig.longitude
    );

    if (!aladhanData) {
      throw new Error('Failed to fetch prayer times from Aladhan');
    }

    // Convert Aladhan timings and apply APT offsets
    const aptTimings = convertAladhanTimings(aladhanData.timings);
    const aptWithOffsets = {
      fajr:    applyTimeOffset(aptTimings.fajr,    apiConfig.offsetMinutes.fajr),
      sunrise: aptTimings.sunrise, // No offset for sunrise
      dhuhr:   applyTimeOffset(aptTimings.dhuhr,   apiConfig.offsetMinutes.dhuhr),
      asr:     applyTimeOffset(aptTimings.asr,     apiConfig.offsetMinutes.asr),
      maghrib: applyTimeOffset(aptTimings.maghrib, apiConfig.offsetMinutes.maghrib),
      isha:    applyTimeOffset(aptTimings.isha,    apiConfig.offsetMinutes.isha),
    };

    // Step 3: Fetch daily config (MAT/MIT times)
    const dailyConfig = await fetchDailyConfig();
    if (!dailyConfig) {
      throw new Error('Failed to fetch daily config');
    }

    // Step 4: Fetch fallback rules from Firebase
    const fallbackRules = await fetchFallbackRules();

    // Step 5: Fetch announcements
    const announcementsData = await fetchAnnouncements() || { list: [], lastUpdated: null };
    const announcementsList = announcementsData.list || [];

    // Step 6: Build prayers array using Firebase-driven fallback rules
    //
    // Fallback cascade:
    //   MAT empty? → MAT = APT + fallbackRules[prayer].matOffset
    //   MIT empty? → MIT = finalMAT + fallbackRules[prayer].mitOffset
    //
    const buildPrayer = (
      prayerName: string,
      apt: string,
      mat: string,
      mit: string,
      rules: PrayerFallbackRule,
    ) => {
      const isMatEmpty = !mat || mat === '00:00';
      const finalMat = isMatEmpty ? applyTimeOffset(apt, rules.matOffset) : mat;

      const isMitEmpty = !mit || mit === '00:00';
      const finalMit = isMitEmpty ? applyTimeOffset(finalMat, rules.mitOffset) : mit;

      return {
        name: PRAYER_NAMES[prayerName as keyof typeof PRAYER_NAMES].en,
        nameArabic: PRAYER_NAMES[prayerName as keyof typeof PRAYER_NAMES].ar,
        apt,
        mat: finalMat,
        mit: finalMit,
        isNext: false,
      };
    };

    const prayers: Prayer[] = [
      buildPrayer('fajr',    aptWithOffsets.fajr,    dailyConfig.mat.fajr,    dailyConfig.mit.fajr,    fallbackRules.fajr),
      {
        name: PRAYER_NAMES.sunrise.en,
        nameArabic: PRAYER_NAMES.sunrise.ar,
        apt: aptWithOffsets.sunrise,
        mat: '--:--',
        mit: '--:--',
        isNext: false,
      },
      buildPrayer('dhuhr',   aptWithOffsets.dhuhr,   dailyConfig.mat.dhuhr,   dailyConfig.mit.dhuhr,   fallbackRules.dhuhr),
      buildPrayer('asr',     aptWithOffsets.asr,     dailyConfig.mat.asr,     dailyConfig.mit.asr,     fallbackRules.asr),
      buildPrayer('maghrib', aptWithOffsets.maghrib, dailyConfig.mat.maghrib, dailyConfig.mit.maghrib, fallbackRules.maghrib),
      buildPrayer('isha',    aptWithOffsets.isha,    dailyConfig.mat.isha,    dailyConfig.mit.isha,    fallbackRules.isha),
    ];

    // Add Jumaa prayer (Friday prayer - after Dhuhr)
    if (dailyConfig.specialPrayers.jumaa?.iqama) {
      const jumaaIndex = prayers.findIndex(p => p.name === PRAYER_NAMES.dhuhr.en);
      if (jumaaIndex !== -1) {
        prayers.splice(jumaaIndex + 1, 0, {
          name: PRAYER_NAMES.jumaa.en,
          nameArabic: PRAYER_NAMES.jumaa.ar,
          apt: '--:--',
          mat: dailyConfig.specialPrayers.jumaa.adhan,
          mit: dailyConfig.specialPrayers.jumaa.iqama,
          isNext: false,
        });
      }
    }

    // Add Taraweeh prayer (during Ramadan, after Isha)
    if (dailyConfig.specialPrayers.taraweeh?.time) {
      const ishaIndex = prayers.findIndex(p => p.name === PRAYER_NAMES.isha.en);
      if (ishaIndex !== -1) {
        prayers.splice(ishaIndex + 1, 0, {
          name: PRAYER_NAMES.taraweeh.en,
          nameArabic: PRAYER_NAMES.taraweeh.ar,
          apt: '--:--',
          mat: dailyConfig.specialPrayers.taraweeh.time,
          mit: dailyConfig.specialPrayers.taraweeh.time,
          isNext: false,
          isSpecial: true,
        });
      }
    }

    // Add Eid al-Fitr prayers (if scheduled)
    if (dailyConfig.specialPrayers.eidFitr?.prayer1?.time) {
      prayers.push({
        name: `${PRAYER_NAMES.eidFitr.en} - Prayer 1`,
        nameArabic: `${PRAYER_NAMES.eidFitr.ar} - صلاة ١`,
        apt: '--:--', mat: '--:--',
        mit: dailyConfig.specialPrayers.eidFitr.prayer1.time,
        isNext: false, isSpecial: true,
      });
    }
    if (dailyConfig.specialPrayers.eidFitr?.prayer2?.time) {
      prayers.push({
        name: `${PRAYER_NAMES.eidFitr.en} - Prayer 2`,
        nameArabic: `${PRAYER_NAMES.eidFitr.ar} - صلاة ٢`,
        apt: '--:--', mat: '--:--',
        mit: dailyConfig.specialPrayers.eidFitr.prayer2.time,
        isNext: false, isSpecial: true,
      });
    }

    // Add Eid al-Adha prayers (if scheduled)
    if (dailyConfig.specialPrayers.eidAdha?.prayer1?.time) {
      prayers.push({
        name: `${PRAYER_NAMES.eidAdha.en} - Prayer 1`,
        nameArabic: `${PRAYER_NAMES.eidAdha.ar} - صلاة ١`,
        apt: '--:--', mat: '--:--',
        mit: dailyConfig.specialPrayers.eidAdha.prayer1.time,
        isNext: false, isSpecial: true,
      });
    }
    if (dailyConfig.specialPrayers.eidAdha?.prayer2?.time) {
      prayers.push({
        name: `${PRAYER_NAMES.eidAdha.en} - Prayer 2`,
        nameArabic: `${PRAYER_NAMES.eidAdha.ar} - صلاة ٢`,
        apt: '--:--', mat: '--:--',
        mit: dailyConfig.specialPrayers.eidAdha.prayer2.time,
        isNext: false, isSpecial: true,
      });
    }

    // Find and mark next prayer
    const nextPrayer = getNextPrayer(prayers);
    prayers.forEach(prayer => {
      prayer.isNext = nextPrayer ? prayer.name === nextPrayer.name : false;
    });

    // Format dates
    const gregorianDate = formatAladhanGregorianDate(aladhanData.date);
    const hijriDate = formatAladhanHijriDate(aladhanData.date);

    const result: CombinedPrayerData = {
      prayers,
      gregorianDate,
      hijriDate,
      announcements: announcementsList,
      lastUpdated: new Date().toISOString(),
      nextPrayer,
      apiConfig,
    };

    console.log('✅ All prayer data fetched and combined successfully');
    return result;
  } catch (error) {
    console.error('❌ Error fetching all prayer data:', error);
    return null;
  }
};
