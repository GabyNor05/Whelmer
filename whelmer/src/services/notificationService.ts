// src/services/notificationService.ts
// Local notifications only (no server push): a "session done" alert, gentle nudges at the
// user's peak focus time, and soft deadline reminders. Each one has action buttons.
//
// Expo Go (SDK 53+) can't load expo-notifications without errors, so everything here is a
// silent no-op in Expo Go and only runs in the installed APK / development build.
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import type { TaskItem } from './taskService';
import type { User as UserProfile } from '../types/user';
import { duePhrase } from '../utils/dates';

type NotificationsModule = typeof import('expo-notifications');

export const notificationsSupported = Platform.OS !== 'web' && !isRunningInExpoGo();

let cached: NotificationsModule | null = null;
const getNotifications = (): NotificationsModule | null => {
  if (!notificationsSupported) return null;
  if (!cached) cached = require('expo-notifications') as NotificationsModule;
  return cached;
};

const CHANNEL_ID = 'gentle-reminders';

// Action button ids (read back in useNotifications when a button is tapped)
export const ACTIONS = {
  START: 'start',
  OPEN: 'open',
  AGAIN: 'again',
  LATER: 'later',
} as const;

export type ReminderKind = 'nudge' | 'deadline' | 'session';

let initialised = false;

export const initNotifications = async (): Promise<void> => {
  const N = getNotifications();
  if (!N || initialised) return;
  initialised = true;

  // Show notifications as banners even while the app is open
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Gentle reminders',
      description: 'Focus session alerts, peak-time nudges and deadline reminders',
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#7EC2C6',
    });
  }

  // Buttons shown on each kind of notification (Android shows up to 3)
  await N.setNotificationCategoryAsync('nudge', [
    { identifier: ACTIONS.START, buttonTitle: "Yes, let's go", options: { opensAppToForeground: true } },
    { identifier: ACTIONS.LATER, buttonTitle: 'Not now', options: { opensAppToForeground: false } },
  ]);
  await N.setNotificationCategoryAsync('deadline', [
    { identifier: ACTIONS.OPEN, buttonTitle: 'Open task', options: { opensAppToForeground: true } },
    { identifier: ACTIONS.LATER, buttonTitle: 'Not now', options: { opensAppToForeground: false } },
  ]);
  await N.setNotificationCategoryAsync('session', [
    { identifier: ACTIONS.AGAIN, buttonTitle: 'Another session', options: { opensAppToForeground: true } },
    { identifier: ACTIONS.LATER, buttonTitle: "I'm done for now", options: { opensAppToForeground: false } },
  ]);
};

// Asks for permission (Android 13+ / iOS show a system prompt). Returns true if allowed.
export const requestNotificationPermission = async (): Promise<boolean> => {
  const N = getNotifications();
  if (!N) return false;
  try {
    await initNotifications();
    const existing = await N.getPermissionsAsync();
    if (existing.granted) return true;
    const requested = await N.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    console.log('[notifications] permission request skipped:', error);
    return false;
  }
};

const hasPermission = async (): Promise<boolean> => {
  const N = getNotifications();
  if (!N) return false;
  try {
    return (await N.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Focus session finished
// ---------------------------------------------------------------------------

export const scheduleSessionDone = async (seconds: number): Promise<string | null> => {
  const N = getNotifications();
  if (!N || seconds < 1 || !(await hasPermission())) return null;
  await initNotifications();
  return N.scheduleNotificationAsync({
    content: {
      title: 'Focus session complete 🎉',
      body: 'Nice work staying with it. Take a short break, you earned it.',
      categoryIdentifier: 'session',
      data: { kind: 'session' },
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.round(seconds),
      channelId: CHANNEL_ID,
    },
  });
};

export const cancelNotification = async (id: string | null | undefined) => {
  const N = getNotifications();
  if (!N || !id) return;
  await N.cancelScheduledNotificationAsync(id).catch(() => {});
};

export const dismissNotification = async (id: string) => {
  const N = getNotifications();
  if (!N) return;
  await N.dismissNotificationAsync(id).catch(() => {});
};

// ---------------------------------------------------------------------------
// Peak-time nudges + deadline reminders (pure planning, easy to test)
// ---------------------------------------------------------------------------

export interface PlannedReminder {
  id: string;
  date: Date;
  title: string;
  body: string;
  category: 'nudge' | 'deadline';
  data: { kind: ReminderKind; taskId?: string };
}

type Peak = UserProfile['peakFocusTime'];

// When each peak-time nudge goes out
export const PEAK_TIMES: Record<Exclude<Peak, 'random'>, { hour: number; minute: number; label: string; emoji: string }> = {
  morning: { hour: 9, minute: 0, label: 'morning', emoji: '☀️' },
  afternoon: { hour: 14, minute: 0, label: 'afternoon', emoji: '🌤️' },
  evening: { hour: 18, minute: 30, label: 'evening', emoji: '🌇' },
  night: { hour: 21, minute: 30, label: 'night owl', emoji: '🌙' },
};

// Deadline reminders never go out at night (night owls still get their own nudge at 21:30)
const QUIET_FROM = 21 * 60 + 30;
const QUIET_UNTIL = 8 * 60;
const MIN_LEAD_MS = 10 * 60 * 1000;

const atTime = (base: Date, hour: number, minute: number, addDays = 0) =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate() + addDays, hour, minute, 0, 0);

// Move a time out of the quiet hours: late evening moves earlier to 21:00, early morning to 08:00
const clampToDaytime = (d: Date) => {
  const mins = d.getHours() * 60 + d.getMinutes();
  if (mins >= QUIET_FROM) return atTime(d, 21, 0);
  if (mins < QUIET_UNTIL) return atTime(d, 8, 0);
  return d;
};

const stepsLine = (task: TaskItem) => {
  const done = task.subSteps.filter((s) => s.completed).length;
  const total = task.subSteps.length;
  if (total === 0) return '';
  if (done === 0) return 'Starting with one small step is plenty.';
  return `You've already done ${done} of ${total} steps.`;
};

// Pick the task a nudge should mention: the one due soonest (still upcoming at that time),
// otherwise the newest task
const pickFocusTask = (pending: TaskItem[], at: Date) =>
  [...pending].sort((a, b) => {
    const ad = a.deadline && a.deadline > at.getTime() ? a.deadline : Infinity;
    const bd = b.deadline && b.deadline > at.getTime() ? b.deadline : Infinity;
    if (ad !== bd) return ad - bd;
    return b.createdAt - a.createdAt;
  })[0];

const sentence = (...parts: string[]) => parts.filter(Boolean).join(' ').trim();
const MIN_GAP_MS = 45 * 60 * 1000;

export function planReminders(
  profile: Pick<UserProfile, 'peakFocusTime' | 'nickname'> | null,
  tasks: TaskItem[],
  now: Date = new Date()
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  const pending = tasks.filter((t) => !t.completed);
  const nickname = profile?.nickname?.trim();

  // 1. Peak focus time nudges for the next 3 days (re-planned every time the app opens)
  const peak = profile?.peakFocusTime;
  if (peak && peak !== 'random') {
    const p = PEAK_TIMES[peak];
    let added = 0;
    for (let day = 0; added < 3 && day < 4; day++) {
      const when = atTime(now, p.hour, p.minute, day);
      if (when.getTime() - now.getTime() < MIN_LEAD_MS) continue;
      const focusTask = pickFocusTask(pending, when);
      out.push({
        id: `nudge-${added}`,
        date: when,
        category: 'nudge',
        title: `It's your ${p.label} focus time${nickname ? `, ${nickname}` : ''} ${p.emoji}`,
        body: focusTask
          ? sentence(`Would you like to spend a few minutes on "${focusTask.parentTitle}"?`, stepsLine(focusTask))
          : 'Is there anything you would like to work on? No pressure at all.',
        data: focusTask ? { kind: 'nudge', taskId: focusTask.id } : { kind: 'nudge' },
      });
      added++;
    }
  } else if (peak === 'random') {
    // One soft check-in, 3 days from now at 11:00. It moves forward each time the app opens,
    // so it only arrives if they haven't been in for a while.
    const when = atTime(now, 11, 0, 3);
    const focusTask = pickFocusTask(pending, when);
    out.push({
      id: 'nudge-0',
      date: when,
      category: 'nudge',
      title: nickname ? `Hey ${nickname} 💛` : 'Hey there 💛',
      body: focusTask
        ? `Feeling up for a little progress on "${focusTask.parentTitle}" today? Totally fine if not.`
        : 'Feeling like working on something today? Totally fine if not.',
      data: focusTask ? { kind: 'nudge', taskId: focusTask.id } : { kind: 'nudge' },
    });
  }

  // 2. Deadline reminders: the day before (at their peak time) and a few hours before
  const peakTime = peak && peak !== 'random' ? PEAK_TIMES[peak] : { hour: 10, minute: 0 };
  for (const task of pending) {
    if (!task.deadline || task.deadline <= now.getTime()) continue;
    const deadline = new Date(task.deadline);
    const candidates: { id: string; date: Date }[] = [];

    const dayBefore = clampToDaytime(atTime(deadline, peakTime.hour, peakTime.minute, -1));
    candidates.push({ id: `deadline-${task.id}-1`, date: dayBefore });

    const fewHoursBefore = clampToDaytime(new Date(deadline.getTime() - 3 * 60 * 60 * 1000));
    candidates.push({ id: `deadline-${task.id}-2`, date: fewHoursBefore });

    const valid = candidates.filter(
      (c) => c.date.getTime() - now.getTime() >= MIN_LEAD_MS && c.date.getTime() < deadline.getTime()
    );
    // If both land within 6 hours of each other, only keep the later one
    if (valid.length === 2 && Math.abs(valid[1].date.getTime() - valid[0].date.getTime()) < 6 * 3600000) {
      valid.shift();
    }

    for (const c of valid) {
      out.push({
        id: c.id,
        date: c.date,
        category: 'deadline',
        title: `Gentle reminder: ${task.parentTitle}`,
        body: sentence(
          `You set this to be done ${duePhrase(task.deadline, c.date)}.`,
          stepsLine(task) || 'One small step is a great start.'
        ),
        data: { kind: 'deadline', taskId: task.id },
      });
    }
  }

  // Space reminders at least 45 minutes apart so they never pile up. When two clash,
  // a deadline reminder wins over a general nudge.
  const spaced: PlannedReminder[] = [];
  for (const r of out.sort((a, b) => a.date.getTime() - b.date.getTime())) {
    const last = spaced[spaced.length - 1];
    if (last && r.date.getTime() - last.date.getTime() < MIN_GAP_MS) {
      if (r.category === 'deadline' && last.category === 'nudge') spaced[spaced.length - 1] = r;
      continue;
    }
    spaced.push(r);
  }

  // Keep well under platform limits (iOS allows 64 scheduled notifications)
  return spaced.slice(0, 40);
}

// Replace all scheduled nudges/deadline reminders with a freshly planned set
export const syncReminders = async (
  profile: UserProfile | null,
  tasks: TaskItem[],
  enabled: boolean
): Promise<void> => {
  const N = getNotifications();
  if (!N) return;
  await initNotifications();

  const scheduled = await N.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((r) => {
    const kind = (r.content.data as { kind?: string } | null)?.kind;
    return kind === 'nudge' || kind === 'deadline';
  });
  await Promise.all(ours.map((r) => N.cancelScheduledNotificationAsync(r.identifier).catch(() => {})));

  if (!enabled || !profile || !(await hasPermission())) return;

  for (const r of planReminders(profile, tasks)) {
    await N.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, categoryIdentifier: r.category, data: r.data },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: CHANNEL_ID },
    }).catch((e) => console.log('[notifications] could not schedule', r.id, e));
  }
};

// Re-exported so screens don't need to import expo-notifications directly
export const getNotificationsModule = getNotifications;
