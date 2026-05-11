import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing, Typography } from '../../theme';
import StarField from '../../components/common/StarField';
import WeatherCard from '../../components/common/WeatherCard';
import { Skeleton } from '../../components/common/Skeleton';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { logoutUser } from '../../services/authService';

interface Props {
  userName: string;
}

const HomeScreen: React.FC<Props> = ({ userName }) => {
  const nav = useAppNavigation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, []);

  const handleARExplore = useCallback(() => {
    nav.navigate('AR');
  }, [nav]);

  const handleNotes = useCallback(() => {
    nav.navigate('Notes');
  }, [nav]);

  const handleBudget = useCallback(() => {
    nav.navigate('Budget');
  }, [nav]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // ignore errors clearing token locally
    }
    nav.setUser(null);
    nav.navigate('Login');
  }, [nav]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <StarField />

      <View
        style={{ width: '100%', paddingHorizontal: Spacing.xl, marginTop: 72 }}
      >
        <WeatherCard />
      </View>

      <View style={styles.container}>
        {/* <Text style={styles.welcomeLabel}>WELCOME BACK</Text>
        <Text style={styles.userName}>{userName} 👋</Text>
        <Text style={styles.tagline}>Ready to explore the world?</Text> */}

        {/* Notes quick-access card */}
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

            {/* Budget quick-access card */}
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

        {/* AR Explore button */}
        <TouchableOpacity
          style={styles.arButton}
          onPress={handleARExplore}
          activeOpacity={0.85}
        >
          <Text style={styles.arButtonLabel}>EXPLORE IN AR</Text>
          <Text style={styles.arButtonSub}>Point camera at nearby places</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  welcomeLabel: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: Spacing.sm,
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  tagline: {
    ...Typography.subtitle,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  arButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    width: '100%',
  },
  arButtonLabel: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
  arButtonSub: {
    color: Colors.white,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
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
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  notesCardSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  logoutButton: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  logoutText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

export default HomeScreen;
