import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../../theme';

// ─── Single shimmer block ──────────────────────────────────────────────────────

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// ─── Base style (shared) ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#D8E0E0',
  },
});

// ─── Component ───────────────────────────────────────────────────────────────

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
};

// ─── Pre-built note card skeleton ─────────────────────────────────────────────

export const NoteCardSkeleton: React.FC = () => (
  <View style={cardStyles.card}>
    <View style={cardStyles.row}>
      <Skeleton
        width={16}
        height={16}
        borderRadius={4}
        style={{ marginRight: 8 }}
      />
      <Skeleton width="60%" height={14} />
    </View>
    <Skeleton width="100%" height={12} style={{ marginTop: 8 }} />
    <Skeleton width="75%" height={12} style={{ marginTop: 6 }} />
    <Skeleton width={80} height={10} style={{ marginTop: 10 }} />
  </View>
);

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});

// ─── Pre-built budget card skeleton ───────────────────────────────────────────

export const BudgetCardSkeleton: React.FC = () => (
  <View style={budgetSkelStyles.card}>
    <View style={budgetSkelStyles.row}>
      <Skeleton width="50%" height={15} />
      <Skeleton width={60} height={12} />
    </View>
    <Skeleton width="80%" height={11} style={{ marginTop: 8 }} />
    <Skeleton
      width="100%"
      height={6}
      borderRadius={3}
      style={{ marginTop: 10 }}
    />
  </View>
);

const budgetSkelStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

// ─── Pre-built news card skeleton ─────────────────────────────────────────────

export const NewsCardSkeleton: React.FC = () => (
  <View style={newsSkelStyles.card}>
    <View style={newsSkelStyles.row}>
      <Skeleton
        width={80}
        height={80}
        borderRadius={10}
        style={{ marginRight: 12 }}
      />
      <View style={{ flex: 1 }}>
        <Skeleton width="90%" height={14} />
        <Skeleton width="60%" height={12} style={{ marginTop: 8 }} />
        <Skeleton width="100%" height={11} style={{ marginTop: 6 }} />
        <Skeleton width="80%" height={11} style={{ marginTop: 5 }} />
      </View>
    </View>
  </View>
);

const newsSkelStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});

// ─── Pre-built travel history card skeleton ────────────────────────────────────

export const TravelCardSkeleton: React.FC = () => (
  <View style={travelSkelStyles.card}>
    <Skeleton
      width={44}
      height={44}
      borderRadius={12}
      style={{ marginRight: 12 }}
    />
    <View style={{ flex: 1 }}>
      <Skeleton width="60%" height={14} />
      <Skeleton width="80%" height={12} style={{ marginTop: 7 }} />
      <Skeleton width={70} height={10} style={{ marginTop: 8 }} />
    </View>
  </View>
);

const travelSkelStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
});

// ─── Pre-built profile header skeleton ────────────────────────────────────────

export const ProfileHeaderSkeleton: React.FC = () => (
  <View style={profSkelStyles.container}>
    <Skeleton
      width={104}
      height={104}
      borderRadius={52}
      style={{ alignSelf: 'center' }}
    />
    <Skeleton
      width={160}
      height={18}
      borderRadius={9}
      style={{ alignSelf: 'center', marginTop: 16 }}
    />
    <Skeleton
      width={120}
      height={13}
      borderRadius={6}
      style={{ alignSelf: 'center', marginTop: 8 }}
    />
  </View>
);

const profSkelStyles = StyleSheet.create({
  container: { padding: 24 },
});

export default Skeleton;
