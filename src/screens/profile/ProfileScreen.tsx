import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Colors, Spacing, Typography } from '../../theme';
import {
  ProfileHeaderSkeleton,
  Skeleton,
} from '../../components/common/Skeleton';
import {
  getUser,
  clearToken,
  clearUser,
  getToken,
  saveUser,
} from '../../services/authService';
import { fetchNotes } from '../../services/notesService';
import { AppConfig } from '../../constants/AppConfig';
import { useAppNavigation } from '../../navigation/AppNavigator';

const AVATAR_SIZE = 104;

const ProfileScreen: React.FC = () => {
  const nav = useAppNavigation();
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [notesCount, setNotesCount] = useState<number>(0);
  const [placesCount, setPlacesCount] = useState<number>(0);
  const [tripsCount, setTripsCount] = useState<number>(0);

  const loadUser = useCallback(async () => {
    const u = await getUser();
    setUser(u);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getUser();
      if (mounted) setUser(u);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Refresh numeric stats (notes, trips, places)
  const refreshCounts = useCallback(async () => {
    try {
      const notes = await fetchNotes();
      setNotesCount(notes.length);
      // For now treat trips as number of notes (adjust later if trips model added)
      setTripsCount(notes.length);

      const token = await getToken();
      const res = await fetch(`${AppConfig.api.baseUrl}/places`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (res.ok && json.success && json.data?.places) {
        setPlacesCount(
          Array.isArray(json.data.places) ? json.data.places.length : 0,
        );
      }
    } catch (err) {
      // ignore count errors silently
    }
  }, []);

  useEffect(() => {
    // Trigger a refresh whenever this screen becomes the active screen.
    if (nav.current === 'Profile') refreshCounts();
    // Also run once on mount
    refreshCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.current]);

  const pickAvatar = async () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.6,
        maxWidth: 400,
        maxHeight: 400,
      },
      async response => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset?.base64 || !asset.type) return;

        const dataUri = `data:${asset.type};base64,${asset.base64}`;
        setUploading(true);
        try {
          const token = await getToken();
          const res = await fetch(`${AppConfig.api.baseUrl}/auth/update`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fullName: user?.fullName,
              email: user?.email,
              avatarUrl: dataUri,
            }),
          });
          const json = await res.json();
          if (!res.ok || !json.success)
            throw new Error(json.message || 'Upload failed');
          await saveUser(json.data.user);
          setUser(json.data.user);
        } catch (e: any) {
          Alert.alert('Error', e.message || 'Failed to update avatar');
        } finally {
          setUploading(false);
        }
      },
    );
  };

  const onLogout = async () => {
    await clearToken();
    await clearUser();
    nav.navigate('Login');
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'ME';

  const menuItems = [
    {
      icon: '👤',
      label: 'Personal Information',
      sublabel: 'Name, email and account details',
      onPress: () => nav.navigate('ProfileEdit'),
    },
    {
      icon: '✈️',
      label: 'Travel History',
      sublabel: 'Your explored destinations',
      onPress: () => nav.navigate('TravelHistory'),
    },
    {
      icon: '⚙️',
      label: 'Preferences',
      sublabel: 'Currency, language & notifications',
      onPress: () => nav.navigate('Preferences'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      {!user ? (
        <View style={styles.headerCard}>
          <ProfileHeaderSkeleton />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              paddingVertical: 12,
            }}
          >
            {[1, 2, 3].map(k => (
              <Skeleton key={k} width={60} height={40} borderRadius={8} />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={pickAvatar}
            activeOpacity={0.8}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraButton}>
              {uploading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.cameraIcon}>📷</Text>
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.fullName ?? 'Explorer'}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ''}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{tripsCount}</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{placesCount}</Text>
              <Text style={styles.statLabel}>Places</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{notesCount}</Text>
              <Text style={styles.statLabel}>Notes</Text>
            </View>
          </View>
        </View>
      )}

      {/* Menu */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.menuCard}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                idx < menuItems.length - 1 && styles.menuItemBorder,
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIcon}>
                <Text style={styles.menuIconText}>{item.icon}</Text>
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSublabel}>{item.sublabel}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>SESSION</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, styles.menuIconDanger]}>
              <Text style={styles.menuIconText}>🚪</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, styles.dangerText]}>
                Sign Out
              </Text>
              <Text style={styles.menuSublabel}>Log out of your account</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingTop: 80,
    paddingBottom: 120,
    paddingHorizontal: Spacing.base,
  },

  // Header card
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: Spacing.md,
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: Colors.white, fontSize: 36, fontWeight: '700' },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  cameraIcon: { fontSize: 14 },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.inputBorder,
    paddingTop: Spacing.base,
    width: '100%',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statDivider: {
    width: 1,
    backgroundColor: Colors.inputBorder,
    height: 36,
    alignSelf: 'center',
  },

  // Menu
  menuSection: { marginBottom: Spacing.base },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAF6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuIconDanger: { backgroundColor: '#FFF0F0' },
  menuIconText: { fontSize: 18 },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  menuSublabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  dangerText: { color: Colors.error },
  chevron: { fontSize: 22, color: Colors.textMuted, lineHeight: 24 },

  version: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: Spacing.sm,
  },
});

export default ProfileScreen;
