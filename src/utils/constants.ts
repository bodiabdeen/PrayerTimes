export const FIREBASE_CONFIG = {
  COLLECTION: 'prayerTimes',
  DOCUMENTS: {
    API_CONFIG:      'apiConfig',
    DAILY_CONFIG:    'dailyConfig',
    ANNOUNCEMENTS:   'announcements',
    FALLBACK_RULES:  'fallbackRules',
    MENU_LINKS:      'menuLinks',
    // ★ NEW — per-date MAT/MIT overrides, read by new app only.
    //   Old installed app never reads this document — zero impact on live users.
    SCHEDULED_TIMES: 'scheduledTimes',
  },
};

export const ALADHAN_API = {
  BASE_URL: 'https://api.aladhan.com/v1',
  TIMEZONE: 'Europe/Isle_of_Man',
};

export const CACHE_KEYS = {
  PRAYER_DATA: '@prayer_data',
  LAST_UPDATE: '@last_update',
  THEME: '@theme_mode',
};

export const UPDATE_INTERVAL = {
  COUNTDOWN: 1000,      // 1 second
  DATA_REFRESH: 60000,  // 1 minute
};

export const PRAYER_NAMES = {
  fajr:     { en: 'Fajr الفجر',           ar: 'الفجر' },
  sunrise:  { en: 'Sunrise الشروق',        ar: 'الشروق' },
  dhuhr:    { en: 'Dhuhr الظهر',           ar: 'الظهر' },
  asr:      { en: 'Asr العصر',             ar: 'العصر' },
  maghrib:  { en: 'Maghrib المغرب',         ar: 'المغرب' },
  isha:     { en: 'Isha العشاء',            ar: 'العشاء' },
  jumaa:    { en: "Jumu'ah الجمعة",         ar: 'الجمعة' },
  taraweeh: { en: 'Taraweeh التراويح',      ar: 'التراويح' },
  eidFitr:  { en: 'Eid al-Fitr عيد الفطر', ar: 'عيد الفطر' },
  eidAdha:  { en: 'Eid al-Adha عيد الأضحى', ar: 'عيد الأضحى' },
};
