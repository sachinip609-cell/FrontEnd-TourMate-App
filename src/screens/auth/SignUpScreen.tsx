import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Radius } from '../../theme';
import { AppStrings } from '../../constants';
import AppTextInput from '../../components/common/AppTextInput';
import AppButton from '../../components/common/AppButton';
import StarField from '../../components/common/StarField';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { registerUser } from '../../services/authService';

const S = AppStrings.signUp;

const SignUpScreen: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const nav = useAppNavigation();

  const handleCreate = useCallback(async () => {
    if (!fullName || !email || !password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await registerUser(fullName.trim(), email.trim(), password);
      setSuccess(true);
      setTimeout(() => nav.navigate('Login'), 1500);
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [fullName, email, password, confirm, nav]);

  const handleSignIn = useCallback(() => {
    nav.navigate('Login');
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
          keyboardShouldPersistTaps="handled"
        >
          {/* header spacing only (brand moved to AppHeader) */}
          <View style={styles.headerSection} />

          {/* ── Greeting ── */}
          <View style={styles.greetingSection}>
            <Text style={Typography.headline}>{S.headline}</Text>
            <Text style={[Typography.subtitle, styles.subtitleSpacing]}>
              {S.subtitle}
            </Text>
          </View>

          {/* ── Form (flat, like Login) ── */}
          <View style={styles.formSection}>
            <AppTextInput
              label={S.fullNameLabel}
              placeholder={S.fullNamePlaceholder}
              value={fullName}
              onChangeText={setFullName}
            />
            <AppTextInput
              label={S.emailLabel}
              placeholder={S.emailPlaceholder}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <AppTextInput
              label={S.passwordLabel}
              secureTextEntry
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
            />
            <AppTextInput
              label={S.confirmLabel}
              secureTextEntry
              textContentType="newPassword"
              value={confirm}
              onChangeText={setConfirm}
            />
          </View>

          <AppButton
            title={S.createButton}
            onPress={handleCreate}
            isLoading={isLoading}
            style={styles.signUpButton}
          />

          {success ? (
            <Text style={styles.successText}>
              Account created! Redirecting to sign in…
            </Text>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <Text style={styles.legalText}>{S.legalText}</Text>

          {/* ── Footer ── */}
          <View style={styles.footerRow}>
            <Text style={Typography.footerText}>{S.footerPrompt}</Text>
            <TouchableOpacity onPress={handleSignIn} activeOpacity={0.7}>
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
  tagline: {
    marginTop: Spacing.sm,
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
  signUpButton: {
    marginTop: Spacing.xxl,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  successText: {
    color: Colors.primary,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  legalText: {
    ...Typography.subtitle,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
});

export default SignUpScreen;
