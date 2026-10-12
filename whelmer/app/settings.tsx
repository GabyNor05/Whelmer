import React, { useState } from 'react';
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

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // User State
  const [user, setUser] = useState({
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
  });

  // Settings State
  const [pushNotifications, setPushNotifications] = useState(true);
  const [focusAudioAutoplay, setFocusAudioAutoplay] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  // Edit Profile Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);

  // Save Profile Changes
  const handleSaveProfile = () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    setUser((prev) => ({
      ...prev,
      name: editName.trim(),
      email: editEmail.trim(),
    }));
    setIsEditModalVisible(false);
  };

  // Logout Handler
  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Whelmer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          // Perform auth/session cleanup here
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
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
              onValueChange={setPushNotifications}
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
              onValueChange={setFocusAudioAutoplay}
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
              onValueChange={setHapticFeedback}
              trackColor={{ false: '#E0E0E0', true: '#7EC2C6' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section: Support & Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity
            style={styles.clickableRow}
            onPress={() => Alert.alert('Whelmer Help Center', 'Visit whelmer.app/support for ADHD productivity tips and FAQs.')}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="help-circle-outline" size={20} color="#3B6B6E" />
            </View>
            <Text style={styles.clickableRowText}>Help Center & Tips</Text>
            <Ionicons name="chevron-forward" size={18} color="#999999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clickableRow}
            onPress={() => Alert.alert('Privacy Policy', 'Your data is securely stored locally and never shared with third parties.')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F5E9',
  },
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3B6B6E',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
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
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  userEmail: {
    fontSize: 13,
    color: '#777777',
    marginTop: 2,
  },
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
  editProfileText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B4D21',
  },
  section: {
    marginBottom: 20,
  },
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
  settingTextGroup: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  settingSubtitle: {
    fontSize: 11,
    color: '#888888',
    marginTop: 2,
  },
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
  clickableRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
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
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E65C5C',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999999',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#526E70',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F3F5E9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#777777',
  },
  modalSaveBtn: {
    backgroundColor: '#7EC2C6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B3C3E',
  },
});