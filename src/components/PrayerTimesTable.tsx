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
    fajr:      {en: 'Fajr',          ar: 'الفجر'},
    sunrise:   {en: 'Sunrise',       ar: 'الشروق'},
    dhuhr:     {en: 'Dhuhr',         ar: 'الظهر'},
    asr:       {en: 'Asr',           ar: 'العصر'},
    maghrib:   {en: 'Maghrib',       ar: 'المغرب'},
    isha:      {en: 'Isha',          ar: 'العشاء'},
    jumaa:     {en: "Jumu'ah",       ar: 'الجمعة'},
    taraweeh:  {en: 'Taraweeh',      ar: 'التراويح'},
    eidAdha:   {en: 'Eid al-Adha',   ar: 'عيد الأضحى'},
    eidFitr:   {en: 'Eid al-Fitr',   ar: 'عيد الفطر'},
  };

  return (
    <View style={[styles.container, {borderColor: theme.cardBorder}]}>

      {/* Column headers — rendered once */}
      <View style={[styles.headerRow, {backgroundColor: theme.header}]}>
        <View style={styles.nameCol} />
        <View style={styles.timeCol}>
          <Text style={styles.headerEn}>Prayer{'\n'}Start</Text>
          <Text style={styles.headerAr}>دخول وقت{'\n'}الصلاة</Text>
        </View>
        <View style={styles.timeCol}>
          <Text style={styles.headerEn}>Masjid{'\n'}Adhan</Text>
          <Text style={styles.headerAr}>أذان{'\n'}المسجد</Text>
        </View>
        <View style={styles.timeCol}>
          <Text style={styles.headerEn}>Masjid{'\n'}Iqama</Text>
          <Text style={styles.headerAr}>إقامة{'\n'}المسجد</Text>
        </View>
      </View>

      {/* Prayer rows */}
      {prayers.map((prayer, index) => {
        const isNext = prayer.name === nextPrayerName;
        const label = prayerLabels[prayer.name] || {en: prayer.name, ar: ''};
        const isLast = index === prayers.length - 1;

        return (
          <View
            key={`${prayer.name}-${index}`}
            style={[
              styles.row,
              {
                backgroundColor: isNext ? theme.cardBackground : theme.cardBackground,
                borderBottomColor: isLast ? 'transparent' : theme.cardBorder,
              },
              isNext && {backgroundColor: theme.nextPrayerBorder + '14'},
            ]}>

            {/* Left: prayer name */}
            <View style={styles.nameCol}>
              {isNext && (
                <View style={[styles.nextBar, {backgroundColor: theme.nextPrayerBorder}]} />
              )}
              <Text
                style={[
                  styles.nameEn,
                  {color: isNext ? theme.nextPrayerBorder : theme.text},
                ]}>
                {label.en}
              </Text>
              <Text style={[styles.nameAr, {color: theme.textSecondary}]}>
                {label.ar}
              </Text>
            </View>

            {/* Special prayers (Taraweeh, Eid) show one time spanning all cols */}
            {prayer.isSpecial ? (
              <View style={styles.specialSpan}>
                <Text
                  style={[
                    styles.timeValue,
                    {color: isNext ? theme.nextPrayerBorder : theme.text},
                    isNext && styles.timeValueNext,
                  ]}>
                  {formatTime(prayer.mit || '--:--')}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.timeCol}>
                  <Text
                    style={[
                      styles.timeValue,
                      {color: isNext ? theme.nextPrayerBorder : theme.text},
                      isNext && styles.timeValueNext,
                    ]}>
                    {formatTime(prayer.apt || '--:--')}
                  </Text>
                </View>
                <View style={styles.timeCol}>
                  <Text
                    style={[
                      styles.timeValue,
                      {color: isNext ? theme.nextPrayerBorder : theme.text},
                      isNext && styles.timeValueNext,
                    ]}>
                    {formatTime(prayer.mat || '--:--')}
                  </Text>
                </View>
                <View style={styles.timeCol}>
                  <Text
                    style={[
                      styles.timeValue,
                      {color: isNext ? theme.nextPrayerBorder : theme.text},
                      isNext && styles.timeValueNext,
                    ]}>
                    {formatTime(prayer.mit || '--:--')}
                  </Text>
                </View>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },

  /* ── Column header bar ── */
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerEn: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    lineHeight: 13,
  },
  headerAr: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 12,
  },

  /* ── Row ── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },

  /* ── Name column (left) ── */
  nameCol: {
    width: 112,
    paddingLeft: 12,
    paddingRight: 6,
    flexShrink: 0,
    position: 'relative',
  },
  nextBar: {
    position: 'absolute',
    left: 0,
    top: -10,
    bottom: -10,
    width: 3,
    borderRadius: 2,
  },
  nameEn: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
  nameAr: {
    fontSize: 10,
    marginTop: 1,
    lineHeight: 13,
  },

  /* ── Time columns ── */
  timeCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeValueNext: {
    fontWeight: '800',
  },

  /* ── Special prayer (spans time cols) ── */
  specialSpan: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
