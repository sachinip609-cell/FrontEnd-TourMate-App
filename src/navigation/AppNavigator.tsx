import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useRef,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { Linking, View } from 'react-native';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SplashScreen from '../screens/onboarding/SplashScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import HomeScreen from '../screens/home/HomeScreen';
import ARScreen from '../screens/ar/ARScreen';
import MapScreen from '../screens/map/MapScreen';
import GroupScreen from '../screens/group/GroupScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ProfileDetailsScreen from '../screens/profile/ProfileDetailsScreen';
import TravelHistoryScreen from '../screens/profile/TravelHistoryScreen';
import PreferencesScreen from '../screens/profile/PreferencesScreen';
import NotesScreen from '../screens/notes/NotesScreen';
import BudgetScreen from '../screens/budget/BudgetScreen';
import NewsScreen from '../screens/news/NewsScreen';
import AppHeader from '../components/common/AppHeader';
import Drawer from '../components/common/Drawer';
import BottomNav from '../components/common/BottomNav';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { AuthUser } from '../services/authService';
import { getToken, getUser } from '../services/authService';
import { fetchLatestFirstId, fetchNewsPage } from '../services/newsService';

export type ScreenName =
  | 'Splash'
  | 'Welcome'
  | 'Login'
  | 'SignUp'
  | 'ForgotPassword'
  | 'Home'
  | 'AR'
  | 'Map'
  | 'Group'
  | 'Profile'
  | 'ProfileEdit'
  | 'TravelHistory'
  | 'Preferences'
  | 'Notes'
  | 'Budget'
  | 'News';

type Navigation = {
  current: ScreenName;
  navigate: (screen: ScreenName) => void;
  goBack: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  isDrawerOpen: boolean;
  setUser: (user: AuthUser | null) => void;
  user: AuthUser | null;
  newsUnreadCount: number;
  setNewsUnreadCount: (n: number) => void;
  markNewsRead: () => Promise<void>;
  // new helper to open AR with a placeId
  openArForPlace: (placeId: number) => void;
};

const NavigationContext = createContext<Navigation | null>(null);

export const useAppNavigation = (): Navigation => {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    // Fallback to avoid hard crash during hot-reloads or incorrect usage.
    // Provide no-op implementations and a warning so app keeps running.
    // NOTE: This masks the root cause; prefer ensuring components are rendered
    // inside `AppNavigator` for full functionality.
    // eslint-disable-next-line no-console
    console.warn(
      'useAppNavigation used outside AppNavigator — returning fallback',
    );
    const fallback: Navigation = {
      current: 'Splash',
      navigate: () => {},
      goBack: () => {},
      openDrawer: () => {},
      closeDrawer: () => {},
      isDrawerOpen: false,
      setUser: () => {},
      user: null,
      newsUnreadCount: 0,
      setNewsUnreadCount: () => {},
      markNewsRead: async () => {},
      openArForPlace: () => {},
    };
    return fallback;
  }

  return ctx;
};

export const AppNavigator: React.FC<{ children?: ReactNode }> = ({
  children,
}) => {
  const [stack, setStack] = useState<ScreenName[]>(['Splash']);
  const [arInitialPlace, setArInitialPlace] = useState<number | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [newsUnreadCount, setNewsUnreadCount] = useState<number>(0);
  const [lastSeenNewsId, setLastSeenNewsId] = useState<string | null>(null);
  // Ref kept in sync with lastSeenNewsId so the polling interval closure
  // always reads the latest value without re-creating the interval on each change.
  const lastSeenNewsIdRef = useRef<string | null>(null);
  useEffect(() => {
    lastSeenNewsIdRef.current = lastSeenNewsId;
  }, [lastSeenNewsId]);
  // Lazy-mount MapScreen: only mount after the user first navigates to Map.
  // Once mounted, keep it alive (we hide it via display:'none' instead of
  // unmounting) so the Google Maps native view is never destroyed mid-session.
  const [mapEverVisited, setMapEverVisited] = useState(false);

  const navigate = useCallback((screen: ScreenName) => {
    setStack(prev => [...prev, screen]);
    setDrawerOpen(false);
  }, []);

  // Open AR and provide an initial place id
  const openArForPlace = useCallback((placeId: number) => {
    setArInitialPlace(placeId);
    setStack(prev => [...prev, 'AR']);
    setDrawerOpen(false);
  }, []);

  const goBack = useCallback(() => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const current = stack[stack.length - 1];

  // Mark Map as ever-visited so we lazy-mount the MapScreen
  useEffect(() => {
    if (current === 'Map') setMapEverVisited(true);
  }, [current]);

  const markNewsRead = useCallback(async () => {
    try {
      const first = await fetchLatestFirstId();
      if (first) setLastSeenNewsId(first);
      setNewsUnreadCount(0);
    } catch {
      setNewsUnreadCount(0);
    }
  }, []);

  const nav: Navigation = useMemo(
    () => ({
      current,
      navigate,
      goBack,
      openDrawer,
      closeDrawer,
      isDrawerOpen,
      setUser,
      user,
      markNewsRead,
      newsUnreadCount,
      setNewsUnreadCount,
      openArForPlace,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, isDrawerOpen, user, markNewsRead, newsUnreadCount],
  );

  // Poll for new news headlines and set unread count when new items appear.
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const first = await fetchLatestFirstId();
        if (!mounted) return;
        setLastSeenNewsId(first);
      } catch {
        // ignore
      }
    };
    init();

    // helper to compute how many new articles arrived since lastSeenNewsId
    const check = async () => {
      try {
        const page1 = await fetchNewsPage(1);
        const a = page1.articles;
        if (!a || a.length === 0) return;
        const firstId = a[0].id;
        const seenId = lastSeenNewsIdRef.current;
        if (!seenId) {
          // first time — just record the current head, don't show as unread
          setLastSeenNewsId(firstId);
          return;
        }
        if (firstId === seenId) return;

        // find index of lastSeen in current page
        const idx = a.findIndex((x: { id: string }) => x.id === seenId);
        const newCount = idx >= 0 ? idx : a.length;
        if (newCount > 0) {
          setNewsUnreadCount(n => n + newCount);
        }
      } catch {
        // ignore
      }
    };

    const iv = setInterval(check, 60_000);
    // also run immediately every minute cycle start
    check();

    return () => {
      mounted = false;
      clearInterval(iv);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once — interval uses lastSeenNewsIdRef for latest value

  // Deep link handling: tourmate://place/42 or https://tourmate.example/place/42
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const m = url.match(/place\/(\d+)/);
      if (m) {
        const pid = Number(m[1]);
        if (Number.isInteger(pid)) openArForPlace(pid);
      }
    };

    Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => {});
    const sub = Linking.addEventListener('url', ev => handleUrl(ev.url));
    return () => sub.remove();
  }, [openArForPlace]);

  // Restore session on app start: token + persisted user
  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const u = await getUser();
        if (!u) return;
        if (!mounted) return;
        setUser(u);
        setStack(['Welcome']);
      } catch {
        // ignore restore errors — user will sign in normally
      }
    };
    restore();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <NavigationContext.Provider value={nav}>
      {nav.user !== null && !['ProfileEdit', 'TravelHistory', 'Preferences', 'Welcome'].includes(current) && (
        <AppHeader onMenuPress={openDrawer} />
      )}
      <Drawer
        visible={isDrawerOpen}
        onClose={closeDrawer}
        onNavigate={nav.navigate}
      />
      {children}
      {current === 'Splash' && <SplashScreen />}
      {current === 'Welcome' && (
        <WelcomeScreen userName={user?.fullName ?? 'Explorer'} />
      )}
      {current === 'Login' && <LoginScreen />}
      {current === 'SignUp' && <SignUpScreen />}
      {current === 'ForgotPassword' && <LoginScreen />}
      {current === 'Home' && (
        <HomeScreen userName={user?.fullName ?? 'Explorer'} />
      )}
      {current === 'AR' && (
        <ARScreen initialPlaceId={arInitialPlace ?? undefined} />
      )}
      {/*
        MapScreen is LAZY-MOUNTED: only rendered after the user first navigates
        to the Map tab. Once mounted it stays in the tree — the View is hidden
        via display:'none' instead of unmounted, so the native Google Maps view
        is never destroyed between tab switches (which would cause SDK crashes).
      */}
      {mapEverVisited && (
        <View style={current === 'Map' ? { flex: 1 } : { display: 'none' }}>
          <ErrorBoundary screenName="Map">
            <MapScreen />
          </ErrorBoundary>
        </View>
      )}
      {current === 'Group' && <GroupScreen />}
      {current === 'Profile' && <ProfileScreen />}
      {current === 'ProfileEdit' && <ProfileDetailsScreen />}
      {current === 'TravelHistory' && <TravelHistoryScreen />}
      {current === 'Preferences' && <PreferencesScreen />}
      {current === 'Notes' && <NotesScreen />}
      {current === 'Budget' && <BudgetScreen />}
      {current === 'News' && <NewsScreen />}
      {(current === 'Home' ||
        current === 'Map' ||
        current === 'Group' ||
        current === 'Profile' ||
        current === 'Notes' ||
        current === 'Budget' ||
        current === 'News') && <BottomNav />}
    </NavigationContext.Provider>
  );
};

export default AppNavigator;
