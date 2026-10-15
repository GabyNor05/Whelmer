// src/services/notificationService.ts
import { Platform } from 'react-native';

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    let Notifications: any;

    try {
      // Catch native require errors when running inside standard Expo Go
      Notifications = require('expo-notifications');
    } catch (e) {
      console.warn('Expo Notifications module is unavailable in this environment (e.g. Expo Go).');
      return false;
    }

    if (!Notifications || typeof Notifications.getPermissionsAsync !== 'function') {
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7EC2C6',
      });
    }

    return true;
  } catch (error) {
    console.warn('Skipping notification permission request:', error);
    return false;
  }
};