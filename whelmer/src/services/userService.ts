import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, UserPreferences } from '../types/user';

// 1. Initial User Creation on Sign Up
export const createUserProfile = async (
  uid: string,
  email: string,
  nickname: string
): Promise<User> => {
  const newUser: User = {
    uid,
    email,
    nickname,
    avatarUrl: `https://i.pravatar.cc/150?u=${uid}`,
    peakFocusTime: 'morning',
    defaultFocusDuration: 25,
    primaryGoal: 'focus',
    preferences: {
      pushNotifications: true,
      autoPlay: false,
      haptics: true,
    },
  };

  await setDoc(doc(db, 'users', uid), newUser);
  return newUser;
};

// 2. Fetch User Profile
export const getUserProfile = async (uid: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() ? (userDoc.data() as User) : null;
};

// 3. Update Root User Profile Fields (e.g. Onboarding selections like peakFocusTime, defaultFocusDuration, primaryGoal)
export const updateUserProfile = async (
  uid: string,
  updates: Partial<Omit<User, 'uid' | 'email' | 'preferences'>>
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, updates);
};

// 4. Update Nested Preferences Object (e.g. Settings switches like pushNotifications, autoPlay, haptics)
export const updateUserPreferences = async (
  uid: string,
  preferences: Partial<UserPreferences>
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  const updates: Record<string, any> = {};
  Object.keys(preferences).forEach((key) => {
    updates[`preferences.${key}`] = (preferences as any)[key];
  });

  await updateDoc(userRef, updates);
};