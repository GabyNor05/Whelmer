import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { EmailAuthProvider, deleteUser, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth, db } from './firebase';
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

// 5. Change password (Firebase needs the current password to confirm it's really them)
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  const current = auth.currentUser;
  if (!current || !current.email) throw new Error('not-signed-in');
  const credential = EmailAuthProvider.credential(current.email, currentPassword);
  await reauthenticateWithCredential(current, credential);
  await updatePassword(current, newPassword);
};

// 6. Permanently delete the signed-in user's data and account.
// Firebase requires a recent login to delete an account, so we re-check the password first.
// Order: verify password -> delete tasks/chats -> delete profile -> delete the auth account.
export const deleteUserAccount = async (password: string): Promise<void> => {
  const current = auth.currentUser;
  if (!current || !current.email) throw new Error('not-signed-in');

  const credential = EmailAuthProvider.credential(current.email, password);
  await reauthenticateWithCredential(current, credential);

  const uid = current.uid;
  for (const sub of ['tasks', 'chats']) {
    const snap = await getDocs(collection(db, 'users', uid, sub));
    // Batches are capped at 500 writes
    for (let i = 0; i < snap.docs.length; i += 450) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  await deleteDoc(doc(db, 'users', uid));
  await deleteUser(current);
};
