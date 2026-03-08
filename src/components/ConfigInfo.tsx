import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {ApiConfig} from '../types';

interface ConfigInfoProps {
  config: ApiConfig | null;
}

// Method names mapping
const METHOD_NAMES: {[key: number]: string} = {
  1: 'University of Islamic Sciences, Karachi',
  2: 'Islamic Society of North America (ISNA)',
  3: 'Muslim World League (MWL)',
  4: 'Umm al-Qura, Makkah',
  5: 'Egyptian General Authority of Survey',
  7: 'Institute of Geophysics, University of Tehran',
  8: 'Gulf Region',
  9: 'Kuwait',
  10: 'Qatar',
  11: 'Majlis Ugama Islam Singapura, Singapore',
  12: 'Union Organization islamic de France',
  13: 'Diyanet İşleri Başkanlığı, Turkey',
  14: 'Spiritual Administration of Muslims of Russia',
};

// School names mapping - CHANGE #1: Removed "Jafari"
const SCHOOL_NAMES: {[key: number]: string} = {
  0: 'Shafi, Maliki, Hanbali',
  1: 'Hanafi',
};

export const ConfigInfo: React.FC<ConfigInfoProps> = ({config}) => {
  const {theme} = useTheme();

  if (!config) return null;

  const methodName = METHOD_NAMES[config.method] || `Method ${config.method}`;
  const schoolName = SCHOOL_NAMES[config.offsetMinutes?.school || 0] || 'Standard';
  
  // Check if any offsets exist
  const hasOffsets = config.offsetMinutes && (
    config.offsetMinutes.fajr !== 0 ||
    config.offsetMinutes.dhuhr !== 0 ||
    config.offsetMinutes.asr !== 0 ||
    config.offsetMinutes.maghrib !== 0 ||
    config.offsetMinutes.isha !== 0
  );

  const formatOffset = (offset: number): string => {
    if (offset === 0) return '0';
    return offset > 0 ? `+${offset}` : `${offset}`;
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.cardBackground, borderColor: theme.cardBorder}]}>
      <Text style={[styles.title, {color: theme.text}]}>Configuration</Text>
      
      <View style={styles.infoRow}>
        <Text style={[styles.label, {color: theme.textSecondary}]}>Location:</Text>
        <Text style={[styles.value, {color: theme.text}]}>
          {config.latitude.toFixed(2)}°N, {Math.abs(config.longitude).toFixed(2)}°W
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={[styles.label, {color: theme.textSecondary}]}>Method:</Text>
        <Text style={[styles.value, {color: theme.text}]} numberOfLines={2}>
          {methodName}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={[styles.label, {color: theme.textSecondary}]}>School:</Text>
        <Text style={[styles.value, {color: theme.text}]}>
          {schoolName}
        </Text>
      </View>

      {hasOffsets && (
        <View style={styles.offsetsContainer}>
          <Text style={[styles.label, {color: theme.textSecondary}]}>Offsets:</Text>
          <View style={styles.offsetsList}>
            {config.offsetMinutes.fajr !== 0 && (
              <Text style={[styles.offsetItem, {color: theme.text}]}>
                Fajr: {formatOffset(config.offsetMinutes.fajr)} min
              </Text>
            )}
            {config.offsetMinutes.dhuhr !== 0 && (
              <Text style={[styles.offsetItem, {color: theme.text}]}>
                Dhuhr: {formatOffset(config.offsetMinutes.dhuhr)} min
              </Text>
            )}
            {config.offsetMinutes.asr !== 0 && (
              <Text style={[styles.offsetItem, {color: theme.text}]}>
                Asr: {formatOffset(config.offsetMinutes.asr)} min
              </Text>
            )}
            {config.offsetMinutes.maghrib !== 0 && (
              <Text style={[styles.offsetItem, {color: theme.text}]}>
                Maghrib: {formatOffset(config.offsetMinutes.maghrib)} min
              </Text>
            )}
            {config.offsetMinutes.isha !== 0 && (
              <Text style={[styles.offsetItem, {color: theme.text}]}>
                Isha: {formatOffset(config.offsetMinutes.isha)} min
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 100,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    width: 90,
    marginRight: 8,
  },
  value: {
    fontSize: 13,
    flex: 1,
  },
  offsetsContainer: {
    marginTop: 4,
  },
  offsetsList: {
    marginTop: 4,
    marginLeft: 90,
  },
  offsetItem: {
    fontSize: 12,
    marginBottom: 4,
  },
});
