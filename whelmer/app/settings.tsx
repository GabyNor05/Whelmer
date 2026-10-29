import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/context/AuthContext';
import { useTasks } from '../src/hooks/useTasks';
import {
  deleteUserAccount,
  updateUserPreferences,
  updateUserProfile,
} from '../src/services/userService';
import type { User as UserProfile, UserPreferences } from '../src/types/user';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Old on-device keys from before Firestore sync, cleared when an account is deleted
const LEGACY_STORAGE_KEYS = ['@whelmer_user_data', '@whelmer_app_settings'];

const FOCUS_DURATIONS = [15, 25, 45] as const;
const PEAK_TIMES = ['morning', 'afternoon', 'evening', 'night', 'random'] as const;
const GOALS = ['breakdown', 'focus', 'routines'] as const;
const PEAK_LABELS: Record<UserProfile['peakFocusTime'], string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night Owl',
  random: 'Random',
};
const GOAL_LABELS: Record<UserProfile['primaryGoal'], string> = {
  breakdown: 'Task Breakdown',
  focus: 'Deep Focus Sessions',
  routines: 'Habit Routines',
};

// Help Center Items
const HELP_TIPS = [
  {
    id: '1',
    icon: 'sparkles-outline',
    title: 'Break Down Big Tasks with Milo',
    description:
      'Overwhelmed by a large project? Paste a raw text list or prompt into Milo in the Tasks screen. Milo will break it into bite-sized 5-minute micro-steps.',
  },
  {
    id: '2',
    icon: 'disc-outline',
    title: 'Use Body Doubling & Ambient Sound',
    description:
      'The Focus Zone vinyl player uses ambient rhythms and low-frequency beats to keep your brain stimulated without pulling your attention away.',
  },
  {
    id: '3',
    icon: 'hand-left-outline',
    title: 'Swipe Left to Clear Clutter',
    description:
      'Don’t let old sub-tasks crowd your screen. Swipe left on any task group or sub-step in the Tasks tab to instantly delete it.',
  },
  {
    id: '4',
    icon: 'time-outline',
    title: 'The 5-Minute Rule',
    description:
      'Stuck in task paralysis? Use the Focus Timer to commit to just 5 minutes of work. If you still want to stop after 5 minutes, give yourself permission to rest.',
  },
];

// Privacy Items
const PRIVACY_ITEMS = [
  {
    id: '1',
    icon: 'phone-portrait-outline',
    title: 'Private to Your Account',
    description:
      'Your tasks and preferences sync securely to your own Whelmer account, so they follow you across devices. Only you can read them, and we never sell your data.',
  },
  {
    id: '2',
    icon: 'eye-off-outline',
    title: 'Zero Tracking & Ad Brokers',
    description:
      'Whelmer has no third-party ad trackers, cross-site cookies, or location monitoring. Your focus habits are private to you.',
  },
  {
    id: '3',
    icon: 'cloud-download-outline',
    title: 'Export Your Data',
    description:
      'You own your data. You can generate a full export of your tasks and focus logs in standard JSON format whenever you need.',
  },
  {
    id: '4',
    icon: 'trash-outline',
    title: 'Delete Anytime',
    description:
      'You can permanently delete your account and every task, step and preference linked to it, straight from this screen.',
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: authUser, profile, logout } = useAuth();
  const { tasks } = useTasks();

  // Real account details from Firebase Auth + the Firestore profile
  const user = {
    name: profile?.nickname || authUser?.displayName || 'Whelmer user',
    email: profile?.email || authUser?.email || '',
    avatarUrl: profile?.avatarUrl,
  };

  // Settings toggles live in Firestore at users/{uid}.preferences
  const pushNotifications = profile?.preferences?.pushNotifications ?? true;
  const focusAudioAutoplay = profile?.preferences?.autoPlay ?? false;
  const hapticFeedback = profile?.preferences?.haptics ?? true;

  // Modal Visibility States
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  // Form Fields
  const [editName, setEditName] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const savePreference = (key: keyof UserPreferences, value: boolean) => {
    if (!authUser) return;
    updateUserPreferences(authUser.uid, { [key]: value }).catch(() =>
      Alert.alert('Error', 'Could not save that setting. Check your connection and try again.')
    );
  };

  const handleToggleNotifications = (val: boolean) => savePreference('pushNotifications', val);
  const handleToggleAutoplay = (val: boolean) => savePreference('autoPlay', val);
  const handleToggleHaptics = (val: boolean) => savePreference('haptics', val);

  // Focus profile from onboarding, tap a row to cycle to the next option
  const cycle = <T,>(options: readonly T[], current: T | undefined): T => {
    const i = current === undefined ? -1 : options.indexOf(current);
    return options[(i + 1) % options.length];
  };
  const updateFocusProfile = (updates: Partial<UserProfile>) => {
    if (!authUser) return;
    updateUserProfile(authUser.uid, updates).catch(() =>
      Alert.alert('Error', 'Could not save that change. Check your connection and try again.')
    );
  };

  // Save updated nickname to Firestore
  const handleSaveProfile = async () => {
    const nickname = editName.trim();
    if (!nickname) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    if (!authUser) return;
    try {
      await updateUserProfile(authUser.uid, { nickname });
      setIsEditModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Could not save profile changes.');
    }
  };

  // Export the user's real data as JSON and open the share sheet
  const handleExportData = async () => {
    try {
      const exportPayload = {
        app: 'Whelmer',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        profile,
        tasks,
      };

      const jsonString = JSON.stringify(exportPayload, null, 2);
      const filePath = `${FileSystem.documentDirectory}whelmer_backup.json`;

      await FileSystem.writeAsStringAsync(filePath, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Export Whelmer Backup Data',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Export Ready', `Backup file saved to: ${filePath}`);
      }
    } catch (error) {
      console.error('JSON Export Error:', error);
      Alert.alert('Export Failed', 'Could not generate backup file.');
    }
  };

  // Leave the signed-in screens completely, so nothing from this account stays mounted
  const goToLogin = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/login');
  };

  // Permanently delete account + data (password confirms it's really them)
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Password needed', 'Enter your password to confirm.');
      return;
    }
    setIsDeleting(true);
    try {
      await deleteUserAccount(deletePassword);
      await AsyncStorage.multiRemove(LEGACY_STORAGE_KEYS).catch(() => {});
      setIsDeleteModalVisible(false);
      setIsPrivacyModalVisible(false);
      setDeletePassword('');
      goToLogin();
      Alert.alert('Account deleted', 'Your Whelmer account and all of its data have been removed.');
    } catch (e: any) {
      const code = e?.code ?? '';
      const message =
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'That password is incorrect.'
          : code === 'auth/too-many-requests'
          ? 'Too many attempts. Please wait a moment and try again.'
          : code === 'auth/network-request-failed'
          ? 'No connection. Please check your internet and try again.'
          : 'Something went wrong while deleting your account. Please try again.';
      Alert.alert('Could not delete account', message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Whelmer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            goToLogin();
          } catch (e) {
            Alert.alert('Error', 'Could not log out. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.topHeader, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1B3C3E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={36} color="#3B6B6E" />
            </View>
          )}
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => {
              setEditName(user.name);
              setIsEditModalVisible(true);
            }}
          >
            <Ionicons name="pencil-sharp" size={14} color="#3B4D21" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Focus Profile (from onboarding) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Focus Profile</Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() =>
              updateFocusProfile({
                defaultFocusDuration: cycle(FOCUS_DURATIONS, profile?.defaultFocusDuration as any),
              })
            }
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="timer-outline" size={20} color="#3B6B6E" />
            </View>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Default Focus Length</Text>
              <Text style={styles.settingSubtitle}>Tap to change</Text>
            </View>
            <Text style={styles.settingValue}>{profile?.defaultFocusDuration ?? 25} min</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => updateFocusProfile({ peakFocusTime: cycle(PEAK_TIMES, profile?.peakFocusTime) })}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="sunny-outline" size={20} color="#3B6B6E" />
            </View>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Peak Focus Time</Text>
              <Text style={styles.settingSubtitle}>Milo plans around this</Text>
            </View>
            <Text style={styles.settingValue}>
              {profile?.peakFocusTime ? PEAK_LABELS[profile.peakFocusTime] : '—'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => updateFocusProfile({ primaryGoal: cycle(GOALS, profile?.primaryGoal) })}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="flag-outline" size={20} color="#3B6B6E" />
            </View>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Main Goal</Text>
              <Text style={styles.settingSubtitle}>Shapes how Milo helps you</Text>
            </View>
            <Text style={styles.settingValue}>
              {profile?.primaryGoal ? GOAL_LABELS[profile.primaryGoal] : '—'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="notifications-outline" size={20} color="#3B6B6E" />
            </View>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingSubtitle}>Milo reminders & daily goals</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#E0E0E0', true: '#7EC2C6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="musical-notes-outline" size={20} color="#3B6B6E" />
            </View>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Auto-play Ambient Audio</Text>
              <Text style={styles.settingSubtitle}>Start sound when Focus timer begins</Text>
            </View>
            <Switch
              value={focusAudioAutoplay}
              onValueChange={handleToggleAutoplay}
              trackColor={{ false: '#E0E0E0', true: '#7EC2C6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="hardware-chip-outline" size={20} color="#3B6B6E" />
            </View>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Haptic Feedback</Text>
              <Text style={styles.settingSubtitle}>Vibrate on task completed & timer ticks</Text>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={handleToggleHaptics}
              trackColor={{ false: '#E0E0E0', true: '#7EC2C6' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section: Support & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Security</Text>

          <TouchableOpacity
            style={styles.clickableRow}
            onPress={() => setIsHelpModalVisible(true)}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="help-circle-outline" size={20} color="#3B6B6E" />
            </View>
            <Text style={styles.clickableRowText}>Help Center & Tips</Text>
            <Ionicons name="chevron-forward" size={18} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clickableRow}
            onPress={() => setIsPrivacyModalVisible(true)}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#3B6B6E" />
            </View>
            <Text style={styles.clickableRowText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={18} color="#999999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#E65C5C" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Whelmer v1.0.0 (Beta)</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.textInput, styles.textInputDisabled]}
                value={user.email}
                editable={false}
              />
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveProfile}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Modal Sheet */}
      <Modal visible={isHelpModalVisible} animationType="slide" transparent>
        <View style={styles.sheetModalOverlay}>
          <View style={styles.sheetModalContent}>
            <View style={styles.sheetModalHeader}>
              <View>
                <Text style={styles.sheetModalTitle}>Help & ADHD Tips</Text>
                <Text style={styles.sheetModalSubtitle}>Get the most out of Whelmer</Text>
              </View>
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={() => setIsHelpModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
              {HELP_TIPS.map((item) => (
                <View key={item.id} style={styles.cardItem}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name={item.icon as any} size={20} color="#3B4D21" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDescription}>{item.description}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal Sheet */}
      <Modal visible={isPrivacyModalVisible} animationType="slide" transparent>
        <View style={styles.sheetModalOverlay}>
          <View style={styles.sheetModalContent}>
            <View style={styles.sheetModalHeader}>
              <View>
                <Text style={styles.sheetModalTitle}>Privacy & Security</Text>
                <Text style={styles.sheetModalSubtitle}>Your data ownership & controls</Text>
              </View>
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={() => setIsPrivacyModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
              {PRIVACY_ITEMS.map((item) => (
                <View key={item.id} style={styles.cardItem}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name={item.icon as any} size={20} color="#3B4D21" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDescription}>{item.description}</Text>
                  </View>
                </View>
              ))}

              {/* Data Export & Reset Actions */}
              <View style={styles.privacyActionRow}>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExportData}>
                  <Ionicons name="download-outline" size={16} color="#3B6B6E" />
                  <Text style={styles.exportBtnText}>Export JSON Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.clearDataBtn}
                  onPress={() => {
                    setDeletePassword('');
                    // Close the privacy sheet first so the two modals don't stack
                    setIsPrivacyModalVisible(false);
                    setTimeout(() => setIsDeleteModalVisible(true), 350);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#E65C5C" />
                  <Text style={styles.clearDataText}>Delete My Account</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation */}
      <Modal visible={isDeleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.deleteWarning}>
              This permanently deletes your Whelmer account and all of your tasks, steps and
              preferences. This can't be undone. Enter your password to confirm.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Your password"
                placeholderTextColor="#999999"
                secureTextEntry
                autoCapitalize="none"
                editable={!isDeleting}
              />
            </View>
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsDeleteModalVisible(false)}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, styles.deleteConfirmBtn, isDeleting && { opacity: 0.6 }]}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalSaveText, { color: '#FFFFFF' }]}>Delete Forever</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F5E9' },
  topHeader: {
    backgroundColor: '#7EC2C6',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#3B6B6E' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#7EC2C6',
    marginBottom: 10,
  },
  avatarFallback: { backgroundColor: '#E6F2F2', alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  userEmail: { fontSize: 13, color: '#777777', marginTop: 2 },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D6E2A3',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 14,
  },
  editProfileText: { fontSize: 12, fontWeight: '700', color: '#3B4D21' },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B6B6E',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextGroup: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  settingSubtitle: { fontSize: 11, color: '#888888', marginTop: 2 },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  clickableRowText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E65C5C',
    marginTop: 10,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#E65C5C' },
  versionText: { textAlign: 'center', fontSize: 12, color: '#999999', marginTop: 20 },

  // Edit Profile Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#526E70', marginBottom: 6 },
  textInput: {
    backgroundColor: '#F3F5E9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
  },
  modalActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  modalCancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#777777' },
  modalSaveBtn: {
    backgroundColor: '#7EC2C6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: '#1B3C3E' },
  textInputDisabled: { color: '#777777' },
  deleteWarning: { fontSize: 14, lineHeight: 20, color: '#444444', marginBottom: 14 },
  deleteConfirmBtn: { backgroundColor: '#D64545', minWidth: 130, alignItems: 'center' },
  settingValue: { fontSize: 13, fontWeight: '700', color: '#3B6B6E', marginLeft: 8 },

  // Bottom Sheets
  sheetModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetModalContent: {
    backgroundColor: '#F3F5E9',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '80%',
  },
  sheetModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetModalTitle: { fontSize: 20, fontWeight: '700', color: '#1B3C3E' },
  sheetModalSubtitle: { fontSize: 12, color: '#526E70', marginTop: 2 },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    gap: 12,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#D6E2A3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  cardDescription: { fontSize: 13, color: '#666666', marginTop: 4, lineHeight: 18 },
  privacyActionRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7EC2C6',
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B6B6E',
  },
  clearDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0F0',
    paddingVertical: 12,
    borderRadius: 14,
  },
  clearDataText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65C5C',
  },
});