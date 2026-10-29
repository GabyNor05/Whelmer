// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { useNotifications } from '../src/hooks/useNotifications';

SplashScreen.preventAutoHideAsync();

// DEMO: hide the Expo Go notifications warning (push support removed in SDK 53)
LogBox.ignoreLogs(['expo-notifications', 'Expo Notifications', 'Notification permission']);

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useNotifications();

  useEffect(() => {
    if (isLoading) return;

    // Hide splash screen once auth state is resolved
    SplashScreen.hideAsync().catch(() => {});

    // Check current active segment route safely
    const currentSegment = segments[0] as string | undefined;
    const inAuthGroup =
      currentSegment === '(tabs)' ||
      currentSegment === 'settings' ||
      currentSegment === 'onboarding' ||
      currentSegment === 'task';

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
      <Stack.Screen name="task/[id]" />
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