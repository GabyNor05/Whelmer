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
}