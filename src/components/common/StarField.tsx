import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Star {
  id: number;
  top: number;
  left: number;
  size: number;
  opacity: number;
}

// Computed once at module level — stars are static decorations
const STARS: Star[] = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  top: Math.random() * SCREEN_H,
  left: Math.random() * SCREEN_W,
  size: Math.random() * 2 + 0.5,
  opacity: Math.random() * 0.35 + 0.08,
}));

const StarField: React.FC = () => {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {STARS.map(star => (
        <View
          key={star.id}
          style={{
            position: 'absolute',
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: Colors.textMuted,
            opacity: star.opacity * 0.5,
          }}
        />
      ))}
    </View>
  );
};

export default StarField;
