// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { User as UserProfile } from '../types/user';

interface AuthContextType {
  user: User | null;
  // Live Firestore profile at users/{uid} (nickname, onboarding choices, preferences)
  profile: UserProfile | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // Keep the profile in sync, so onboarding and Settings changes show up everywhere at once
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => setProfile(snap.exists() ? (snap.data() as UserProfile) : null),
      (err) => {
        // Expected for a moment while signing out; anything else is worth knowing about
        if (auth.currentUser) console.log('[AuthContext] profile listener error:', err.code);
      }
    );
    return unsubscribe;
  }, [user?.uid]);

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
