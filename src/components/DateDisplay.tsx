import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';

interface DateDisplayProps {
  gregorianDate: string;
  hijriDate: string;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  gregorianDate,
  hijriDate,
}) => {
  const {theme} = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, {color: theme.text}]}>
        Jersey Islamic Centre
      </Text>
      
      <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
        Prayer Times
      </Text>
      
      <Text style={[styles.gregorian, {color: theme.text}]}>
        {gregorianDate}
      </Text>
      
      <Text style={[styles.hijri, {color: theme.accent}]}>
        {hijriDate}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  gregorian: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  hijri: {
    fontSize: 14,
    fontWeight: '500',
  },
});