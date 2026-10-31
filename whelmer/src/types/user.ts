export interface UserPreferences {
  pushNotifications: boolean;
  autoPlay: boolean;
  haptics: boolean;
}

export interface User {
  uid: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
  peakFocusTime: 'morning' | 'afternoon' | 'evening' | 'night' | 'random';
  defaultFocusDuration: number; // In minutes (e.g., 15, 25, 45)
  primaryGoal: 'breakdown' | 'focus' | 'routines';
  preferences: UserPreferences;
  // When the user accepted the "Milo can be wrong / not medical advice" notice (ms since epoch)
  aiDisclaimerAcceptedAt?: number;
}