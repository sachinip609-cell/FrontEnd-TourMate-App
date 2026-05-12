import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing } from '../../theme';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface WeatherState {
  tempC?: number;
  feelsLike?: number;
  humidity?: number;
  description?: string;
  iconName?: string;
  city?: string;
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
async function fetchOpenMeteo(
  lat: number,
  lon: number,
): Promise<Omit<WeatherState, 'city'>> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code' +
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
  return {
    tempC,
    feelsLike,
    humidity,
    description: mapped.desc,
    iconName: mapped.icon,
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

async function loadWeather(signal: {
  cancelled: boolean;
}): Promise<WeatherState> {
  // Step 1: Try multiple IP-based location providers (fallbacks)
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
        lat: p.loc ? p.loc.split(',')[0] : p.latitude,
        lon: p.loc ? p.loc.split(',')[1] : p.longitude,
      }),
    },
  ];

  let ipData: { city?: string; lat?: any; lon?: any } | null = null;
  const errors: string[] = [];
  for (const prov of providers) {
    try {
      const r = await fetch(prov.url);
      if (!r.ok) {
        errors.push(`${prov.url} ${r.status}`);
        continue;
      }
      const j = await r.json();
      const parsed = prov.parser(j);
      const plat = Number(parsed.lat);
      const plon = Number(parsed.lon);
      if (!Number.isFinite(plat) || !Number.isFinite(plon)) {
        errors.push(`${prov.url} invalid coords`);
        continue;
      }
      ipData = { city: parsed.city, lat: plat, lon: plon };
      break;
    } catch (e: any) {
      errors.push(`${prov.url} ${e?.message ?? String(e)}`);
    }
  }

  if (!ipData) {
    // Try GPS as a last resort (permissions may be required)
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
        if (gps) {
          // Reverse-geocode with Nominatim to get a friendly city name
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
                null;
              try {
                const w = await fetchOpenMeteo(gps.lat, gps.lon);
                return { ...w, city: cityName ?? 'Unknown location' };
              } catch {
                return { city: cityName ?? 'Unknown location' };
              }
            }
          } catch {
            // ignore and continue
            try {
              const w = await fetchOpenMeteo(gps.lat, gps.lon);
              return { ...w, city: 'Unknown location' };
            } catch {
              // ignore
            }
          }
        }
      }
    } catch {
      // continue to final error
    }

    // As a last-ditch fallback, try fetching weather for a default city (Colombo)
    try {
      const DEF_LAT = 6.9271;
      const DEF_LON = 79.8612;
      const w = await fetchOpenMeteo(DEF_LAT, DEF_LON);
      return { ...w, city: 'Colombo (fallback)' };
    } catch (e: any) {
      throw new Error(
        'Could not determine location: ' +
          errors.join('; ') +
          '; fallback failed: ' +
          (e?.message ?? String(e)),
      );
    }
  }

  const city: string = ipData.city ?? 'Unknown location';
  let lat = Number(ipData.lat);
  let lon = Number(ipData.lon);

  if (signal.cancelled) return {};

  // Step 2: Optionally refine coordinates with GPS (keep IP city name)
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
      if (gps) {
        lat = gps.lat;
        lon = gps.lon;
      }
    }
  } catch {
    // GPS failed, continue with IP coordinates
  }

  if (signal.cancelled) return {};

  // Step 3: Get weather for the best coordinates we have
  try {
    const weather = await fetchOpenMeteo(lat, lon);
    return { ...weather, city };
  } catch (e: any) {
    // If weather fetch fails for these coords, surface an informative error
    throw new Error(`Weather fetch failed: ${e?.message ?? String(e)}`);
  }
}

const WeatherCard: React.FC = () => {
  const [state, setState] = useState<WeatherState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const signal = { cancelled: false };
    setLoading(true);
    setError(null);
    setState({});

    loadWeather(signal)
      .then(w => {
        if (!signal.cancelled) setState(w);
      })
      .catch(e => {
        if (!signal.cancelled) setError(e?.message ?? 'Weather unavailable');
      })
      .finally(() => {
        if (!signal.cancelled) setLoading(false);
      });

    return () => {
      signal.cancelled = true;
    };
  }, [tick]);

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Icon
            name={state.iconName ?? 'weather-partly-cloudy'}
            size={26}
            color={Colors.primary}
          />
        )}
      </View>

      <View style={styles.mid}>
        <Text style={styles.location} numberOfLines={1}>
          {loading ? 'Detecting location...' : state.city ?? 'Unknown location'}
        </Text>
        <Text style={styles.desc}>
          {loading ? '' : state.description ?? '---'}
        </Text>
        {!loading && state.humidity != null ? (
          <Text style={styles.meta}>
            {`Feels ${
              state.feelsLike != null ? Math.round(state.feelsLike) : '--'
            }\u00b0C  \u2022  ${state.humidity}% humidity`}
          </Text>
        ) : null}
        {error ? (
          <>
            <TouchableOpacity
              onPress={() => setTick(c => c + 1)}
              style={styles.retry}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
            <Text style={styles.errorText} numberOfLines={2}>
              {error}
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.right}>
        <Text style={styles.temp}>
          {!loading && state.tempC != null
            ? `${Math.round(state.tempC)}°C`
            : loading
            ? ''
            : '---'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: 'rgba(234,241,245,0.95)',
    borderRadius: 12,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  left: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  mid: { flex: 1 },
  right: { alignItems: 'flex-end' },
  location: { color: '#2B4B57', fontSize: 12, fontWeight: '700' },
  desc: { color: '#234047', fontSize: 14, marginTop: 2 },
  meta: { color: '#4A6880', fontSize: 11, marginTop: 3 },
  temp: { color: '#234047', fontSize: 22, fontWeight: '800' },
  retry: { marginTop: 6 },
  retryText: { color: Colors.primary, fontWeight: '700' },
  errorText: { color: '#B00020', fontSize: 12, marginTop: 6 },
});

export default WeatherCard;
