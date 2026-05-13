import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { getToken, getUser } from '../../services/authService';

const SplashScreen: React.FC = () => {
  const nav = useAppNavigation();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in → blink twice (1→0→1→0→1) → navigate
    Animated.sequence([
      // Initial fade-in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Blink 1
      Animated.timing(opacity, {
        toValue: 0.15,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      // Blink 2
      Animated.timing(opacity, {
        toValue: 0.15,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      // Hold
      Animated.delay(500),
    ]).start(async ({ finished }) => {
      if (!finished) return;
      try {
        const [token, savedUser] = await Promise.all([getToken(), getUser()]);
        if (token && savedUser) {
          nav.setUser(savedUser);
          nav.navigate('Home');
        } else {
          nav.navigate('Login');
        }
      } catch {
        nav.navigate('Login');
      }
    });

    return () => opacity.stopAnimation();
  }, [nav, opacity]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.center}>
        <Animated.Image
          source={require('../../assets/loading.png')}
          style={[styles.logo, { opacity }]}
          resizeMode="contain"
        />
        {/* <Text style={styles.brand}>TourMate</Text> */}
        <Text style={styles.tagline}>Curating your next adventure…</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: Spacing.xl,
  },
  brand: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1.5,
  },
  tagline: {
    marginTop: Spacing.sm,
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },
});

export default SplashScreen;
