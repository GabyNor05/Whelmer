// app/index.tsx
// Start screen: send people straight to the right place.
// (This used to render nothing, so a fresh install with nobody logged in showed a blank screen.)
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null; // splash screen is still showing
  return <Redirect href={user ? '/(tabs)' : '/login'} />;
}
