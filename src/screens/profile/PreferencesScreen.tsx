import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../../theme';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { AppConfig } from '../../constants/AppConfig';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PREFS_KEY = '@TourMate:preferences';

const PREFS_VERSION = 2;

interface Preferences {
  currency: string;
  distanceUnit: 'km' | 'miles';
  language: string;
  notificationsEnabled: boolean;
  newsAlerts: boolean;
  tripReminders: boolean;
  prefsVersion?: number;
}

const DEFAULT_PREFS: Preferences = {
  currency: 'LKR',
  distanceUnit: 'km',
  language: 'English',
  notificationsEnabled: true,
  newsAlerts: true,
  tripReminders: true,
  prefsVersion: PREFS_VERSION,
};

const CURRENCIES = ['USD', 'LKR'];
const LANGUAGES = ['English', 'Sinhala', 'Tamil'];

const PreferencesScreen: React.FC = () => {
  const nav = useAppNavigation();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Preferences;
          let merged: Preferences = { ...DEFAULT_PREFS, ...parsed };

          // Migration: if stored prefs are from older version, update defaults
          // but only override USD -> DEFAULT_PREFS.currency to avoid clobbering
          // explicit user choices in other currencies.
          if (!parsed.prefsVersion || parsed.prefsVersion < PREFS_VERSION) {
            if (parsed.currency === 'USD') {
              merged.currency = DEFAULT_PREFS.currency;
            }
            merged.prefsVersion = PREFS_VERSION;
            try {
              await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(merged));
            } catch {
              // ignore persist errors
            }
          }

          setPrefs(merged);
        } else {
          setPrefs(DEFAULT_PREFS);
        }
      } catch {
        // use defaults
        setPrefs(DEFAULT_PREFS);
      }
    })();
  }, []);

  const save = useCallback(async (next: Preferences) => {
    const toSave: Preferences = { ...next, prefsVersion: PREFS_VERSION };
    setPrefs(toSave);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(toSave));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Alert.alert('Error', 'Failed to save preferences.');
    }
  }, []);

  const toggle = (key: keyof Preferences) => {
    save({ ...prefs, [key]: !prefs[key as keyof Preferences] });
  };

  const pickOption = (
    title: string,
    options: string[],
    current: string,
    key: keyof Preferences,
  ) => {
    // Use in-app modal picker for longer lists (Android Alert limits buttons)
    setPickerTitle(title);
    setPickerOptions(options);
    setPickerKey(key);
    setPickerVisible(true);
  };

  // Picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerOptions, setPickerOptions] = useState<string[]>([]);
  const [pickerTitle, setPickerTitle] = useState('');
  const [pickerKey, setPickerKey] = useState<keyof Preferences | null>(null);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Preferences</Text>
        {saved ? (
          <View style={styles.savedBadge}>
            <Text style={styles.savedBadgeText}>Saved ✓</Text>
          </View>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Display settings */}
        <Text style={styles.sectionTitle}>DISPLAY</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              pickOption(
                'Select Currency',
                CURRENCIES,
                prefs.currency,
                'currency',
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Icon
                name="currency-usd"
                size={20}
                color={Colors.primary}
                style={styles.rowIcon}
              />
              <View>
                <Text style={styles.rowLabel}>Currency</Text>
                <Text style={styles.rowValue}>{prefs.currency}</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.rowSep} />

          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              pickOption(
                'Select Language',
                LANGUAGES,
                prefs.language,
                'language',
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Icon name="translate" size={20} color={Colors.primary} style={styles.rowIcon} />
              <View>
                <Text style={styles.rowLabel}>Language</Text>
                <Text style={styles.rowValue}>{prefs.language}</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.rowSep} />

          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              pickOption(
                'Distance Unit',
                ['km', 'miles'],
                prefs.distanceUnit,
                'distanceUnit',
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Icon name="ruler" size={20} color={Colors.primary} style={styles.rowIcon} />
              <View>
                <Text style={styles.rowLabel}>Distance Unit</Text>
                <Text style={styles.rowValue}>{prefs.distanceUnit}</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Icon name="bell-outline" size={20} color={Colors.primary} style={styles.rowIcon} />
              <View>
                <Text style={styles.rowLabel}>Push Notifications</Text>
                <Text style={styles.rowValue}>Enable all notifications</Text>
              </View>
            </View>
            <Switch
              value={prefs.notificationsEnabled}
              onValueChange={() => toggle('notificationsEnabled')}
              trackColor={{ false: Colors.inputBorder, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.rowSep} />

          <View
            style={[
              styles.row,
              !prefs.notificationsEnabled && styles.rowDisabled,
            ]}
          >
            <View style={styles.rowLeft}>
              <Icon name="newspaper" size={20} color={Colors.primary} style={styles.rowIcon} />
              <View>
                <Text style={styles.rowLabel}>Travel News</Text>
                <Text style={styles.rowValue}>Breaking travel stories</Text>
              </View>
            </View>
            <Switch
              value={prefs.newsAlerts && prefs.notificationsEnabled}
              onValueChange={() => toggle('newsAlerts')}
              disabled={!prefs.notificationsEnabled}
              trackColor={{ false: Colors.inputBorder, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.rowSep} />

          <View
            style={[
              styles.row,
              !prefs.notificationsEnabled && styles.rowDisabled,
            ]}
          >
            <View style={styles.rowLeft}>
              <Icon name="calendar" size={20} color={Colors.primary} style={styles.rowIcon} />
              <View>
                <Text style={styles.rowLabel}>Trip Reminders</Text>
                <Text style={styles.rowValue}>Upcoming trip alerts</Text>
              </View>
            </View>
            <Switch
              value={prefs.tripReminders && prefs.notificationsEnabled}
              onValueChange={() => toggle('tripReminders')}
              disabled={!prefs.notificationsEnabled}
              trackColor={{ false: Colors.inputBorder, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Icon name="cellphone" size={20} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>App Version</Text>
            </View>
            <Text style={styles.valueText}>{AppConfig.appVersion}</Text>
          </View>
          <View style={styles.rowSep} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Icon name="map-marker" size={20} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>TourMate</Text>
            </View>
            <Text style={styles.valueText}>© {new Date().getFullYear()}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => {
            Alert.alert(
              'Reset Preferences',
              'Restore all settings to default?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', onPress: () => save(DEFAULT_PREFS) },
              ],
            );
          }}
        >
          <Text style={styles.resetBtnText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Picker modal for options (currency, language, etc.) */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{pickerTitle}</Text>
            <ScrollView style={styles.modalList}>
              {pickerOptions.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={styles.modalItem}
                  onPress={() => {
                    if (pickerKey) save({ ...prefs, [pickerKey]: opt } as Preferences);
                    setPickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      pickerKey && prefs[pickerKey] === opt && styles.modalItemSelected,
                    ]}
                  >
                    {pickerKey && prefs[pickerKey] === opt ? `✓  ${opt}` : opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8, // overridden dynamically via insets.top + 8
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
  },
  backBtn: { width: 60 },
  backIcon: { fontSize: 28, color: Colors.primary, lineHeight: 32 },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  savedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  savedBadgeText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },

  content: { padding: Spacing.base, paddingBottom: 100 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    marginTop: Spacing.base,
    marginLeft: 2,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  rowDisabled: { opacity: 0.4 },
  rowSep: {
    height: 1,
    backgroundColor: Colors.inputBorder,
    marginHorizontal: Spacing.base,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: { fontSize: 20, marginRight: Spacing.md, width: 28 },
  rowLabel: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  rowValue: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  chevron: { fontSize: 22, color: Colors.textMuted },
  valueText: { fontSize: 13, color: Colors.textSecondary },

  resetBtn: {
    marginTop: Spacing.xl,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.lg,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  modalList: { maxHeight: 320 },
  modalItem: { paddingVertical: 12 },
  modalItemText: { fontSize: 15, color: Colors.textPrimary },
  modalItemSelected: { color: Colors.primary, fontWeight: '700' },
  modalCancel: {
    marginTop: Spacing.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { color: Colors.textSecondary, fontSize: 15 },
});

export default PreferencesScreen;
