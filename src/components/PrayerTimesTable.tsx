import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {Prayer} from '../types';

interface PrayerTimesTableProps {
  prayers: Prayer[];
  nextPrayerName: string | null;
}

export const PrayerTimesTable: React.FC<PrayerTimesTableProps> = ({
  prayers,
  nextPrayerName,
}) => {
  const {theme, formatTime} = useTheme();

  const prayerLabels: {[key: string]: {en: string; ar: string}} = {
    fajr: {en: 'Fajr Prayer', ar: 'صلاة الفجر'},
    sunrise: {en: 'Sunrise', ar: 'الشروق'},
    dhuhr: {en: 'Dhuhr Prayer', ar: 'صلاة الظهر'},
    asr: {en: 'Asr Prayer', ar: 'صلاة العصر'},
    maghrib: {en: 'Maghrib Prayer', ar: 'صلاة المغرب'},
    isha: {en: 'Isha Prayer', ar: 'صلاة العشاء'},
    jumaa: {en: "Jumu'ah Prayer", ar: 'صلاة الجمعة'},
  };

  // CHANGE #2: Updated Arabic text for "Prayer Start"
  const columnHeaders = [
    {en: 'Prayer Start', ar: 'دخول وقت الصلاة'},
    {en: 'Masjid Adhan', ar: 'أذان المسجد'},
    {en: 'Masjid Iqama', ar: 'إقامة المسجد'},
  ];

  return (
    <View style={styles.container}>
      {prayers.map((prayer, index) => {
        const isNext = prayer.name === nextPrayerName;
        const label = prayerLabels[prayer.name] || {en: prayer.name, ar: ''};

        return (
          <View
            key={`${prayer.name}-${index}`}
            style={[
              styles.prayerCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: isNext ? theme.nextPrayerBorder : theme.cardBorder,
                shadowColor: theme.text,
              },
              isNext && styles.nextPrayerCard,
            ]}>
            <View style={styles.prayerHeader}>
              <Text style={[styles.prayerName, {color: theme.text}]}>
                {label.en}
              </Text>
              <Text style={[styles.prayerNameArabic, {color: theme.textSecondary}]}>
                {label.ar}
              </Text>
            </View>

            {/* Special prayers (Taraweeh, Eid) show only one time */}
            {prayer.isSpecial ? (
              <View style={styles.specialPrayerTime}>
                <Text style={[styles.specialTimeLabel, {color: theme.textSecondary}]}>
                  Time / الوقت
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
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 12,
  },
  prayerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nextPrayerCard: {
    borderWidth: 2,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  prayerHeader: {
    marginBottom: 12,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  prayerNameArabic: {
    fontSize: 14,
    marginTop: 2,
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
    marginTop: 2,
    marginBottom: 8,
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
  },
  specialPrayerTime: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  specialTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  specialTime: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
