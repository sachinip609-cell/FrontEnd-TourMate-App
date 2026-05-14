import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../../theme';
import { AppStrings } from '../../constants';
import AppTextInput from '../../components/common/AppTextInput';
import AppButton from '../../components/common/AppButton';
import StarField from '../../components/common/StarField';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { loginUser } from '../../services/authService';

const S = AppStrings.login;

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nav = useAppNavigation();

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const result = await loginUser(email.trim(), password);
      nav.setUser(result.user);
      nav.navigate('Home');
    } catch (err: any) {
      setError(err?.message ?? 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, nav]);

  const handleForgotPassword = useCallback(() => {
    // removed forgot-password navigation
  }, [nav]);

  const handleCreateAccount = useCallback(() => {
    nav.navigate('SignUp');
  }, [nav]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <StarField />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header spacing (brand shown in global AppHeader) ── */}
          <View style={styles.headerSection} />

          {/* ── Greeting ── */}
          <View style={styles.greetingSection}>
            <Text style={Typography.headline}>{S.headline}</Text>
            <Text style={[Typography.subtitle, styles.subtitleSpacing]}>
              {S.subtitle}
            </Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.formSection}>
            <AppTextInput
              label={S.emailLabel}
              placeholder={S.emailPlaceholder}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
            />
            <AppTextInput
              label={S.passwordLabel}
              secureTextEntry
              placeholder=""
              textContentType="password"
              returnKeyType="done"
              value={password}
              onChangeText={setPassword}
              containerStyle={styles.passwordInput}
            />
          </View>

          {/* ── Sign In CTA ── */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <AppButton
            title={S.signInButton}
            onPress={handleSignIn}
            isLoading={isLoading}
            style={styles.signInButton}
          />

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Text style={Typography.footerText}>{S.footerPrompt}</Text>
            <TouchableOpacity onPress={handleCreateAccount} activeOpacity={0.7}>
              <Text style={Typography.footerLink}>{S.footerCta}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xxxl,
  },
  greetingSection: {
    marginBottom: Spacing.xxl,
  },
  subtitleSpacing: {
    marginTop: Spacing.sm,
  },
  formSection: {
    marginBottom: Spacing.md,
  },
  passwordInput: {
    marginBottom: 0,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  signInButton: {
    marginTop: Spacing.xxl,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: Spacing.xxxl,
  },
});

export default LoginScreen;
