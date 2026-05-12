import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: any) => void;
}

interface MenuItem {
  label: string;
  icon: string;
  screen: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Home', icon: 'home-outline', screen: 'Home' },
  { label: 'Map', icon: 'map-outline', screen: 'Map' },
  { label: 'AR', icon: 'cube-scan', screen: 'AR' },
  { label: 'Budget', icon: 'wallet-outline', screen: 'Budget' },
  { label: 'Notes', icon: 'notebook-outline', screen: 'Notes' },
  { label: 'Weather', icon: 'weather-partly-cloudy', screen: 'Home' },
  { label: 'Profile', icon: 'account-circle-outline', screen: 'Profile' },
];

const PANEL_WIDTH = 272;

const Drawer: React.FC<Props> = ({ visible, onClose, onNavigate }) => {
  const slideAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -PANEL_WIDTH,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Icon name="compass-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.brand}>TourMate</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Icon name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Menu items */}
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.label}
            style={styles.item}
            activeOpacity={0.75}
            onPress={() => {
              onNavigate(item.screen);
              onClose();
            }}
          >
            <View style={styles.iconWrap}>
              <Icon name={item.icon} size={21} color={Colors.primary} />
            </View>
            <Text style={styles.menuText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: Colors.backgroundElevated,
    paddingTop: Platform.OS === 'android' ? 36 : 52,
    paddingBottom: Spacing.xxl,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 4, height: 0 },
    elevation: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(47,158,136,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  brand: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    marginHorizontal: Spacing.md,
    marginBottom: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(47,158,136,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});

export default Drawer;
