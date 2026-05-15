import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../../theme';

interface Props {
  onMenuPress: () => void;
}

/** Base height of the header bar (excluding status-bar inset). */
export const HEADER_BASE_HEIGHT = 56;

const AppHeader: React.FC<Props> = ({ onMenuPress }) => {
  const insets = useSafeAreaInsets();
  const sideWidth = 56;

  return (
    <View
      style={[
        styles.container,
        { height: HEADER_BASE_HEIGHT + (insets.top ?? 0), paddingTop: insets.top },
      ]}
    >
      <View style={[styles.side, { width: sideWidth }]}>
        <TouchableOpacity
          onPress={onMenuPress}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={styles.menuTouch}
          activeOpacity={0.7}
        >
          <View style={styles.hamburger}>
            <View style={styles.bar} />
            <View style={styles.bar} />
            <View style={styles.bar} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.center} pointerEvents="none">
        <Text style={[Typography.brandLogo, styles.brand]}>
          <Text style={styles.brandTour}>Tour</Text>
          <Text style={styles.brandMate}>Mate</Text>
        </Text>
      </View>

      <View style={[styles.side, { width: sideWidth }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.backgroundElevated,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    zIndex: 110,
    elevation: 6,
  },
  side: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTouch: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 18,
  },
  brandTour: {
    color: Colors.textPrimary,
  },
  brandMate: {
    color: Colors.primary,
  },
  hamburger: {
    width: 24,
    height: 16,
    justifyContent: 'space-between',
  },
  bar: {
    height: 2,
    backgroundColor: Colors.textPrimary,
    borderRadius: 1,
    width: 20,
  },
});

export default AppHeader;
