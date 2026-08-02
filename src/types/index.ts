// src/types/index.ts
// TypeScript type definitions for the entire application

/**
 * Prayer names enum
 */
export enum PrayerName {
  FAJR = 'fajr',
  SUNRISE = 'sunrise',
  DHUHR = 'dhuhr',
  ASR = 'asr',
  MAGHRIB = 'maghrib',
  ISHA = 'isha',
}

/**
 * Individual prayer time with all three timing types
 */
export interface Prayer {
  name: string;
  nameArabic: string;
  apt: string; // Actual Prayer Time (astronomically calculated)
  mat: string; // Masjid Adhan Time (when call to prayer happens)
  mit: string; // Masjid Iqama Time (when congregation starts)
  isNext: boolean; // Highlight indicator
  isSpecial?: boolean; // True for Taraweeh/Eid (shows only one time)
}

/**
 * API Configuration from Firebase
 */
export interface ApiConfig {
  method: number;
  latitude: number;
  longitude: number;
  timezone: string;
  offsetMinutes: {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
    school?: number;
  };
}

/**
 * Daily mosque-specific configuration from Firebase
 */
export interface DailyConfig {
  mat: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  mit: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  specialPrayers: {
    jumaa?: {
      adhan: string;
      iqama: string;
    };
    jumaa2?: {
      adhan: string;
      iqama: string;
    };
    taraweeh?: {
      time: string;
    };
    eidAdha?: {
      prayer1?: { time: string };
      prayer2?: { time: string };
    };
    eidFitr?: {
      prayer1?: { time: string };
      prayer2?: { time: string };
    };
  };
}

/**
 * Announcement priority levels
 */
export enum AnnouncementPriority {
  URGENT = 'urgent',
  IMPORTANT = 'important',
  NORMAL = 'normal',
}

/**
 * Individual announcement
 */
export interface Announcement {
  id: string;
  title?: string;
  message: string;
  priority: string;
  createdAt: string;
  createdBy?: string;
}

/**
 * Announcements data from Firebase
 */
export interface AnnouncementsData {
  list: Announcement[];
  lastUpdated: string | null;
}

/**
 * Combined data from all sources
 */
export interface CombinedPrayerData {
  prayers: Prayer[];
  gregorianDate: string;
  hijriDate: string;
  announcements: Announcement[];
  lastUpdated: string;
  nextPrayer?: Prayer | null;
  apiConfig?: ApiConfig; // For displaying location/method info
}

/**
 * Aladhan API Response Types
 */
export interface AladhanTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export interface AladhanDate {
  readable: string;
  timestamp: string;
  gregorian: {
    date: string;
    format: string;
    day: string;
    weekday: {
      en: string;
      ar: string;
    };
    month: {
      number: number;
      en: string;
      ar: string;
    };
    year: string;
  };
  hijri: {
    date: string;
    format: string;
    day: string;
    weekday: {
      en: string;
      ar: string;
    };
    month: {
      number: number;
      en: string;
      ar: string;
    };
    year: string;
  };
}

export interface AladhanResponse {
  code: number;
  status: string;
  data: {
    timings: AladhanTimings;
    date: AladhanDate;
  };
}

/**
 * Theme types
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  shadow: string;
}

export type ThemeMode = 'light' | 'dark';