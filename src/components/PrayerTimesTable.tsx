import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {Prayer} from '../types';
import {formatSpecialPrayerDay, isSpecialPrayerVisible} from '../utils/specialPrayers';
import {splitPrayerName} from '../utils/prayerNames';
import {EmeraldExtras} from '../styles/colors';
import {BreathingHighlight, FadeInView} from './motion';

interface PrayerTimesTableProps {
  prayers: Prayer[];
  nextPrayerName: string | null;
  /** v2.0: 'emerald' shows one row per prayer with the column names once at the top */
  variant?: 'classic' | 'emerald';
  /** v2.0 Emerald: fade prayers that have already started today */
  dimPast?: boolean;
}

const EMERALD_COLUMNS = [
  {en: 'Begins', ar: 'الوقت'},
  {en: 'Adhan', ar: 'الأذان'},
  {en: 'Iqama', ar: 'الإقامة'},
];

const minutesOf = (time?: string): number | null => {
  if (!time || time === '--:--') {
    return null;
  }
  const [h, m] = time.split(':').map(Number);
  return isNaN(h) || isNaN(m) ? null : h * 60 + m;
};

export const PrayerTimesTable: React.FC<PrayerTimesTableProps> = ({
  prayers,
  nextPrayerName,
  variant = 'classic',
  dimPast = false,
}) => {
  const {theme, formatTime, isDark} = useTheme();

  // v1.6: re-check every minute which admin special prayers should be visible
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  const visiblePrayers = prayers.filter(p => !p.isCustom || isSpecialPrayerVisible(p, now));

  const dayLabel = (dateKey: string): string => {
    const label = formatSpecialPrayerDay(dateKey, now);
    return label.ar ? `${label.en} / ${label.ar}` : label.en;
  };

  const prayerLabels: {[key: string]: {en: string; ar: string}} = {
    fajr: {en: 'Fajr Prayer', ar: 'صلاة الفجر'},
    sunrise: {en: 'Sunrise', ar: 'الشروق'},
    dhuhr: {en: 'Dhuhr Prayer', ar: 'صلاة الظهر'},
    asr: {en: 'Asr Prayer', ar: 'صلاة العصر'},
    maghrib: {en: 'Maghrib Prayer', ar: 'صلاة المغرب'},
    isha: {en: 'Isha Prayer', ar: 'صلاة العشاء'},
    jumaa: {en: "Jumu'ah Prayer", ar: 'صلاة الجمعة'},
    jumaa2: {en: "Jumu'ah 2 Prayer", ar: 'صلاة الجمعة ٢'},
  };

  const columnHeaders = [
    {en: 'Prayer Start', ar: 'دخول وقت الصلاة'},
    {en: 'Masjid Adhan', ar: 'أذان المسجد'},
    {en: 'Masjid Iqama', ar: 'إقامة المسجد'},
  ];

  if (variant === 'emerald') {
    const extras = EmeraldExtras[isDark ? 'dark' : 'light'];
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const cell = (time?: string) => (time && time !== '--:--' ? formatTime(time) : '');
    return (
      <View style={emerald.container}>
        <View style={emerald.headerRow}>
          <View style={emerald.nameCol} />
          {EMERALD_COLUMNS.map(c => (
            <View key={c.en} style={emerald.timeCol}>
              <Text style={[emerald.headerText, {color: theme.textSecondary}]}>{c.en.toUpperCase()}</Text>
              <Text style={[emerald.headerArabic, {color: theme.textSecondary}]}>{c.ar}</Text>
            </View>
          ))}
        </View>
        {visiblePrayers.map((prayer, index) => {
          const isNext = !prayer.isCustom && prayer.name === nextPrayerName;
          const name = splitPrayerName(prayer.name);
          const started = minutesOf(prayer.apt) ?? minutesOf(prayer.mit);
          const past = dimPast && !isNext && !prayer.isCustom && started !== null && started < nowMinutes;
          const timeColor = isNext ? theme.accent : theme.text;
          return (
            <FadeInView
              key={prayer.isCustom ? `custom-${prayer.customId}` : prayer.name}
              delay={Math.min(index, 10) * 60}
              style={[
                emerald.row,
                {
                  backgroundColor: isNext ? extras.nextRow : theme.cardBackground,
                  borderColor: isNext ? theme.nextPrayerBorder : theme.cardBorder,
                },
              ]}>
              {isNext && <BreathingHighlight color={theme.accent} radius={16} />}
              {/* The fade for prayers that have started sits inside: FadeInView animates the row's own opacity */}
              <View style={[emerald.inner, past && emerald.past]}>
              <View style={emerald.nameCol}>
                <Text style={[emerald.name, {color: theme.text}]} numberOfLines={1}>{name.en || name.ar}</Text>
                {name.en && name.ar ? (
                  <Text style={[emerald.arabic, {color: theme.textSecondary}]}>{name.ar}</Text>
                ) : null}
                {prayer.isCustom && prayer.date ? (
                  <Text style={[emerald.dayLabel, {color: theme.accent}]}>{dayLabel(prayer.date)}</Text>
                ) : null}
              </View>
              {prayer.isSpecial ? (
                <Text style={[emerald.specialTime, {color: timeColor}]}>{cell(prayer.mit) || '--:--'}</Text>
              ) : (
                <>
                  <Text style={[emerald.time, {color: timeColor}]}>{cell(prayer.apt)}</Text>
                  <Text style={[emerald.time, {color: timeColor}]}>{cell(prayer.mat)}</Text>
                  <Text style={[emerald.time, {color: timeColor}]}>{cell(prayer.mit)}</Text>
                </>
              )}
              </View>
            </FadeInView>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {visiblePrayers.map((prayer, index) => {
        // Admin special prayers are never "next" (and their free-text name could match a prayer's)
        const isNext = !prayer.isCustom && prayer.name === nextPrayerName;
        const label = prayerLabels[prayer.name] || {en: prayer.name, ar: ''};

        return (
          <FadeInView
            // Stable keys, so a refresh does not replay the entrance animation
            key={prayer.isCustom ? `custom-${prayer.customId}` : prayer.name}
            delay={Math.min(index, 10) * 60}
            style={[
              styles.prayerCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: isNext ? theme.nextPrayerBorder : theme.cardBorder,
                shadowColor: theme.text,
              },
              isNext && styles.nextPrayerCard,
            ]}>
            {isNext && <BreathingHighlight color={theme.accent} radius={10} />}
            <View style={styles.prayerHeader}>
              <Text style={[styles.prayerName, {color: theme.text}]}>
                {label.en}
              </Text>
              <Text style={[styles.prayerNameArabic, {color: theme.textSecondary}]}>
                {label.ar}
              </Text>
            </View>

            {prayer.isSpecial ? (
              <View style={styles.specialPrayerTime}>
                <Text style={[styles.specialTimeLabel, {color: theme.textSecondary}]}>
                  {prayer.isCustom && prayer.date ? dayLabel(prayer.date) : 'Time / الوقت'}
                </Text>
                <Text style={[
                  styles.specialTime,
                  {color: theme.text},
                  isNext && {color: theme.accent, fontWeight: 'bold'},
                ]}>
                  {formatTime(prayer.mit || '--:--')}
                </Text>
              </View>
            ) : (
              <View style={styles.timesRow}>
                <View style={styles.timeColumn}>
                  <Text style={[styles.columnHeader, {color: theme.textSecondary}]}>
                    {columnHeaders[0].en}
                  </Text>
                  <Text style={[styles.columnHeaderArabic, {color: theme.textSecondary}]}>
                    {columnHeaders[0].ar}
                  </Text>
                  <Text style={[
                    styles.time,
                    {color: theme.text},
                    isNext && {color: theme.accent, fontWeight: 'bold'},
                  ]}>
                    {formatTime(prayer.apt || '--:--')}
                  </Text>
                </View>

                <View style={styles.timeColumn}>
                  <Text style={[styles.columnHeader, {color: theme.textSecondary}]}>
                    {columnHeaders[1].en}
                  </Text>
                  <Text style={[styles.columnHeaderArabic, {color: theme.textSecondary}]}>
                    {columnHeaders[1].ar}
                  </Text>
                  <Text style={[
                    styles.time,
                    {color: theme.text},
                    isNext && {color: theme.accent, fontWeight: 'bold'},
                  ]}>
                    {formatTime(prayer.mat || '--:--')}
                  </Text>
                </View>

                <View style={styles.timeColumn}>
                  <Text style={[styles.columnHeader, {color: theme.textSecondary}]}>
                    {columnHeaders[2].en}
                  </Text>
                  <Text style={[styles.columnHeaderArabic, {color: theme.textSecondary}]}>
                    {columnHeaders[2].ar}
                  </Text>
                  <Text style={[
                    styles.time,
                    {color: theme.text},
                    isNext && {color: theme.accent, fontWeight: 'bold'},
                  ]}>
                    {formatTime(prayer.mit || '--:--')}
                  </Text>
                </View>
              </View>
            )}
          </FadeInView>
        );
      })}
    </View>
  );
};

// v2.0 Emerald look
const emerald = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    gap: 7,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    marginBottom: 1,
  },
  headerText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  headerArabic: {
    fontSize: 10.5,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  past: {
    opacity: 0.5,
  },
  nameCol: {
    flex: 1.35,
  },
  timeCol: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  arabic: {
    fontSize: 13,
    textAlign: 'left',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  time: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  specialTime: {
    flex: 3,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    paddingRight: 8,
    fontVariant: ['tabular-nums'],
  },
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    gap: 4,
  },
  prayerCard: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  nextPrayerCard: {
    borderWidth: 2,
    shadowOpacity: 0.12,
    elevation: 2,
  },
  prayerHeader: {
    marginBottom: 4,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  prayerNameArabic: {
    fontSize: 14,
    marginTop: 0,
  },
  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnHeader: {
    fontSize: 11,
    fontWeight: '600',
  },
  columnHeaderArabic: {
    fontSize: 10,
    marginTop: 0,
    marginBottom: 2,
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
  },
  specialPrayerTime: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  specialTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  specialTime: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
