// src/utils/haptics.ts
// Vibration cues, only when the user has Haptic Feedback switched on in Settings.
// Uses React Native's built-in Vibration API, so it works in Expo Go and in the APK.
// Durations are long enough to feel on phones that ignore very short pulses.
import { Vibration } from 'react-native';

// A happy double buzz for finishing a task
export const celebrate = (enabled: boolean) => {
  if (enabled) Vibration.vibrate([0, 180, 120, 280]);
};

// "Your time is up": five firm buzzes, like an alarm finishing, then it stops
export const sessionFinished = (enabled: boolean) => {
  if (enabled) Vibration.vibrate([0, 450, 220, 450, 220, 450, 220, 450, 220, 700]);
};

// A single short buzz, used to confirm that haptics were switched on
export const confirmBuzz = () => Vibration.vibrate(200);
