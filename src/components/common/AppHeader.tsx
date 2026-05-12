import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing, Typography } from '../../theme';
import { AppStrings } from '../../constants';
import { useAppNavigation } from '../../navigation/AppNavigator';

interface Props {
  onMenuPress: () => void;
}

const AppHeader: React.FC<Props> = ({ onMenuPress }) => {
  const nav = useAppNavigation();

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        onPress={onMenuPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.hamburger}>
          <View style={styles.bar} />
          <View style={styles.bar} />
          <View style={styles.bar} />
        </View>
      </TouchableOpacity>

      <Text style={Typography.brandLogo}>{AppStrings.brand.name}</Text>

      <TouchableOpacity
        onPress={() => {
          nav.navigate('News');
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.iconWrap}
      >
        <MaterialCommunityIcons
          name={nav.newsUnreadCount > 0 ? 'bell-ring' : 'bell-outline'}
          size={22}
          color={Colors.textPrimary}
        />
        {nav.newsUnreadCount > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {nav.newsUnreadCount > 99 ? '99+' : String(nav.newsUnreadCount)}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: Colors.backgroundElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    zIndex: 50,
    elevation: 0,
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
  iconWrap: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  countBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countText: {
    color: Colors.background,
    fontSize: 10,
    lineHeight: 12,
  },
});

export default AppHeader;
