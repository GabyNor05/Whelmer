declare module 'firebase/auth/react-native' {
  import { Persistence } from 'firebase/auth';
  import { ReactNativeAsyncStorage } from '@react-native-async-storage/async-storage';
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage | any): Persistence;
}