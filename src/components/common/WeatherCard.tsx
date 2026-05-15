import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Spacing } from '../../theme';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Public type ─────────────────────────────────────────────────────────────

export interface LocationOverride {
  lat: number;
  lon: number;
  city: string;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface WeatherDay {
  date: string;
  maxC: number;
  minC: number;
  code: number;
  precipitation: number;
  isToday: boolean;
  isPast: boolean;
}

interface WeatherState {
  tempC?: number;
  feelsLike?: number;
  humidity?: number;
  description?: string;
  iconName?: string;
  city?: string;
  forecast?: WeatherDay[];
}

// Full WMO Weather interpretation codes (from Open-Meteo docs)
const weatherCodeMap: Record<number, { desc: string; icon: string }> = {
  0: { desc: 'Clear Sky', icon: 'weather-sunny' },
  1: { desc: 'Mainly Clear', icon: 'weather-partly-cloudy' },
  2: { desc: 'Partly Cloudy', icon: 'weather-partly-cloudy' },
  3: { desc: 'Overcast', icon: 'weather-cloudy' },
  45: { desc: 'Fog', icon: 'weather-fog' },
  48: { desc: 'Rime Fog', icon: 'weather-fog' },
  51: { desc: 'Light Drizzle', icon: 'weather-rainy' },
  53: { desc: 'Drizzle', icon: 'weather-rainy' },
  55: { desc: 'Dense Drizzle', icon: 'weather-rainy' },
  56: { desc: 'Freezing Drizzle', icon: 'weather-snowy-rainy' },
  57: { desc: 'Freezing Drizzle', icon: 'weather-snowy-rainy' },
  61: { desc: 'Light Rain', icon: 'weather-rainy' },
  63: { desc: 'Rain', icon: 'weather-pouring' },
  65: { desc: 'Heavy Rain', icon: 'weather-pouring' },
  66: { desc: 'Freezing Rain', icon: 'weather-snowy-rainy' },
  67: { desc: 'Freezing Rain', icon: 'weather-snowy-rainy' },
  71: { desc: 'Light Snow', icon: 'weather-snowy' },
  73: { desc: 'Snow', icon: 'weather-snowy' },
  75: { desc: 'Heavy Snow', icon: 'weather-snowy-heavy' },
  77: { desc: 'Snow Grains', icon: 'weather-snowy' },
  80: { desc: 'Rain Showers', icon: 'weather-rainy' },
  81: { desc: 'Rain Showers', icon: 'weather-pouring' },
  82: { desc: 'Violent Showers', icon: 'weather-pouring' },
  85: { desc: 'Snow Showers', icon: 'weather-snowy' },
  86: { desc: 'Snow Showers', icon: 'weather-snowy-heavy' },
  95: { desc: 'Thunderstorm', icon: 'weather-lightning' },
  96: { desc: 'Thunderstorm', icon: 'weather-lightning-rainy' },
  99: { desc: 'Thunderstorm', icon: 'weather-lightning-rainy' },
};

// Fetch current conditions using Open-Meteo REST API (plain fetch, works in React Native)
// Uses the modern `current=` parameter which returns a JSON `current` object
// ─── Day label helper ─────────────────────────────────────────────────────────

function dayLabel(date: string, isToday: boolean): string {
  if (isToday) return 'Today';
  const d = new Date(date + 'T00:00:00');
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

// ─── Open-Meteo fetch (current + 5-day: 1 past + today + 3 future) ───────────

async function fetchOpenMeteo(
  lat: number,
  lon: number,
): Promise<Omit<WeatherState, 'city'>> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code' +
    '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum' +
    '&past_days=1' +
    '&forecast_days=4' +
    '&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const json = await res.json();
  const c = json.current;
  if (!c) throw new Error('No current weather in response');
  const tempC = c.temperature_2m as number;
  const feelsLike = c.apparent_temperature as number;
  const humidity = Math.round(c.relative_humidity_2m as number);
  const code = Math.round(c.weather_code as number);
  const mapped = weatherCodeMap[code] ?? {
    desc: 'Unknown',
    icon: 'weather-partly-cloudy',
  };

  const daily = json.daily;
  const todayStr = new Date().toISOString().slice(0, 10);
  const forecast: WeatherDay[] = (daily?.time ?? []).map(
    (date: string, i: number) => ({
      date,
      maxC: Math.round(daily.temperature_2m_max[i]),
      minC: Math.round(daily.temperature_2m_min[i]),
      code: Math.round(daily.weather_code[i]),
      precipitation: Math.round(daily.precipitation_sum?.[i] ?? 0),
      isToday: date === todayStr,
      isPast: date < todayStr,
    }),
  );

  return {
    tempC,
    feelsLike,
    humidity,
    description: mapped.desc,
    iconName: mapped.icon,
    forecast,
  };
}

function tryGetGps(): Promise<{ lat: number; lon: number } | null> {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

// ─── Detect user location (IP fallbacks + GPS refinement) ─────────────────────

async function detectLocation(signal: {
  cancelled: boolean;
}): Promise<{ lat: number; lon: number; city: string }> {
  // Prefer GPS first for more accurate current-location weather. If GPS fails or
  // permission is denied, fall back to IP-based providers.
  if (signal.cancelled) throw new Error('cancelled');

  try {
    let hasPermission = true;
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'TourMate needs your location for accurate weather',
          buttonPositive: 'OK',
        },
      );
      hasPermission = result === PermissionsAndroid.RESULTS.GRANTED;
    }

    if (hasPermission) {
      const gps = await tryGetGps();
      if (gps && !signal.cancelled) {
        // Try reverse geocoding to get a readable city name
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${gps.lat}&lon=${gps.lon}`,
          );
          if (r.ok) {
            const j = await r.json();
            const cityName =
              j.address?.city ||
              j.address?.town ||
              j.address?.village ||
              j.address?.county ||
              'Unknown';
            return { city: cityName, lat: gps.lat, lon: gps.lon };
          }
        } catch {
          return { city: 'Unknown', lat: gps.lat, lon: gps.lon };
        }
      }
    }
  } catch {
    // Fall through to IP providers
  }

  const providers = [
    {
      url: 'https://ipapi.co/json/',
      parser: (p: any) => ({
        city: p.city || p.region || p.country_name,
        lat: p.latitude,
        lon: p.longitude,
      }),
    },
    {
      url: 'https://ipwhois.app/json/',
      parser: (p: any) => ({
        city: p.city || p.region || p.country,
        lat: p.latitude,
        lon: p.longitude,
      }),
    },
    {
      url: 'https://geolocation-db.com/json/',
      parser: (p: any) => ({
        city: p.city || p.region || p.country_name,
        lat: p.latitude,
        lon: p.longitude,
      }),
    },
    {
      url: 'https://ipinfo.io/json',
      parser: (p: any) => ({
        city: p.city || p.region || p.country,
        lat: p.loc ? Number(p.loc.split(',')[0]) : p.latitude,
        lon: p.loc ? Number(p.loc.split(',')[1]) : p.longitude,
      }),
    },
  ];

  for (const prov of providers) {
    if (signal.cancelled) throw new Error('cancelled');
    try {
      const r = await fetch(prov.url);
      if (!r.ok) continue;
      const j = await r.json();
      const parsed = prov.parser(j);
      const plat = Number(parsed.lat);
      const plon = Number(parsed.lon);
      if (!Number.isFinite(plat) || !Number.isFinite(plon)) continue;
      return { city: parsed.city ?? 'Unknown', lat: plat, lon: plon };
    } catch {
      continue;
    }
  }

  // Final fallback
  return { city: 'Colombo (fallback)', lat: 6.9271, lon: 79.8612 };
}

// ─── WeatherCard Props ────────────────────────────────────────────────────────

interface WeatherCardProps {
  locationOverride?: LocationOverride | null;
}

// ─── Forecast Day Chip ────────────────────────────────────────────────────────

const ForecastChip: React.FC<{ day: WeatherDay }> = ({ day }) => {
  const mapped = weatherCodeMap[day.code] ?? {
    desc: 'Unknown',
    icon: 'weather-partly-cloudy',
  };
  const label = dayLabel(day.date, day.isToday);
  return (
    <View style={[fc.chip, day.isToday && fc.todayChip]}>
      <Text
        style={[
          fc.dayLabel,
          day.isToday && fc.todayLabel,
          day.isPast && fc.pastLabel,
        ]}
      >
        {label}
      </Text>
      <Icon
        name={mapped.icon}
        size={20}
        color={
          day.isToday
            ? Colors.primary
            : day.isPast
            ? Colors.textMuted
            : '#2B4B57'
        }
        style={{ marginVertical: 4 }}
      />
      <Text
        style={[
          fc.maxTemp,
          day.isToday && fc.todayMaxTemp,
          day.isPast && fc.pastTemp,
        ]}
      >
        {day.maxC}°
      </Text>
      <Text style={fc.minTemp}>{day.minC}°</Text>
      {day.precipitation > 0 ? (
        <View style={fc.rainRow}>
          <Icon name="water-outline" size={10} color="#4A9EC4" />
          <Text style={fc.rainText}>{day.precipitation}mm</Text>
        </View>
      ) : null}
    </View>
  );
};

const fc = StyleSheet.create({
  chip: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: 'rgba(47,158,136,0.06)',
    minWidth: 62,
  },
  todayChip: {
    backgroundColor: 'rgba(47,158,136,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(47,158,136,0.3)',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600' as any,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  todayLabel: { color: Colors.primary },
  pastLabel: { color: Colors.textMuted },
  maxTemp: { fontSize: 14, fontWeight: '700' as any, color: '#0D2B26' },
  todayMaxTemp: { color: Colors.primary },
  pastTemp: { color: Colors.textMuted },
  minTemp: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  rainRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  rainText: { fontSize: 9, color: '#4A9EC4', marginLeft: 2 },
});

// ─── WeatherCard component ────────────────────────────────────────────────────

const WeatherCard: React.FC<WeatherCardProps> = ({ locationOverride }) => {
  const [state, setState] = useState<WeatherState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const signal = { cancelled: false };
    setLoading(true);
    setError(null);
    setState({});

    const run = async () => {
      try {
        let lat: number;
        let lon: number;
        let city: string;

        if (locationOverride) {
          lat = locationOverride.lat;
          lon = locationOverride.lon;
          city = locationOverride.city;
        } else {
          const loc = await detectLocation(signal);
          if (signal.cancelled) return;
          lat = loc.lat;
          lon = loc.lon;
          city = loc.city;
        }

        if (signal.cancelled) return;
        const weather = await fetchOpenMeteo(lat, lon);
        if (!signal.cancelled) setState({ ...weather, city });
      } catch (e: any) {
        if (!signal.cancelled && e?.message !== 'cancelled') {
          setError(e?.message ?? 'Weather unavailable');
        }
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      signal.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    locationOverride?.lat,
    locationOverride?.lon,
    locationOverride?.city,
    tick,
  ]);

  const { iconName, description, tempC, feelsLike, humidity, city, forecast } =
    state;

  return (
    <View style={styles.card}>
      {/* ── Current conditions row ── */}
      <View style={styles.currentRow}>
        <View style={styles.iconBox}>
          {loading ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <Icon
              name={iconName ?? 'weather-partly-cloudy'}
              size={28}
              color={Colors.primary}
            />
          )}
        </View>

        <View style={styles.mid}>
          <Text style={styles.locationText} numberOfLines={1}>
            {loading ? 'Detecting location…' : city ?? 'Unknown location'}
          </Text>
          <Text style={styles.descText}>
            {loading ? '' : description ?? '—'}
          </Text>
          {!loading && humidity != null ? (
            <Text style={styles.metaText}>
              {`Feels ${
                feelsLike != null ? Math.round(feelsLike) : '--'
              }°C  •  ${humidity}% humidity`}
            </Text>
          ) : null}
        </View>

        <View style={styles.tempBox}>
          <Text style={styles.tempText}>
            {!loading && tempC != null
              ? `${Math.round(tempC)}°C`
              : loading
              ? ''
              : '—'}
          </Text>
          {locationOverride ? (
            <View style={styles.searchedBadge}>
              <Icon name="magnify" size={10} color={Colors.primary} />
              <Text style={styles.searchedBadgeText}>Searched</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Error / Retry ── */}
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert-circle-outline" size={14} color={Colors.error} />
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => setTick(c => c + 1)}
            style={styles.retryBtn}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Forecast strip ── */}
      {!loading && !error && forecast && forecast.length > 0 ? (
        <>
          <View style={styles.divider} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.forecastStrip}
          >
            {forecast.map(day => (
              <ForecastChip key={day.date} day={day} />
            ))}
          </ScrollView>
        </>
      ) : loading ? (
        <>
          <View style={styles.divider} />
          <View style={styles.forecastStrip}>
            {[1, 2, 3, 4, 5].map(k => (
              <View key={k} style={[fc.chip, { opacity: 0.3 }]}>
                <View
                  style={{
                    width: 28,
                    height: 10,
                    borderRadius: 4,
                    backgroundColor: Colors.border,
                  }}
                />
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: Colors.border,
                    marginVertical: 6,
                  }}
                />
                <View
                  style={{
                    width: 24,
                    height: 10,
                    borderRadius: 4,
                    backgroundColor: Colors.border,
                  }}
                />
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 16,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    marginBottom: Spacing.base,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(47,158,136,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  mid: { flex: 1 },
  locationText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700' as any,
  },
  descText: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  metaText: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },
  tempBox: { alignItems: 'flex-end' },
  tempText: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800' as any,
  },
  searchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47,158,136,0.1)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 3,
  },
  searchedBadgeText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: '600' as any,
    marginLeft: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  forecastStrip: {
    flexDirection: 'row',
    paddingBottom: Spacing.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  errorText: { color: Colors.error, fontSize: 11, flex: 1, marginLeft: 4 },
  retryBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(47,158,136,0.1)',
    borderRadius: 6,
  },
  retryText: { color: Colors.primary, fontWeight: '700' as any, fontSize: 12 },
});

export default WeatherCard;
