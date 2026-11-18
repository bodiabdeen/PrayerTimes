import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {Prayer} from '../types';
import {formatSpecialPrayerDay, isSpecialPrayerVisible} from '../utils/specialPrayers';
import {BreathingHighlight, FadeInView} from './motion';

interface PrayerTimesTableProps {
  prayers: Prayer[];
  nextPrayerName: string | null;
}

export const PrayerTimesTable: React.FC<PrayerTimesTableProps> = ({
  prayers,
  nextPrayerName,
}) => {
  const {theme, formatTime} = useTheme();

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
