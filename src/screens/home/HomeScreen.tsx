import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing } from '../../theme';
import StarField from '../../components/common/StarField';
import WeatherCard, {
  LocationOverride,
} from '../../components/common/WeatherCard';
import { Skeleton } from '../../components/common/Skeleton';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { HEADER_BASE_HEIGHT } from '../../components/common/AppHeader';

import { GooglePlace, searchPlaces } from '../../services/googlePlacesService';
import { saveSearchHistory } from '../../services/searchHistoryService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  userName: string;
}

const HomeScreen: React.FC<Props> = ({ userName }) => {
  const nav = useAppNavigation();
  const [ready, setReady] = useState(false);
  const insets = useSafeAreaInsets();
  const topBase = (insets.top ?? 0) + HEADER_BASE_HEIGHT;

  // ── Place search state ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<GooglePlace[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationOverride, setLocationOverride] =
    useState<LocationOverride | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const WEATHER_OVERRIDE_KEY = 'TourMate:weatherOverride';

  // Load persisted searched location so the searched weather remains
  // displayed until the user clears it explicitly.
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(WEATHER_OVERRIDE_KEY);
        if (!json) return;
        const parsed = JSON.parse(json);
        if (isMounted.current && parsed) {
          setLocationOverride(parsed);
          setSearchQuery(parsed.city ?? '');
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, []);

  // ── Debounced autocomplete search ─────────────────────────────────────────
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      if (!isMounted.current) return;
      setSearching(true);
      try {
        const results = await searchPlaces(q);
        if (!isMounted.current) return;
        setSuggestions(results.slice(0, 6));
        setShowSuggestions(results.length > 0);
      } catch {
        if (isMounted.current) setSuggestions([]);
      } finally {
        if (isMounted.current) setSearching(false);
      }
    }, 500);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const handleSelectPlace = useCallback((place: GooglePlace) => {
    Keyboard.dismiss();
    setSearchQuery(place.name);
    setShowSuggestions(false);
    setSuggestions([]);
    const override = {
      lat: place.latitude,
      lon: place.longitude,
      city: place.name,
    } as LocationOverride;
    setLocationOverride(override);
    // Persist override so searched weather persists until cleared
    AsyncStorage.setItem(WEATHER_OVERRIDE_KEY, JSON.stringify(override)).catch(
      () => {},
    );
    // Save to history (non-blocking)
    saveSearchHistory({
      id: place.id,
      name: place.name,
      shortDescription: place.shortDescription,
      category: 'Destination',
      latitude: place.latitude,
      longitude: place.longitude,
      searchQuery: place.name,
      searchedAt: Date.now(),
    }).catch(() => {});
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setLocationOverride(null);
    // Remove persisted override so weather returns to current location
    AsyncStorage.removeItem(WEATHER_OVERRIDE_KEY).catch(() => {});
  }, []);

  const handleARExplore = useCallback(() => nav.navigate('AR'), [nav]);
  const handleNotes = useCallback(() => nav.navigate('Notes'), [nav]);
  const handleBudget = useCallback(() => nav.navigate('Budget'), [nav]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <StarField />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { flexGrow: 1, paddingTop: topBase + Spacing.sm },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
      >
        {/* ── Place Search Bar ── */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <Icon
              name="magnify"
              size={20}
              color={searching ? Colors.primary : Colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search a destination for weather…"
              placeholderTextColor={Colors.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
            />
            {searching ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
                style={{ marginRight: 8 }}
              />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={handleClearSearch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon
                  name="close-circle"
                  size={18}
                  color={Colors.textMuted}
                  style={{ marginRight: 8 }}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* ── Suggestions dropdown ── */}
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestions}>
              {suggestions.map((place, idx) => (
                <TouchableOpacity
                  key={place.id}
                  style={[
                    styles.suggestionItem,
                    idx < suggestions.length - 1 && styles.suggestionBorder,
                  ]}
                  onPress={() => handleSelectPlace(place)}
                  activeOpacity={0.75}
                >
                  <View style={styles.suggestionIcon}>
                    <Icon
                      name="map-marker-outline"
                      size={16}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {place.name}
                    </Text>
                    <Text style={styles.suggestionSub} numberOfLines={1}>
                      {place.shortDescription}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Weather Card ── */}
        <WeatherCard locationOverride={locationOverride} />

        {/* ── Quick-access cards ── */}
        {!ready ? (
          <>
            <View style={styles.notesCard}>
              <Skeleton
                width={42}
                height={42}
                borderRadius={12}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Skeleton width="50%" height={14} />
                <Skeleton width="80%" height={11} style={{ marginTop: 6 }} />
              </View>
            </View>
            <View style={styles.notesCard}>
              <Skeleton
                width={42}
                height={42}
                borderRadius={12}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Skeleton width="50%" height={14} />
                <Skeleton width="80%" height={11} style={{ marginTop: 6 }} />
              </View>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.notesCard}
              onPress={handleNotes}
              activeOpacity={0.82}
            >
              <View style={styles.notesCardIcon}>
                <Icon
                  name="notebook-outline"
                  size={22}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.notesCardText}>
                <Text style={styles.notesCardTitle}>Note</Text>
                <Text style={styles.notesCardSub}>
                  Keep your trip memories together effortlessly.
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.notesCard}
              onPress={handleBudget}
              activeOpacity={0.82}
            >
              <View
                style={[
                  styles.notesCardIcon,
                  { backgroundColor: 'rgba(0,153,168,0.08)' },
                ]}
              >
                <Icon name="wallet-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.notesCardText}>
                <Text style={styles.notesCardTitle}>Budget</Text>
                <Text style={styles.notesCardSub}>
                  Track your trip expenses and stay on budget.
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {/* ── AR Explore button ── */}
        <TouchableOpacity
          style={styles.arButton}
          onPress={handleARExplore}
          activeOpacity={0.85}
        >
          <Text style={styles.arButtonLabel}>EXPLORE IN AR</Text>
          <Text style={styles.arButtonSub}>Point camera at nearby places</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },

  // ── Search bar ────────────────────────────────────────────────────────────
  searchWrapper: {
    marginBottom: Spacing.base,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    height: 46,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  searchIcon: { marginLeft: 12, marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  suggestions: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(47,158,136,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '600' as any,
    color: Colors.textPrimary,
  },
  suggestionSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // ── Quick-access cards ────────────────────────────────────────────────────
  notesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 14,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  notesCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0,153,168,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  notesCardText: { flex: 1 },
  notesCardTitle: {
    color: Colors.textPrimary,
    fontWeight: '700' as any,
    fontSize: 14,
    marginBottom: 2,
  },
  notesCardSub: { color: Colors.textSecondary, fontSize: 12, lineHeight: 16 },

  // ── AR Button ────────────────────────────────────────────────────────────
  arButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    marginTop: Spacing.sm,
    width: '100%',
  },
  arButtonLabel: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800' as any,
    letterSpacing: 2,
  },
  arButtonSub: {
    color: Colors.white,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
});

export default HomeScreen;
