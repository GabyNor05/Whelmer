// src/utils/haptics.ts
// Small vibration cues, only when the user has Haptic Feedback switched on in Settings.
// Uses React Native's built-in Vibration API, so it works in Expo Go and in the APK.
import { Vibration } from 'react-native';

// A short, happy double-buzz for finishing a task or a focus session
export const celebrate = (enabled: boolean) => {
  if (enabled) Vibration.vibrate([0, 70, 90, 160]);
};
