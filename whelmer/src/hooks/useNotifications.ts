// src/hooks/useNotifications.ts
// Keeps scheduled reminders in step with the user's tasks and settings, and routes
// notification taps / action buttons to the right screen.
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTasks } from './useTasks';
import {
  ACTIONS,
  dismissNotification,
  getNotificationsModule,
  initNotifications,
  notificationsSupported,
  planReminders,
  syncReminders,
} from '../services/notificationService';

export function useNotifications() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { tasks } = useTasks();
  const enabled = profile?.preferences?.pushNotifications ?? false;

  // 1. Re-plan reminders when tasks, deadlines or preferences change (debounced, and only
  //    when the planned set actually changes)
  const lastSignature = useRef('');
  useEffect(() => {
    if (!notificationsSupported || !user || !profile) return;
    const plan = enabled ? planReminders(profile, tasks) : [];
    const signature = JSON.stringify(plan.map((r) => [r.id, r.date.getTime(), r.title, r.body])) + enabled;
    if (signature === lastSignature.current) return;

    const timer = setTimeout(() => {
      lastSignature.current = signature;
      syncReminders(profile, tasks, enabled).catch((e) => console.log('[notifications] sync failed', e));
    }, 1500);
    return () => clearTimeout(timer);
  }, [user?.uid, profile, tasks, enabled]);

  // 2. Handle taps and action buttons
  useEffect(() => {
    const N = getNotificationsModule();
    if (!N || !user) return;
    initNotifications();

    const handle = (response: import('expo-notifications').NotificationResponse) => {
      const id = response.notification.request.identifier;
      const data = (response.notification.request.content.data ?? {}) as { kind?: string; taskId?: string };
      const action = response.actionIdentifier;

      if (action === ACTIONS.LATER) {
        dismissNotification(id);
        return;
      }
      dismissNotification(id);
      if (data.kind === 'session') {
        router.push('/(tabs)/focus');
      } else if (data.taskId) {
        router.push({ pathname: '/task/[id]', params: { id: data.taskId } });
      } else {
        router.push('/(tabs)/tasks');
      }
    };

    // App opened from a notification while it was closed
    const last = N.getLastNotificationResponse();
    if (last) {
      handle(last);
      N.clearLastNotificationResponse();
    }

    const sub = N.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [user?.uid]);
}
