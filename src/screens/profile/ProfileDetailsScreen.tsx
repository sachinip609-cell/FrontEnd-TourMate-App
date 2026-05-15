import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';

import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';
import {
  getUser,
  clearUser,
  clearToken,
  getToken,
  saveUser,
} from '../../services/authService';
import { AppConfig } from '../../constants/AppConfig';
import { useAppNavigation } from '../../navigation/AppNavigator';

const AVATAR_SIZE = 88;

const ProfileDetailsScreen: React.FC = () => {
  const nav = useAppNavigation();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Change password states
  const [showChange, setShowChange] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  useEffect(() => {
    (async () => {
      const u = await getUser();
      if (u) {
        setUser(u);
        setFullName(u.fullName);
        setEmail(u.email);
        setAvatarUri(u.avatarUrl ?? null);
      }
    })();
  }, []);

  const authHeaders = async () => {
    const token = await getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const pickAvatar = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.6,
        maxWidth: 400,
        maxHeight: 400,
      },
      response => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset?.base64 || !asset.type) return;
        setAvatarUri(`data:${asset.type};base64,${asset.base64}`);
      },
    );
  };

  const onUpdate = async () => {
    setLoading(true);
    try {
      const body: any = { fullName, email };
      if (avatarUri !== user?.avatarUrl) body.avatarUrl = avatarUri;

      const res = await fetch(`${AppConfig.api.baseUrl}/auth/update`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || 'Update failed');
      await saveUser(json.data.user);
      Alert.alert('Success', 'Profile updated.');
      nav.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const submitChangePassword = async () => {
    if (!currentPw || !newPw)
      return Alert.alert('Error', 'Please enter current and new password.');
    if (newPw !== confirmPw)
      return Alert.alert('Error', 'New passwords do not match.');
    if (newPw.length < 8)
      return Alert.alert(
        'Error',
        'New password must be at least 8 characters.',
      );
    setLoading(true);
    try {
      const res = await fetch(`${AppConfig.api.baseUrl}/auth/change-password`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
        }),
      });
      const js = await res.json();
      if (!res.ok || !js.success)
        throw new Error(js.message || 'Password change failed');
      Alert.alert('Success', 'Password changed successfully.');
      setShowChange(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      Alert.alert('Error', err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await fetch(`${AppConfig.api.baseUrl}/auth/delete`, {
                method: 'DELETE',
                headers: await authHeaders(),
              });
              const js = await res.json();
              if (!res.ok || !js.success)
                throw new Error(js.message || 'Delete failed');
              await clearToken();
              await clearUser();
              nav.navigate('Splash');
            } catch (e: any) {
              Alert.alert('Error', e.message || String(e));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const initials = fullName
    ? fullName
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'ME';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Back header */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Edit Profile</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Avatar picker */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={pickAvatar}
          activeOpacity={0.8}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to change photo</Text>
      </View>

      {/* Basic info card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BASIC INFORMATION</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={Colors.inputPlaceholder}
          />
          <View style={styles.fieldSep} />
          <Text style={styles.fieldLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="your@email.com"
            placeholderTextColor={Colors.inputPlaceholder}
          />
        </View>
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={onUpdate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Password section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SECURITY</Text>
        <View style={styles.card}>
          {!showChange ? (
            <TouchableOpacity
              style={styles.rowTrigger}
              onPress={() => setShowChange(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.rowTriggerText}>🔒 Change Password</Text>
              <Text style={styles.rowArrow}>›</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={styles.fieldLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={currentPw}
                onChangeText={setCurrentPw}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={Colors.inputPlaceholder}
              />
              <View style={styles.fieldSep} />
              <Text style={styles.fieldLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPw}
                onChangeText={setNewPw}
                secureTextEntry
                placeholder="Min 8 characters"
                placeholderTextColor={Colors.inputPlaceholder}
              />
              <View style={styles.fieldSep} />
              <Text style={styles.fieldLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureTextEntry
                placeholder="Repeat new password"
                placeholderTextColor={Colors.inputPlaceholder}
              />

              <View style={styles.pwButtons}>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { flex: 1, marginRight: Spacing.sm },
                  ]}
                  onPress={submitChangePassword}
                  disabled={loading}
                >
                  <Text style={styles.primaryBtnText}>Update</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.outlineBtn, { flex: 1 }]}
                  onPress={() => {
                    setShowChange(false);
                    setCurrentPw('');
                    setNewPw('');
                    setConfirmPw('');
                  }}
                >
                  <Text style={styles.outlineBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Danger zone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DANGER ZONE</Text>
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.dangerTitle}>Delete Account</Text>
          <Text style={styles.dangerDesc}>
            Permanently removes your account and all associated data. This
            action cannot be reversed.
          </Text>
          <TouchableOpacity
            style={[styles.dangerBtn, loading && styles.btnDisabled]}
            onPress={onDelete}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.dangerBtnText}>Delete My Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 100 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8, // overridden dynamically via insets.top + 8
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
  },
  backBtn: { width: 40 },
  backIcon: { fontSize: 28, color: Colors.primary, lineHeight: 32 },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
    marginBottom: Spacing.base,
  },
  avatarWrap: { position: 'relative' },
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
  avatarInitials: { color: Colors.white, fontSize: 28, fontWeight: '700' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  editBadgeText: { fontSize: 12 },
  avatarHint: {
    marginTop: Spacing.sm,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  section: { paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  fieldSep: {
    height: 1,
    backgroundColor: Colors.inputBorder,
    marginVertical: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },

  primaryBtn: {
    marginTop: Spacing.md,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  outlineBtn: {
    marginTop: Spacing.md,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },

  rowTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  rowTriggerText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  rowArrow: { fontSize: 22, color: Colors.textMuted },

  pwButtons: { flexDirection: 'row', marginTop: Spacing.md },

  dangerCard: { borderWidth: 1.5, borderColor: '#FFCDD2' },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  dangerDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  dangerBtn: {
    paddingVertical: 12,
    backgroundColor: Colors.error,
    borderRadius: 10,
    alignItems: 'center',
  },
  dangerBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
});

export default ProfileDetailsScreen;
