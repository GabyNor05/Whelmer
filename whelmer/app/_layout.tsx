import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isLoading } = useAuth();
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Preload splash image
        await Asset.loadAsync(require('../assets/splash-icon.png'));
      } catch (e) {
        console.warn('Asset loading error:', e);
      } finally {
        setAssetsReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (!isLoading && assetsReady) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, assetsReady]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
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