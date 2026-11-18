// src/utils/prayerNames.ts
// v2.0: split the bilingual prayer names used in the data ("Asr العصر") into their two parts,
// so the Emerald look can show English and Arabic on separate lines.

const ARABIC = /[؀-ۿ]/;

export interface PrayerNameParts {
  en: string;
  ar: string;
}

export const splitPrayerName = (name: string | null | undefined): PrayerNameParts => {
  if (!name) {
    return {en: '', ar: ''};
  }
  const i = name.search(ARABIC);
  if (i <= 0) {
    // All English (or all Arabic, for an admin-created prayer typed in Arabic)
    return i === 0 ? {en: '', ar: name.trim()} : {en: name.trim(), ar: ''};
  }
  let en = name.slice(0, i).trim();
  let ar = name.slice(i).trim();
  // "Eid al-Fitr عيد الفطر - Prayer 1": keep "Prayer 1" with the English
  const suffix = ar.match(/\s-\s(Prayer\s\d+)$/);
  if (suffix && suffix.index !== undefined) {
    ar = ar.slice(0, suffix.index).trim();
    en = `${en} · ${suffix[1]}`;
  }
  return {en, ar};
};
