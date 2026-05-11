import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../../theme';
import { useAppNavigation } from '../../navigation/AppNavigator';

const PREFS_KEY = '@TourMate:preferences';

interface Preferences {
  currency: string;
  distanceUnit: 'km' | 'miles';
  language: string;
  notificationsEnabled: boolean;
  newsAlerts: boolean;
  tripReminders: boolean;
}

const DEFAULT_PREFS: Preferences = {
  currency: 'USD',
  distanceUnit: 'km',
  language: 'English',
  notificationsEnabled: true,
  newsAlerts: true,
  tripReminders: true,
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'LKR', 'AUD', 'CAD', 'JPY', 'INR'];
const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Hindi',
  'Sinhala',
  'Tamil',
];

const PreferencesScreen: React.FC = () => {
  const nav = useAppNavigation();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
      } catch {
        // use defaults
      }
    })();
  }, []);

  const save = useCallback(async (next: Preferences) => {
    setPrefs(next);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
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
    Alert.alert(
      title,
      undefined,
      [
        ...options.map(opt => ({
          text: opt === current ? `✓  ${opt}` : opt,
          onPress: () => save({ ...prefs, [key]: opt }),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true },
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
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
              <Text style={styles.rowIcon}>💱</Text>
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
              <Text style={styles.rowIcon}>🌐</Text>
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
              <Text style={styles.rowIcon}>📏</Text>
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
              <Text style={styles.rowIcon}>🔔</Text>
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
              <Text style={styles.rowIcon}>📰</Text>
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
              <Text style={styles.rowIcon}>🗓️</Text>
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
              <Text style={styles.rowIcon}>📱</Text>
              <Text style={styles.rowLabel}>App Version</Text>
            </View>
            <Text style={styles.valueText}>1.0.0</Text>
          </View>
          <View style={styles.rowSep} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>🗺️</Text>
              <Text style={styles.rowLabel}>TourMate</Text>
            </View>
            <Text style={styles.valueText}>© 2025</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
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
});

export default PreferencesScreen;
