// app/onboarding.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { updateUserProfile, updateUserPreferences } from '../src/services/userService';
import { requestNotificationPermission } from '../src/services/notificationService';
import { User } from '../src/types/user';

type FocusTime = User['peakFocusTime'];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [peakFocusTime, setPeakFocusTime] = useState<FocusTime>('morning');
  const [defaultDuration, setDefaultDuration] = useState<number>(25);
  const [primaryGoal, setPrimaryGoal] = useState<'breakdown' | 'focus' | 'routines'>('breakdown');
  const [isGoalDropdownOpen, setIsGoalDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFinishOnboarding = async () => {
  if (!user?.uid) return;

  setLoading(true);

  try {
    // 1. Graceful notification permission request
    let notificationGranted = false;
    try {
      notificationGranted = await requestNotificationPermission();
    } catch (e) {
      console.warn('Notification permission skipped:', e);
    }

    // 2. Save root selections to Firestore
    await updateUserProfile(user.uid, {
      peakFocusTime,
      defaultFocusDuration: defaultDuration,
      primaryGoal,
    });

    // 3. Save notification preference
    await updateUserPreferences(user.uid, {
      pushNotifications: notificationGranted,
    });

    // 4. Flow directly into Whelmer
    router.replace('/(tabs)');
  } catch (error) {
    console.error('Error completing onboarding:', error);
    router.replace('/(tabs)');
  } finally {
    setLoading(false);
  }
};

  const focusTimeOptions: { label: string; value: FocusTime }[] = [
    { label: 'Morning', value: 'morning' },
    { label: 'Afternoon', value: 'afternoon' },
    { label: 'Evening', value: 'evening' },
    { label: 'Night Owl', value: 'night' },
    { label: 'Random', value: 'random' },
  ];

  const goalLabels = {
    breakdown: 'Task Breakdown',
    focus: 'Deep Focus Sessions',
    routines: 'Habit Routines',
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepIndicator}>STEP 2 OF 2</Text>
      <Text style={styles.title}>Tailor Your Focus</Text>
      <Text style={styles.subtitle}>Help Milo customise your experience.</Text>

      {/* Card 1: Peak Focus Time */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>When do you focus best?</Text>
        <View style={styles.radioGrid}>
          {focusTimeOptions.map((opt) => {
            const isSelected = peakFocusTime === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={styles.radioOption}
                onPress={() => setPeakFocusTime(opt.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={isSelected ? '#3B6B6E' : '#A0A0A0'}
                />
                <Text style={[styles.radioText, isSelected && styles.radioTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Card 2: Default Timer Duration */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Default focus timer length</Text>
        <View style={styles.pillsRow}>
          {[15, 25, 45].map((mins) => {
            const isSelected = defaultDuration === mins;
            return (
              <TouchableOpacity
                key={mins}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => setDefaultDuration(mins)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {mins} mins
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Card 3: Primary Goal Dropdown */}
      <View style={styles.dropdownSection}>
        <Text style={styles.dropdownLabel}>Primary Goal</Text>
        <TouchableOpacity
          style={styles.dropdownCard}
          onPress={() => setIsGoalDropdownOpen(!isGoalDropdownOpen)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownSelectedText}>{goalLabels[primaryGoal]}</Text>
          <Ionicons
            name={isGoalDropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#8DA688"
          />
        </TouchableOpacity>

        {isGoalDropdownOpen && (
          <View style={styles.dropdownMenu}>
            {(['breakdown', 'focus', 'routines'] as const).map((goalKey) => (
              <TouchableOpacity
                key={goalKey}
                style={styles.dropdownMenuItem}
                onPress={() => {
                  setPrimaryGoal(goalKey);
                  setIsGoalDropdownOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownMenuItemText,
                    primaryGoal === goalKey && styles.dropdownMenuItemTextSelected,
                  ]}
                >
                  {goalLabels[goalKey]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Submit Action */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleFinishOnboarding}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#1B3C3E" />
        ) : (
          <Text style={styles.submitBtnText}>Flow into Whelmer</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F5E9',
  },
  container: {
    paddingHorizontal: 24,
  },
  stepIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: '#707070',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#558C8E',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#4A4A4A',
    fontWeight: '500',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#F7FAE8',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E6EBCF',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B5BA94',
    marginBottom: 14,
  },
  radioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
    gap: 8,
    marginVertical: 4,
  },
  radioText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  radioTextSelected: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#D6E2A3',
  },
  pillSelected: {
    backgroundColor: '#C5D688',
    borderWidth: 1,
    borderColor: '#809142',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B4D21',
  },
  pillTextSelected: {
    color: '#1E2C08',
  },
  dropdownSection: {
    marginBottom: 36,
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 8,
  },
  dropdownCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FCF0',
    borderWidth: 1,
    borderColor: '#E2E8CE',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownSelectedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A2A2A',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8CE',
    overflow: 'hidden',
    elevation: 3,
  },
  dropdownMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F5E9',
  },
  dropdownMenuItemText: {
    fontSize: 13,
    color: '#555555',
  },
  dropdownMenuItemTextSelected: {
    fontWeight: '700',
    color: '#558C8E',
  },
  submitBtn: {
    backgroundColor: '#8FD3D8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B3C3E',
  },
});