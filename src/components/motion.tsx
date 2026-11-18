// src/components/motion.tsx
// Gentle animations (v1.6): a fade-up for cards when they first appear, and a slow "breathing"
// glow behind the next prayer. Both run on the native driver and are skipped when the phone's
// "Reduce motion" accessibility setting is on.

import React, {useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

// Read once at start-up, so the first animations already respect the setting.
let reduceMotionCache = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then(value => {
    reduceMotionCache = value;
  })
  .catch(() => {});

/** True when the phone asks apps to reduce motion. Updates if the setting changes. */
export const useReduceMotion = (): boolean => {
  const [reduce, setReduce] = useState(reduceMotionCache);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        reduceMotionCache = value;
        if (mounted) {
          setReduce(value);
        }
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      reduceMotionCache = value;
      setReduce(value);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduce;
};

interface FadeInViewProps {
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Fades and slides its content up into place once, when it first appears. */
export const FadeInView: React.FC<FadeInViewProps> = ({delay = 0, style, children}) => {
  const reduce = useReduceMotion();
  const progress = useRef(new Animated.Value(reduceMotionCache ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotionCache) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);

  const animatedStyle = reduce
    ? null
    : {
        opacity: progress,
        transform: [{translateY: progress.interpolate({inputRange: [0, 1], outputRange: [8, 0]})}],
      };

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

interface BreathingHighlightProps {
  color: string;
  radius: number;
}

/** A soft glow that slowly breathes behind a card. Decorative only; it never takes touches. */
export const BreathingHighlight: React.FC<BreathingHighlightProps> = ({color, radius}) => {
  const reduce = useReduceMotion();
  const glow = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reduce) {
      glow.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(glow, {toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, glow]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: color,
          borderRadius: radius,
          opacity: glow.interpolate({inputRange: [0, 1], outputRange: [0.04, 0.14]}),
        },
      ]}
    />
  );
};
