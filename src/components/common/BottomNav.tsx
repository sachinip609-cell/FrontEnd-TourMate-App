import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { Colors, Spacing } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

(Icon as any).loadFont?.();

const { width: SW } = Dimensions.get('window');

const tabs = [
  { key: 'Home', label: 'HOME', icon: 'home-outline' },
  { key: 'News', label: 'NEWS', icon: 'newspaper-variant-outline' },
  { key: 'Map', label: 'MAP', icon: 'map-outline' },
  { key: 'AR', label: 'SCAN', icon: 'qrcode-scan' },
  // { key: 'Group', label: 'GROUP', icon: 'account-group-outline' },
  { key: 'Profile', label: 'PROFILE', icon: 'account-outline' },
];

const BottomNav: React.FC = () => {
  const nav = useAppNavigation();
  const active = nav.current;
  const insets = useSafeAreaInsets();

  const bottomOffset = Math.max(8, insets.bottom + 6);

  return (
    <View
      style={[styles.container, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <View style={styles.inner}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={styles.tab}
            onPress={() => {
              if (t.key === 'AR') nav.navigate('AR');
              else nav.navigate(t.key as any);
            }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.iconWrap,
                active === t.key && styles.iconActiveWrap,
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  active === t.key && styles.iconCircleActive,
                ]}
              >
                <Icon
                  name={t.icon}
                  size={18}
                  color={
                    active === t.key ? Colors.onPrimary : Colors.textSecondary
                  }
                />
              </View>
            </View>
            <Text
              style={[styles.label, active === t.key && styles.labelActive]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
    elevation: 20,
    pointerEvents: 'box-none',
  },
  inner: {
    width: Math.min(SW - 24, 520),
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 28,
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActiveWrap: {},
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconCircleActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 8,
  },
  iconTxt: { fontSize: 18, color: Colors.textSecondary },
  iconTxtActive: { color: '#022' },
  label: { fontSize: 9, color: Colors.textMuted, marginTop: 6 },
  labelActive: { color: Colors.primary, fontWeight: '700' },
});

export default BottomNav;
