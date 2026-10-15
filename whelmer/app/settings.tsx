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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestNotificationPermission } from '../src/services/notificationService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Keys for persistence
const STORAGE_KEYS = {
  USER: '@whelmer_user_data',
  SETTINGS: '@whelmer_app_settings',
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
    title: 'Local Storage First',
    description:
      'Your tasks, sub-tasks, and focus stats stay saved directly on your device. We do not sell or store your personal productivity data on central servers.',
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
    title: 'Data Control & Reset',
    description:
      'Logging out or clearing app storage instantly purges all cached preferences from your device.',
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // User State
  const [user, setUser] = useState({
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
  });

  // Settings Toggles
  const [pushNotifications, setPushNotifications] = useState(true);
  const [focusAudioAutoplay, setFocusAudioAutoplay] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  // Modal Visibility States
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);

  // Edit Form Fields
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // 1. Load Saved Preferences & User Profile on Mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }

      const savedSettings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setPushNotifications(parsed.pushNotifications ?? true);
        setFocusAudioAutoplay(parsed.focusAudioAutoplay ?? false);
        setHapticFeedback(parsed.hapticFeedback ?? true);
      }
    } catch (e) {
      console.error('Failed to load settings from storage:', e);
    }
  };

  // 2. Persist Settings Changes Automatically
  const saveSettingToggle = async (key: string, value: boolean) => {
    try {
      const current = {
        pushNotifications,
        focusAudioAutoplay,
        hapticFeedback,
        [key]: value,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(current));
    } catch (e) {
      console.error('Failed to save setting:', e);
    }
  };

  const handleToggleNotifications = (val: boolean) => {
    setPushNotifications(val);
    saveSettingToggle('pushNotifications', val);
  };

  const handleToggleAutoplay = (val: boolean) => {
    setFocusAudioAutoplay(val);
    saveSettingToggle('focusAudioAutoplay', val);
  };

  const handleToggleHaptics = (val: boolean) => {
    setHapticFeedback(val);
    saveSettingToggle('hapticFeedback', val);
  };

  // 3. Save Updated Profile to Storage
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    const updatedUser = {
      ...user,
      name: editName.trim(),
      email: editEmail.trim(),
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Could not save profile changes.');
    }
  };

  // 4. Export JSON Data (Write JSON file & Trigger Native Share)
  const handleExportData = async () => {
    try {
      // Gather current app state / storage payload
      const exportPayload = {
        app: 'Whelmer',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        user,
        settings: {
          pushNotifications,
          focusAudioAutoplay,
          hapticFeedback,
        },
      };

      const jsonString = JSON.stringify(exportPayload, null, 2);
      const filePath = `${FileSystem.documentDirectory}whelmer_backup.json`;

      // Write file to device storage
      await FileSystem.writeAsStringAsync(filePath, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Check if sharing is available
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

  // 5. Reset Storage Data
  const handleClearData = () => {
    Alert.alert(
      'Clear All Local Data?',
      'This will erase all local tasks, preferences, and cached profile data from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.SETTINGS]);
              setUser({
                name: 'Alex Johnson',
                email: 'alex.johnson@example.com',
                avatarUrl: 'https://i.pravatar.cc/150?img=12',
              });
              setPushNotifications(true);
              setFocusAudioAutoplay(false);
              setHapticFeedback(true);
              setIsPrivacyModalVisible(false);
              Alert.alert('Reset Complete', 'Local application storage has been cleared.');
            } catch (e) {
              Alert.alert('Error', 'Failed to clear local data.');
            }
          },
        },
      ]
    );
  };

  // Logout Handler
  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Whelmer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => router.replace('/login'),
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
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => {
              setEditName(user.name);
              setEditEmail(user.email);
              setIsEditModalVisible(true);
            }}
          >
            <Ionicons name="pencil-sharp" size={14} color="#3B4D21" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
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
                style={styles.textInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999999"
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

                <TouchableOpacity style={styles.clearDataBtn} onPress={handleClearData}>
                  <Ionicons name="trash-outline" size={16} color="#E65C5C" />
                  <Text style={styles.clearDataText}>Reset App Storage</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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