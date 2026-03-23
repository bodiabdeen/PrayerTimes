// src/services/athanService.ts
// Manages Athan audio preferences and notification channel creation

import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {AndroidImportance} from '@notifee/react-native';
import {Platform} from 'react-native';

export const ATHAN_STORAGE_KEY = '@athan_preferences';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrayerAthanConfig {
  enabled: boolean;
  playOnApt: boolean; // Start Time   → athan sound
  playOnMat: boolean; // Masjid Athan → athan sound
}

export interface AthanPreferences {
  prayers: {
    fajr: PrayerAthanConfig;
    dhuhr: PrayerAthanConfig;
    asr: PrayerAthanConfig;
    maghrib: PrayerAthanConfig;
    isha: PrayerAthanConfig;
    jumaa: PrayerAthanConfig;
  };
  athanSound: string; // key from ATHAN_SOUNDS
}

export type PrayerAthanKey = keyof AthanPreferences['prayers'];

export interface SoundOption {
  id: string;       // unique key, same as fileName
  name: string;     // display name
  fileName: string; // filename WITHOUT extension — same for Android res/raw AND iOS bundle
}

// ─── Available sounds ─────────────────────────────────────────────────────────
// Place <fileName>.mp3 in:
//   Android : android/app/src/main/res/raw/
//   iOS     : add to Xcode project (IOMPrayerTimes target)

export const ATHAN_SOUNDS: SoundOption[] = [
  {id: 'athan_short_takbeer', name: 'Short Takbeer (13s)', fileName: 'athan_short_takbeer'},
  {id: 'adhan_makkah',    name: 'Makkah',           fileName: 'adhan_makkah'},
  {id: 'adhan_madinah',   name: 'Madinah',          fileName: 'adhan_madinah'},
  {id: 'adhan_egypt',     name: 'Egypt',            fileName: 'adhan_egypt'},
  {id: 'adhan_alaqsa',    name: 'Al-Aqsa',          fileName: 'adhan_alaqsa'},
  {id: 'ahmad_al_nafees', name: 'Ahmad Al-Nafees',  fileName: 'ahmad_al_nafees'},
  {id: 'naghshbandi',     name: 'Naghshbandi',      fileName: 'naghshbandi'},
  {id: 'abdul_basit',     name: 'Abdul Basit',      fileName: 'abdul_basit'},
];

// ─── Defaults ─────────────────────────────────────────────────────────────────

const OFF: PrayerAthanConfig = {
  enabled: false,
  playOnApt: false,
  playOnMat: true,
};

export const DEFAULT_ATHAN_PREFERENCES: AthanPreferences = {
  prayers: {
    fajr:    {...OFF},
    dhuhr:   {...OFF},
    asr:     {...OFF},
    maghrib: {...OFF},
    isha:    {...OFF},
    jumaa:   {enabled: false, playOnApt: false, playOnMat: true},
  },
  athanSound: 'adhan_makkah',
};

// ─── Storage ──────────────────────────────────────────────────────────────────

export const getAthanPreferences = async (): Promise<AthanPreferences> => {
  try {
    const stored = await AsyncStorage.getItem(ATHAN_STORAGE_KEY);
    if (!stored) return DEFAULT_ATHAN_PREFERENCES;
    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_ATHAN_PREFERENCES,
      ...parsed,
      prayers: {
        ...DEFAULT_ATHAN_PREFERENCES.prayers,
        ...parsed.prayers,
      },
    };
  } catch {
    return DEFAULT_ATHAN_PREFERENCES;
  }
};

export const saveAthanPreferences = async (
  prefs: AthanPreferences,
): Promise<void> => {
  await AsyncStorage.setItem(ATHAN_STORAGE_KEY, JSON.stringify(prefs));
};

// ─── Channel helpers ──────────────────────────────────────────────────────────

export const getAthanChannelId = (soundId: string) => `athan_${soundId}`;

// ─── Map prayer display name → preference key ─────────────────────────────────

export const getPrayerAthanKey = (
  prayerName: string,
): PrayerAthanKey | null => {
  const lower = prayerName.toLowerCase();
  if (lower.startsWith('fajr'))    return 'fajr';
  if (lower.startsWith('dhuhr'))   return 'dhuhr';
  if (lower.startsWith('asr'))     return 'asr';
  if (lower.startsWith('maghrib')) return 'maghrib';
  if (lower.startsWith('isha'))    return 'isha';
  if (lower.includes('jumaa') || lower.includes("jumu'ah")) return 'jumaa';
  return null;
};

// ─── Create all athan channels on Android ────────────────────────────────────

export const createAthanChannels = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  try {
    for (const sound of ATHAN_SOUNDS) {
      await notifee.createChannel({
        id: getAthanChannelId(sound.id),
        name: `Athan – ${sound.name}`,
        importance: AndroidImportance.HIGH,
        sound: sound.fileName,
        vibration: true,
      });
    }
    console.log('✅ Athan channels created');
  } catch (error) {
    console.error('Error creating athan channels:', error);
  }
};
