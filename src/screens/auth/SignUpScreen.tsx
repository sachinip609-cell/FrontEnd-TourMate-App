import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing } from '../../theme';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { registerUser } from '../../services/authService';

const SignUpScreen: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.decCircleLg} />
        <View style={styles.decCircleSm} />
        {/* <Image
          source={require('../../assets/loading.png')}
          style={styles.logo}
          resizeMode="contain"
        /> */}
        <Text style={styles.heroTitle}>TourMate</Text>
        <Text style={styles.heroTagline}>Begin your adventure today</Text>
      </View>

      {/* ── Card – always fills remaining screen space ────────────── */}
      <View style={styles.card}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.cardTitle}>Create account</Text>
            <Text style={styles.cardSub}>Join with TourMate</Text>

            {/* Full Name */}
            <View
              style={[
                styles.inputRow,
                focusedField === 'name' && styles.inputRowFocused,
              ]}
            >
              <Icon
                name="account-outline"
                size={17}
                color={
                  focusedField === 'name' ? Colors.primary : Colors.textMuted
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Full name"
                placeholderTextColor={Colors.inputPlaceholder}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                returnKeyType="next"
                underlineColorAndroid="transparent"
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>

            {/* Email */}
            <View
              style={[
                styles.inputRow,
                focusedField === 'email' && styles.inputRowFocused,
              ]}
            >
              <Icon
                name="email-outline"
                size={17}
                color={
                  focusedField === 'email' ? Colors.primary : Colors.textMuted
                }
                style={styles.inputIcon}
              />
              <TextInput
                ref={emailRef}
                style={styles.textInput}
                placeholder="Email address"
                placeholderTextColor={Colors.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                underlineColorAndroid="transparent"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            {/* Password */}
            <View
              style={[
                styles.inputRow,
                focusedField === 'password' && styles.inputRowFocused,
              ]}
            >
              <Icon
                name="lock-outline"
                size={17}
                color={
                  focusedField === 'password'
                    ? Colors.primary
                    : Colors.textMuted
                }
                style={styles.inputIcon}
              />
              <TextInput
                ref={passwordRef}
                style={styles.textInput}
                placeholder="Password (min 8 chars)"
                placeholderTextColor={Colors.inputPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="next"
                underlineColorAndroid="transparent"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={17}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View
              style={[
                styles.inputRow,
                focusedField === 'confirm' && styles.inputRowFocused,
              ]}
            >
              <Icon
                name="lock-check-outline"
                size={17}
                color={
                  focusedField === 'confirm' ? Colors.primary : Colors.textMuted
                }
                style={styles.inputIcon}
              />
              <TextInput
                ref={confirmRef}
                style={styles.textInput}
                placeholder="Confirm password"
                placeholderTextColor={Colors.inputPlaceholder}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                returnKeyType="done"
                underlineColorAndroid="transparent"
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={handleCreate}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={17}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Feedback */}
            {success ? (
              <View style={styles.feedbackRow}>
                <Icon
                  name="check-circle-outline"
                  size={13}
                  color={Colors.primary}
                />
                <Text style={styles.successText}>
                  Account created! Redirecting…
                </Text>
              </View>
            ) : error ? (
              <View style={styles.feedbackRow}>
                <Icon
                  name="alert-circle-outline"
                  size={13}
                  color={Colors.error}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* CTA */}
            <TouchableOpacity
              style={[styles.signUpBtn, isLoading && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={isLoading}
              activeOpacity={0.87}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.signUpBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Legal */}
            <Text style={styles.legalText}>
              By joining you agree to our Terms &amp; Privacy Policy.
            </Text>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => nav.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const HERO_H = 170;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primary },
  flex: { flex: 1 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    height: HERO_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
    overflow: 'hidden',
  },
  decCircleLg: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -50,
    right: -40,
  },
  decCircleSm: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: -10,
    left: -20,
  },
  logo: {
    width: 44,
    height: 44,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 1,
  },
  heroTagline: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
    letterSpacing: 0.3,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    backgroundColor: Colors.backgroundElevated,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 22,
    paddingBottom: 32,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  cardSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },

  // ── Inputs ────────────────────────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: 13,
    paddingHorizontal: 13,
    height: 48,
    backgroundColor: Colors.inputBackground,
    marginBottom: 10,
  },
  inputRowFocused: {
    borderColor: Colors.primary,
  },
  inputIcon: { marginRight: 9 },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },

  // ── Feedback ──────────────────────────────────────────────────────────────
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  errorText: { color: Colors.error, fontSize: 12, flex: 1 },
  successText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  signUpBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnDisabled: { opacity: 0.65 },
  signUpBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Legal + Footer ────────────────────────────────────────────────────────
  legalText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  footerText: { fontSize: 13, color: Colors.textSecondary },
  footerLink: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
});

export default SignUpScreen;
