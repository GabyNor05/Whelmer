// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Hide splash screen once auth state is resolved
    SplashScreen.hideAsync().catch(() => {});

    // Check current active segment route safely
    const currentSegment = segments[0] as string | undefined;
    const inAuthGroup = currentSegment === '(tabs)';

    if (!user && inAuthGroup) {
      // User is logged out but on protected main tabs -> redirect to login
      router.replace('/login');
    } else if (user && (currentSegment === 'login' || !currentSegment)) {
      // User is logged in and sitting on login or index root -> redirect to main app
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}