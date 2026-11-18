// src/components/ProgressRing.tsx
// v2.0 Emerald: a ring that fills clockwise from the top. Built from plain views (two clipped
// half rings), so it needs no extra native library.

import React from 'react';
import {View, StyleSheet} from 'react-native';

interface ProgressRingProps {
  size: number;
  stroke: number;
  /** 0 to 1 */
  progress: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
}

// A full circle whose top and right borders are coloured: that is half a ring (from the top-left
// diagonal round to the bottom-right diagonal). Rotating it by 45 degrees covers the right half.
const HalfRing: React.FC<{size: number; stroke: number; color: string; rotate: number}> = ({size, stroke, color, rotate}) => (
  <View
    style={[
      styles.abs,
      styles.half,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: stroke,
        borderTopColor: color,
        borderRightColor: color,
        transform: [{rotate: `${rotate}deg`}],
      },
    ]}
  />
);

export const ProgressRing: React.FC<ProgressRingProps> = ({size, stroke, progress, color, trackColor, children}) => {
  const deg = Math.max(0, Math.min(1, progress || 0)) * 360;
  const half = size / 2;
  return (
    <View style={{width: size, height: size}}>
      <View style={[styles.abs, {width: size, height: size, borderRadius: half, borderWidth: stroke, borderColor: trackColor}]} />
      {/* First half (0 to 180 degrees) shows through a window on the right */}
      <View style={[styles.abs, styles.clip, {left: half, width: half, height: size}]}>
        <View style={[styles.abs, {left: -half, width: size, height: size}]}>
          <HalfRing size={size} stroke={stroke} color={color} rotate={Math.min(deg, 180) - 135} />
        </View>
      </View>
      {/* Second half (180 to 360 degrees) shows through a window on the left */}
      {deg > 180 ? (
        <View style={[styles.abs, styles.clip, {width: half, height: size}]}>
          <HalfRing size={size} stroke={stroke} color={color} rotate={deg - 135} />
        </View>
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  abs: {position: 'absolute', top: 0, left: 0},
  half: {borderBottomColor: 'transparent', borderLeftColor: 'transparent'},
  clip: {overflow: 'hidden'},
  center: {alignItems: 'center', justifyContent: 'center'},
});
