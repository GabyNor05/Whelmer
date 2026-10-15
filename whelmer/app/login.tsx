import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../src/services/firebase';
import { createUserProfile } from '../src/services/userService';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

const handleAuth = async () => {
  const trimmedEmail = email.trim();
  const trimmedName = name.trim();

  if (!trimmedEmail || !password.trim()) {
    Alert.alert('Missing Fields', 'Please enter your email and password.');
    return;
  }

  if (isSignUp && !trimmedName) {
    Alert.alert('Missing Fields', 'Please enter your name.');
    return;
  }

  setLoading(true);

  try {
    if (isSignUp) {
      // 1. Create Auth Account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );

      // 2. Set Display Name
      await updateProfile(userCredential.user, {
        displayName: trimmedName,
      });

      // 3. Create Firestore Document
      await createUserProfile(
        userCredential.user.uid,
        trimmedEmail,
        trimmedName
      );

      // 4. Redirect strictly to Onboarding
      setLoading(false);
      router.replace('/onboarding');
      return;
    } else {
      // Sign in existing user
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      setLoading(false);
      router.replace('/(tabs)');
      return;
    }
  } catch (error: any) {
    setLoading(false);
    let friendlyMessage = error.message;
    if (error.code === 'auth/invalid-credential') {
      friendlyMessage = 'Invalid email or password. Please try again.';
    } else if (error.code === 'auth/email-already-in-use') {
      friendlyMessage = 'This email is already registered. Try signing in.';
    } else if (error.code === 'auth/weak-password') {
      friendlyMessage = 'Password should be at least 6 characters.';
    }
    Alert.alert('Authentication Error', friendlyMessage);
  }
};

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Mascot & Welcome Banner */}
        <View style={styles.brandHeader}>
          <View style={styles.mascotBadge}>
            <Ionicons name="sparkles" size={28} color="#3B4D21" />
          </View>
          <Text style={styles.brandTitle}>Whelmer</Text>
          <Text style={styles.brandSubtitle}>
            {isSignUp
              ? 'Create an account to start overwhelming overwhelm.'
              : 'Welcome back! Let’s stay focused together.'}
          </Text>
        </View>

        {/* Card Form */}
        <View style={styles.formCard}>
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#7EC2C6" />
                <TextInput
                  style={styles.input}
                  placeholder="Your Name"
                  placeholderTextColor="#999999"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#7EC2C6" />
              <TextInput
                style={styles.input}
                placeholder="hello@whelmer.app"
                placeholderTextColor="#999999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#7EC2C6" />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#999999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999999"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Action Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#1B3C3E" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Mode Option */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}
            </Text>
            <Text style={styles.toggleHighlight}>
              {isSignUp ? ' Sign In' : ' Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F3F5E9',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  mascotBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D6E2A3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1B3C3E',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#526E70',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
    lineHeight: 20,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B6B6E',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAF3',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
  },
  primaryBtn: {
    backgroundColor: '#7EC2C6',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B3C3E',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  toggleText: {
    fontSize: 13,
    color: '#777777',
    fontWeight: '500',
  },
  toggleHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B6B6E',
  },
});