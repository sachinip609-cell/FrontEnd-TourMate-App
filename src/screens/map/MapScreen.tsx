import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from 'react-native-geolocation-service';
import { Colors, Spacing } from '../../theme';
import { FontSizes, FontWeight, Radius } from '../../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchAccommodations,
  GooglePlace,
  PlaceCategory,
  searchPlaces,
} from '../../services/googlePlacesService';
import { saveSearchHistory } from '../../services/searchHistoryService';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { HEADER_BASE_HEIGHT } from '../../components/common/AppHeader';

// ─── Max markers to render at once (prevents OOM on Android) ──────────────────
const MAX_MARKERS = 25;

// ─── Constants ────────────────────────────────────────────────────────────────

const BOTTOM_SHEET_H = 260;
const FETCH_DEBOUNCE_MS = 700;
const MIN_FETCH_MOVE_METERS = 250;

// Default fallback region (Sigiriya, Sri Lanka)
const DEFAULT_REGION: Region = {
  latitude: 7.9572,
  longitude: 80.7603,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

// ─── Category config ──────────────────────────────────────────────────────────

interface CategoryOption {
  key: PlaceCategory;
  label: string;
  color: string;
}

const CATEGORIES: CategoryOption[] = [
  { key: 'all', label: 'All', color: Colors.primary },
  { key: 'hotels', label: '🏨 Hotels', color: '#0099A8' },
  { key: 'restaurants', label: '🍽 Restaurants', color: '#E07B39' },
  { key: 'villas', label: '🏡 Villas', color: '#27AE60' },
  { key: 'hospitals', label: '\uD83C\uDFE5 Hospitals', color: '#E53935' },
];

const CATEGORY_COLOR: Record<PlaceCategory, string> = {
  all: Colors.primary,
  hotels: '#0099A8',
  restaurants: '#E07B39',
  villas: '#27AE60',
  hospitals: '#E53935',
};

// Purple pin for text-search results
const SEARCH_PIN_COLOR = '#9C27B0';

// Map Google place types → human-readable history category label
function mapTypesToCategory(types: string[]): string {
  if (
    types.some(t =>
      [
        'hospital',
        'health',
        'doctor',
        'dentist',
        'pharmacy',
        'physiotherapist',
      ].includes(t),
    )
  )
    return 'Hospital';
  if (types.includes('lodging')) return 'Hotel';
  if (
    types.some(t =>
      [
        'restaurant',
        'food',
        'cafe',
        'bakery',
        'meal_takeaway',
        'meal_delivery',
      ].includes(t),
    )
  )
    return 'Restaurant';
  if (types.includes('park') || types.includes('natural_feature'))
    return 'Nature';
  if (types.includes('museum')) return 'Museum';
  if (
    types.includes('tourist_attraction') ||
    types.includes('point_of_interest')
  )
    return 'Heritage';
  return 'Destination';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priceLabel(level: number | null): string {
  if (level === null) return '';
  return ['Free', '$', '$$', '$$$', '$$$$'][level] ?? '';
}

function approxDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const latMeters = Math.abs(a.latitude - b.latitude) * 111_320;
  const avgLat = ((a.latitude + b.latitude) / 2) * (Math.PI / 180);
  const lonMeters =
    Math.abs(a.longitude - b.longitude) * 111_320 * Math.cos(avgLat);
  return Math.sqrt(latMeters * latMeters + lonMeters * lonMeters);
}

async function ensureLocationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('whenInUse');
      return status === 'granted';
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'TourMate Location Permission',
        message: 'TourMate needs your location to show nearby places.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const MapScreen: React.FC = () => {
  const mapRef = useRef<MapView>(null);

  const insets = useSafeAreaInsets();
  const topBase = (insets.top ?? 0) + HEADER_BASE_HEIGHT;

  // Track whether THIS screen is the currently active tab.
  // Because the component is always mounted (never unmounted on tab switch),
  // we use this to gate side-effects to when the screen is actually visible.
  const { current: activeScreen } = useAppNavigation();
  const isVisible = activeScreen === 'Map';

  // FIX 1: single isMounted ref used by ALL effects and callbacks
  const isMounted = useRef(true);
  // FIX 2: only render markers after the native map surface is ready
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      // Component only truly unmounts when the whole app is destroyed.
      // Do NOT reset mapReady — the native MapView persists across tab switches.
      isMounted.current = false;
    };
  }, []);

  // Fallback: when the user first taps Map tab and onMapReady hasn’t fired yet
  // (can happen when the map renders while display:‘none’), set mapReady after a
  // short delay so markers are never stuck hidden.
  useEffect(() => {
    if (!isVisible || mapReady) return;
    const timer = setTimeout(() => {
      if (isMounted.current) setMapReady(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [isVisible, mapReady]);

  // Location & map region
  const [region, setRegion] = useState<Region | null>(null);
  const [searchRegion, setSearchRegion] = useState<Region | null>(null);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapRegionRef = useRef<Region | null>(null);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchCenterRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Places state
  const [places, setPlaces] = useState<GooglePlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Category filter
  const [activeCategory, setActiveCategory] = useState<PlaceCategory>('all');

  // Selected place bottom sheet
  const [selectedPlace, setSelectedPlace] = useState<GooglePlace | null>(null);
  const sheetAnim = useRef(new Animated.Value(BOTTOM_SHEET_H)).current;

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<GooglePlace | null>(null);

  // ── Obtain location once — but only after the screen becomes visible ────────
  // Using a ref so we never request location twice, even if isVisible toggles.
  const locationRequested = useRef(false);
  useEffect(() => {
    if (!isVisible || locationRequested.current) return;
    locationRequested.current = true;

    (async () => {
      try {
        const granted = await ensureLocationPermission();
        if (!isMounted.current) return;

        if (!granted) {
          if (!isMounted.current) return;
          setRegion(DEFAULT_REGION);
          setSearchRegion(DEFAULT_REGION);
          mapRegionRef.current = DEFAULT_REGION;
          return;
        }

        Geolocation.getCurrentPosition(
          pos => {
            if (!isMounted.current) return;
            const { latitude, longitude } = pos.coords;
            setUserCoords({ latitude, longitude });
            const initial = {
              latitude,
              longitude,
              latitudeDelta: 0.025,
              longitudeDelta: 0.025,
            };
            setRegion(initial);
            setSearchRegion(initial);
            mapRegionRef.current = initial;
          },
          _err => {
            if (!isMounted.current) return;
            setRegion(DEFAULT_REGION);
            setSearchRegion(DEFAULT_REGION);
            mapRegionRef.current = DEFAULT_REGION;
          },
          { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
        );
      } catch {
        if (!isMounted.current) return;
        setRegion(DEFAULT_REGION);
        setSearchRegion(DEFAULT_REGION);
        mapRegionRef.current = DEFAULT_REGION;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // ── Fetch places when map center/category changes ─────────────────────────
  useEffect(() => {
    if (!searchRegion) return;

    // FIX 2: cancelled flag scoped per effect run to cancel in-flight fetch
    let cancelled = false;

    if (isMounted.current) {
      setLoading(true);
      setError(null);
    }

    fetchAccommodations(
      searchRegion.latitude,
      searchRegion.longitude,
      activeCategory,
      1500,
    )
      .then(results => {
        if (cancelled || !isMounted.current) return;
        // FIX 3: cap markers to prevent OOM on Android
        setPlaces(results.slice(0, MAX_MARKERS));
      })
      .catch(err => {
        if (cancelled || !isMounted.current) return;
        setError(err.message ?? 'Failed to load places.');
      })
      .finally(() => {
        if (cancelled || !isMounted.current) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, searchRegion?.latitude, searchRegion?.longitude]);

  useEffect(() => {
    return () => {
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
    };
  }, []);

  // ── FIX 4: stop all animations when component unmounts ────────────────────
  useEffect(() => {
    return () => {
      sheetAnim.stopAnimation();
    };
  }, [sheetAnim]);

  // ── Bottom sheet open/close ────────────────────────────────────────────────
  const openSheet = useCallback(
    (place: GooglePlace) => {
      if (!isMounted.current) return;
      setSelectedPlace(place);
      sheetAnim.stopAnimation();
      Animated.spring(sheetAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    },
    [sheetAnim],
  );

  const closeSheet = useCallback(() => {
    sheetAnim.stopAnimation();
    Animated.timing(sheetAnim, {
      toValue: BOTTOM_SHEET_H,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      // FIX 5: only update state if animation completed AND still mounted
      if (finished && isMounted.current) {
        setSelectedPlace(null);
      }
    });
  }, [sheetAnim]);

  // ── Directions ─────────────────────────────────────────────────────────────
  const openDirections = useCallback(
    (place: GooglePlace) => {
      const dest = `${place.latitude},${place.longitude}`;
      const originPart = userCoords
        ? Platform.OS === 'ios'
          ? `&saddr=${userCoords.latitude},${userCoords.longitude}`
          : `&origin=${userCoords.latitude},${userCoords.longitude}`
        : '';
      const url =
        Platform.OS === 'ios'
          ? `maps://?daddr=${dest}${originPart}`
          : `https://www.google.com/maps/dir/?api=1&destination=${dest}${originPart}&travelmode=driving`;
      Linking.openURL(url).catch(() =>
        Linking.openURL(`https://maps.google.com/?q=${dest}`),
      );
    },
    [userCoords],
  );

  const queueRegionFetch = useCallback((nextRegion: Region) => {
    const nextCenter = {
      latitude: nextRegion.latitude,
      longitude: nextRegion.longitude,
    };
    const lastCenter = lastFetchCenterRef.current;
    if (
      lastCenter &&
      approxDistanceMeters(lastCenter, nextCenter) < MIN_FETCH_MOVE_METERS
    ) {
      return;
    }

    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
    fetchDebounceRef.current = setTimeout(() => {
      if (!isMounted.current) return;
      lastFetchCenterRef.current = nextCenter;
      setSearchRegion(nextRegion);
    }, FETCH_DEBOUNCE_MS);
  }, []);

  // ── Place search ───────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || searching) return;
    Keyboard.dismiss();
    setSearching(true);
    setError(null);
    try {
      const results = await searchPlaces(
        q,
        userCoords?.latitude,
        userCoords?.longitude,
      );
      if (!isMounted.current) return;
      if (results.length === 0) {
        setError(`No places found for "${q}"`);
        return;
      }
      const place = results[0];
      setSearchResult(place);
      const newRegion: Region = {
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      mapRef.current?.animateToRegion(newRegion, 600);
      mapRegionRef.current = newRegion;
      openSheet(place);
      // Save to local search history (non-blocking)
      saveSearchHistory({
        id: place.id,
        name: place.name,
        shortDescription: place.shortDescription,
        category: mapTypesToCategory(place.types),
        latitude: place.latitude,
        longitude: place.longitude,
        searchQuery: q,
        searchedAt: Date.now(),
      }).catch(() => {});
    } catch (err: any) {
      if (isMounted.current) setError(err.message ?? 'Search failed.');
    } finally {
      if (isMounted.current) setSearching(false);
    }
  }, [searchQuery, searching, userCoords, openSheet]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResult(null);
    closeSheet();
  }, [closeSheet]);

  // ── Recenter ───────────────────────────────────────────────────────────────
  const recenter = useCallback(() => {
    if (!userCoords || !mapRef.current) return;
    const targetRegion = {
      ...userCoords,
      latitudeDelta: 0.025,
      longitudeDelta: 0.025,
    };
    mapRegionRef.current = targetRegion;
    mapRef.current.animateToRegion(targetRegion, 600);
    queueRegionFetch(targetRegion);
  }, [userCoords, queueRegionFetch]);

  // ── Zoom handlers ────────────────────────────────────────────────────────
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));
  const zoomIn = useCallback(() => {
    const currentRegion = mapRegionRef.current ?? region;
    if (!currentRegion || !mapRef.current) return;
    const newLatDelta = clamp(currentRegion.latitudeDelta * 0.5, 0.0005, 1);
    const newLonDelta = clamp(currentRegion.longitudeDelta * 0.5, 0.0005, 1);
    const newRegion = {
      ...currentRegion,
      latitudeDelta: newLatDelta,
      longitudeDelta: newLonDelta,
    };
    mapRegionRef.current = newRegion;
    mapRef.current.animateToRegion(newRegion, 300);
    queueRegionFetch(newRegion);
  }, [region, queueRegionFetch]);

  const zoomOut = useCallback(() => {
    const currentRegion = mapRegionRef.current ?? region;
    if (!currentRegion || !mapRef.current) return;
    const newLatDelta = clamp(currentRegion.latitudeDelta * 2, 0.0005, 180);
    const newLonDelta = clamp(currentRegion.longitudeDelta * 2, 0.0005, 180);
    const newRegion = {
      ...currentRegion,
      latitudeDelta: newLatDelta,
      longitudeDelta: newLonDelta,
    };
    mapRegionRef.current = newRegion;
    mapRef.current.animateToRegion(newRegion, 300);
    queueRegionFetch(newRegion);
  }, [region, queueRegionFetch]);

  // ── Category chip press ────────────────────────────────────────────────────
  const onChipPress = useCallback(
    (cat: PlaceCategory) => {
      if (cat === activeCategory) return;
      setActiveCategory(cat);
      closeSheet();
    },
    [activeCategory, closeSheet],
  );

  // ── Loading screen (awaiting location) ────────────────────────────────────
  if (!region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.initText}>Getting your location…</Text>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* ── Google Map ─────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        mapType="standard"
        initialRegion={region}
        // Enable pinch zoom and other map gestures
        zoomEnabled={true}
        zoomControlEnabled={Platform.OS === 'android'}
        pitchEnabled={true}
        rotateEnabled={true}
        onRegionChangeComplete={(r: Region) => {
          mapRegionRef.current = r;
          queueRegionFetch(r);
        }}
        // FIX 6: do NOT use showsUserLocation — it spins up a second location
        // engine on Android that conflicts with react-native-geolocation-service
        showsUserLocation={false}
        showsMyLocationButton={false}
        // FIX 7: reduce JS↔Native bridge traffic on Android
        moveOnMarkerPress={false}
        onMapReady={() => {
          if (isMounted.current) setMapReady(true);
        }}
        onPress={() => selectedPlace && closeSheet()}
      >
        {/* Only render markers after the native surface is ready — prevents crash
            when JS tries to add child views before the MapView layout is measured */}
        {mapReady && userCoords && (
          <Marker
            key="__user__"
            coordinate={userCoords}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.userDot} />
          </Marker>
        )}
        {/* Search-result pin — purple, shown until cleared */}
        {mapReady && searchResult && (
          <Marker
            key={`__search__${searchResult.id}`}
            coordinate={{
              latitude: searchResult.latitude,
              longitude: searchResult.longitude,
            }}
            pinColor={SEARCH_PIN_COLOR}
            title={searchResult.name}
            tracksViewChanges={false}
            onPress={() => openSheet(searchResult)}
          />
        )}
        {mapReady &&
          places.map(place => (
            <Marker
              key={place.id}
              coordinate={{
                latitude: place.latitude,
                longitude: place.longitude,
              }}
              pinColor={CATEGORY_COLOR[place.category]}
              title={place.name}
              description={place.shortDescription}
              // FIX 9: CRITICAL — prevents re-drawing native marker view on every JS render
              tracksViewChanges={false}
              onPress={() => openSheet(place)}
            />
          ))}
      </MapView>

      {/* ── Zoom controls ─────────────────────────────────────────────────── */}
      <View style={styles.zoomContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={zoomIn}
          activeOpacity={0.85}
        >
          <Text style={styles.zoomText}>＋</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.zoomBtn, styles.zoomBtnLower]}
          onPress={zoomOut}
          activeOpacity={0.85}
        >
          <Text style={styles.zoomText}>－</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <View style={[styles.searchBar, { top: topBase + 10 }] }>
        <TextInput
          style={styles.searchInput}
          placeholder="Search places..."
          placeholderTextColor={Colors.textMuted ?? '#aaa'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          editable={!searching}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && !searching && (
          <TouchableOpacity
            style={styles.searchClearBtn}
            onPress={clearSearch}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              name="close-circle"
              size={18}
              color={Colors.textMuted ?? '#999'}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.searchSubmitBtn,
            (searching || !searchQuery.trim()) && styles.searchSubmitDisabled,
          ]}
          onPress={handleSearch}
          disabled={searching || !searchQuery.trim()}
          activeOpacity={0.85}
        >
          {searching ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Icon name="magnify" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Category filter chips ────────────────────────────────────────── */}
      <View style={[styles.filterBar, { top: topBase + 64 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {CATEGORIES.map((cat, idx) => {
            const isActive = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                // FIX 10: use marginRight instead of gap (gap in ScrollView contentContainerStyle
                // can cause layout calculation crashes on some Android versions)
                style={[
                  styles.chip,
                  { borderColor: cat.color },
                  isActive && { backgroundColor: cat.color },
                  idx < CATEGORIES.length - 1 && styles.chipMargin,
                ]}
                onPress={() => onChipPress(cat.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.chipText, isActive && styles.chipTextActive]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Recenter button ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.recenterBtn}
        onPress={recenter}
        activeOpacity={0.85}
      >
        <Icon name="crosshairs-gps" size={26} color={Colors.primary} />
      </TouchableOpacity>

      {/* ── Loading overlay ─────────────────────────────────────────────────── */}
      {loading && (
        <View style={[styles.loadingPill, { top: topBase + 116 }]}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.loadingPillText}>Searching nearby…</Text>
        </View>
      )}

      {/* ── Result count badge ──────────────────────────────────────────────── */}
      {!loading && places.length > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{places.length} places found</Text>
        </View>
      )}

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error !== null && !loading && (
        <View style={[styles.errorBanner, { top: topBase + 62 }]}>
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => setError(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.errorDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Place detail bottom sheet ────────────────────────────────────────── */}
      {selectedPlace !== null && (
        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: sheetAnim }] },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.sheetHandle} />

          {/* Category tag */}
          <View
            style={[
              styles.sheetCategoryTag,
              { backgroundColor: CATEGORY_COLOR[selectedPlace.category] },
            ]}
          >
            <Text style={styles.sheetCategoryText}>
              {selectedPlace.category.toUpperCase()}
            </Text>
          </View>

          {/* Place name */}
          <Text style={styles.sheetName} numberOfLines={2}>
            {selectedPlace.name}
          </Text>

          {/* Meta row — rating, price, open status */}
          <View style={styles.sheetMeta}>
            {selectedPlace.rating !== null && (
              <View style={styles.sheetMetaChip}>
                <Text style={styles.sheetMetaChipText}>
                  ★ {selectedPlace.rating.toFixed(1)}
                  {selectedPlace.userRatingsTotal
                    ? `  (${selectedPlace.userRatingsTotal})`
                    : ''}
                </Text>
              </View>
            )}
            {selectedPlace.priceLevel !== null && (
              <View style={styles.sheetMetaChip}>
                <Text style={styles.sheetMetaChipText}>
                  {priceLabel(selectedPlace.priceLevel)}
                </Text>
              </View>
            )}
            {selectedPlace.openNow !== null && (
              <View
                style={[
                  styles.sheetMetaChip,
                  {
                    backgroundColor: selectedPlace.openNow
                      ? '#E8F8EE'
                      : '#FDEDED',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sheetMetaChipText,
                    { color: selectedPlace.openNow ? '#27AE60' : '#E53935' },
                  ]}
                >
                  {selectedPlace.openNow ? 'Open now' : 'Closed'}
                </Text>
              </View>
            )}
          </View>

          {/* Address / vicinity */}
          {selectedPlace.shortDescription ? (
            <Text style={styles.sheetAddress} numberOfLines={1}>
              📍 {selectedPlace.shortDescription}
            </Text>
          ) : null}

          {/* Action buttons */}
          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnPrimary]}
              onPress={() => openDirections(selectedPlace)}
              activeOpacity={0.85}
            >
              <Text style={styles.sheetBtnPrimaryText}>Get Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnSecondary]}
              onPress={closeSheet}
              activeOpacity={0.85}
            >
              <Text style={styles.sheetBtnSecondaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  initText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: FontSizes.base,
  },

  // ── Filter bar ──────────────────────────────────────────────────────────────
  filterBar: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  filterContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    backgroundColor: Colors.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  chipMargin: {
    marginRight: Spacing.sm,
  },
  chipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeight.semibold as any,
    color: Colors.textPrimary,
  },
  chipTextActive: {
    color: Colors.white,
  },

  // ── Recenter ────────────────────────────────────────────────────────────────
  recenterBtn: {
    position: 'absolute',
    bottom: 170,
    right: Spacing.base,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  // ── Loading pill ─────────────────────────────────────────────────────────────
  loadingPill: {
    position: 'absolute',
    top: 172,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    elevation: 5,
    gap: Spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  loadingPillText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },

  // ── Count badge ───────────────────────────────────────────────────────────────
  countBadge: {
    position: 'absolute',
    bottom: 170,
    left: Spacing.base,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    elevation: 4,
  },
  countText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeight.semibold as any,
  },

  // ── Error banner ──────────────────────────────────────────────────────────────
  errorBanner: {
    position: 'absolute',
    top: 118,
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: '#FDEDED',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
  },
  errorText: {
    color: '#E53935',
    fontSize: FontSizes.sm,
    flex: 1,
  },
  errorDismiss: {
    color: '#E53935',
    fontWeight: FontWeight.bold as any,
    marginLeft: Spacing.sm,
    fontSize: FontSizes.base,
  },

  // ── Bottom sheet ───────────────────────────────────────────────────────────────
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: BOTTOM_SHEET_H,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.inputBorder,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetCategoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },
  sheetCategoryText: {
    color: Colors.white,
    fontSize: FontSizes.xxs,
    fontWeight: FontWeight.bold as any,
    letterSpacing: 1,
  },
  sheetName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeight.bold as any,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    lineHeight: 22,
  },
  sheetMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.xs + 2,
  },
  sheetMetaChip: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  sheetMetaChipText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold as any,
  },
  sheetAddress: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  sheetActions: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  sheetBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 3,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnPrimary: {
    backgroundColor: Colors.primary,
    elevation: 2,
    marginRight: Spacing.sm,
  },
  sheetBtnPrimaryText: {
    color: Colors.white,
    fontWeight: FontWeight.bold as any,
    fontSize: FontSizes.sm,
  },
  sheetBtnSecondary: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
  },
  sheetBtnSecondaryText: {
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold as any,
    fontSize: FontSizes.sm,
  },

  // ── User location dot (replaces showsUserLocation) ────────────────────────
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4285F4',
    borderWidth: 2,
    borderColor: Colors.white,
  }, // ── Search bar ─────────────────────────────────────────────────────────
  searchBar: {
    position: 'absolute',
    top: 66,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 60,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  searchClearBtn: {
    paddingHorizontal: 6,
  },
  searchClearTxt: {
    fontSize: 13,
    color: Colors.textMuted ?? '#999',
  },
  searchSubmitBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  searchSubmitDisabled: {
    opacity: 0.45,
  },
  searchSubmitTxt: {
    fontSize: 16,
  },
  // removed – replaced by vector icon // ── Zoom controls ─────────────────────────────────────────────────────
  zoomContainer: {
    position: 'absolute',
    right: Spacing.base,
    bottom: 230,
    alignItems: 'center',
    zIndex: 12,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: Spacing.sm,
  },
  zoomBtnLower: {
    marginBottom: 0,
  },
  zoomText: {
    fontSize: 22,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
});

export default MapScreen;
