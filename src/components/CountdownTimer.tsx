import React, {useState, useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated, Easing} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {Prayer} from '../types';
import {UPDATE_INTERVAL} from '../utils/constants';
import {getNextPrayer} from '../utils/prayerUtils';
import {useReduceMotion} from './motion';

// v1.6: in the last five minutes the countdown takes a warm tint and pulses slowly
const SOON_MS = 5 * 60 * 1000;

interface CountdownTimerProps {
  nextPrayer: Prayer | null;
  prayers: Prayer[];
  onNextPrayerChange?: (prayer: Prayer | null) => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({nextPrayer: initialNextPrayer, prayers, onNextPrayerChange}) => {
  const {theme} = useTheme();
  const [countdown, setCountdown] = useState<string>('--:--:--');
  const [currentNextPrayer, setCurrentNextPrayer] = useState<Prayer | null>(initialNextPrayer);
  const [isSoon, setIsSoon] = useState(false);

  // v1.6: gentle animations (skipped when the phone's "Reduce motion" setting is on)
  const reduceMotion = useReduceMotion();
  const nameOpacity = useRef(new Animated.Value(1)).current;
  const countdownOpacity = useRef(new Animated.Value(1)).current;
  const nextPrayerName = currentNextPrayer?.name;

  // The prayer name fades in when the next prayer changes
  useEffect(() => {
    if (reduceMotion) {
      nameOpacity.setValue(1);
      return;
    }
    nameOpacity.setValue(0);
    const fade = Animated.timing(nameOpacity, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    fade.start();
    return () => fade.stop();
  }, [nextPrayerName, reduceMotion, nameOpacity]);

  // Slow pulse in the last five minutes
  useEffect(() => {
    if (!isSoon || reduceMotion) {
      countdownOpacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(countdownOpacity, {toValue: 0.7, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(countdownOpacity, {toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      countdownOpacity.setValue(1);
    };
  }, [isSoon, reduceMotion, countdownOpacity]);

  useEffect(() => {
    if (!prayers || prayers.length === 0) {
      setCountdown('--:--:--');
      return;
    }

    const updateCountdown = () => {
      // Recalculate which prayer is actually next right now
      const actualNextPrayer = getNextPrayer(prayers);
      
      if (!actualNextPrayer) {
        setCountdown('--:--:--');
        setCurrentNextPrayer(null);
        onNextPrayerChange?.(null);
        return;
      }

      // Update if next prayer changed
      if (!currentNextPrayer || actualNextPrayer.name !== currentNextPrayer.name) {
        setCurrentNextPrayer(actualNextPrayer);
        onNextPrayerChange?.(actualNextPrayer);
      }

      // Use APT (main prayers always have APT from API)
      const timeToUse = actualNextPrayer.apt;
      
      if (!timeToUse || timeToUse === '--:--') {
        setCountdown('--:--:--');
        return;
      }

      try {
        const now = new Date();
        const timeParts = timeToUse.split(':');
        
        if (timeParts.length !== 2) {
          setCountdown('--:--:--');
          return;
        }

        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        
        if (isNaN(hours) || isNaN(minutes)) {
          setCountdown('--:--:--');
          return;
        }
        
        // Create target time for today
        const target = new Date();
        target.setHours(hours, minutes, 0, 0);
        
        // CRITICAL: Prayer times repeat daily
        // If target time already passed today, it's for tomorrow (same APT)
        if (target <= now) {
          target.setDate(target.getDate() + 1);
        }

        const diff = target.getTime() - now.getTime();
        
        if (diff < 0) {
          setCountdown('--:--:--');
          return;
        }

        setIsSoon(diff <= SOON_MS);

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        setCountdown(
          `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
        );
      } catch (error) {
        console.error('Error calculating countdown:', error);
        setCountdown('--:--:--');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, UPDATE_INTERVAL.COUNTDOWN);

    return () => clearInterval(interval);
  }, [prayers, currentNextPrayer, onNextPrayerChange]);

  const getNextPrayerLabel = () => {
    if (!currentNextPrayer) return 'Loading...';
    
    // Extract English prayer name (before any Arabic text)
    // "Fajr الفجر" → "Fajr"
    // "Jumu'ah 2 ..." is checked before the generic split since it shares
    // its first word with "Jumu'ah ..." and would otherwise be indistinguishable.
    const cleanName = currentNextPrayer.name.startsWith("Jumu'ah 2")
      ? 'jumaa2'
      : currentNextPrayer.name.split(' ')[0].toLowerCase();

    const prayerNames: {[key: string]: string} = {
      fajr: 'Fajr',
      dhuhr: 'Dhuhr',
      asr: 'Asr',
      maghrib: 'Maghrib',
      isha: 'Isha',
      jumaa: "Jumu'ah",
      jumaa2: "Jumu'ah 2",
      taraweeh: 'Taraweeh',
    };

    const prayerName = prayerNames[cleanName] || currentNextPrayer.name.split(' ')[0];
    
    // Check if this prayer time already passed today
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Use APT for checking if prayer passed (main prayers have APT)
    const timeToUse = currentNextPrayer.apt;
    
    if (timeToUse && timeToUse !== '--:--') {
      try {
        const [hours, minutes] = timeToUse.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const prayerMinutes = hours * 60 + minutes;
          
          // If APT time <= current time, it's tomorrow (same time repeats daily)
          if (prayerMinutes <= currentMinutes) {
            return `${prayerName} (Tomorrow)`;
          }
        }
      } catch (error) {
        // If parsing fails, just show the name
      }
    }
    
    return prayerName;
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.cardBackground,
        borderColor: theme.nextPrayerBorder,
      }
    ]}>
      <Text style={[styles.label, {color: theme.textSecondary}]}>
        Next Prayer
      </Text>
      
      <Animated.Text style={[styles.prayerName, {color: theme.accent, opacity: nameOpacity}]}>
        {getNextPrayerLabel()}
      </Animated.Text>

      <Animated.Text
        style={[
          styles.countdown,
          {color: isSoon ? theme.warning : theme.text, opacity: countdownOpacity},
        ]}>
        {countdown}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  countdown: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});