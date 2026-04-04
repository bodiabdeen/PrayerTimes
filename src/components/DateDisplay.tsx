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
        The Isle of Man Islamic Centre
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
    paddingVertical: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 6,
  },
  gregorian: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  hijri: {
    fontSize: 14,
    fontWeight: '500',
  },
});