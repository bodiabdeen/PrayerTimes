// src/components/DayToggle.tsx
// v1.6: "Today | Tomorrow" switch above the prayer list.

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';

export type DayChoice = 'today' | 'tomorrow';

interface DayToggleProps {
  value: DayChoice;
  onChange: (value: DayChoice) => void;
  /** Shown under the switch when Tomorrow is selected, e.g. its full Gregorian and Hijri date */
  tomorrowSubtitle?: string | null;
}

export const DayToggle: React.FC<DayToggleProps> = ({value, onChange, tomorrowSubtitle}) => {
  const {theme} = useTheme();

  const option = (key: DayChoice, label: string) => {
    const selected = value === key;
    return (
      <TouchableOpacity
        key={key}
        accessibilityRole="tab"
        accessibilityState={{selected}}
        accessibilityLabel={key === 'today' ? "Today's prayer times" : "Tomorrow's prayer times"}
        activeOpacity={0.8}
        onPress={() => onChange(key)}
        style={[styles.option, selected && {backgroundColor: theme.accent}]}>
        <Text style={[styles.optionText, {color: selected ? theme.textOnPrimary : theme.text}]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View
        accessibilityRole="tablist"
        style={[styles.track, {backgroundColor: theme.cardBackground, borderColor: theme.cardBorder}]}>
        {option('today', 'Today / اليوم')}
        {option('tomorrow', 'Tomorrow / غدًا')}
      </View>
      {value === 'tomorrow' && tomorrowSubtitle ? (
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>{tomorrowSubtitle}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 8,
  },
  track: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  option: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 6,
  },
});
