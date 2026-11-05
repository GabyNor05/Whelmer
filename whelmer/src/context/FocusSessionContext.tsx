// src/context/FocusSessionContext.tsx
// One focus session for the whole app: the same timer and the same ambient sound are shared
// by the Home mini player and the Focus Zone, so pausing on one pauses the other.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import { useAuth } from './AuthContext';
import { TRACK_LIST, SoundTrack } from '../services/trackService';
import { sessionFinished } from '../utils/haptics';
import { cancelNotification, scheduleSessionDone } from '../services/notificationService';

const LAST_TRACK_KEY = '@whelmer_last_track_id';
const MIN_SECONDS = 60;
const MAX_SECONDS = 180 * 60;

interface FocusSession {
  track: SoundTrack;
  timeLeft: number; // seconds
  totalSeconds: number; // length of the current session, for the progress bar
  isRunning: boolean;
  isActive: boolean; // started and not finished or reset (running or paused)
  justFinished: boolean;
  soundOn: boolean;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  adjust: (minutes: number) => void;
  setTrack: (track: SoundTrack) => void;
  toggleSound: () => void;
}

const FocusSessionContext = createContext<FocusSession | null>(null);

export const FocusSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const defaultSeconds = (profile?.defaultFocusDuration ?? 25) * 60;
  const autoPlay = profile?.preferences?.autoPlay ?? true;
  const hapticsOn = profile?.preferences?.haptics ?? true;
  const notifyOn = profile?.preferences?.pushNotifications ?? false;

  const [track, setTrackState] = useState<SoundTrack>(TRACK_LIST[0]);
  const [timeLeft, setTimeLeft] = useState(defaultSeconds);
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [soundOn, setSoundOn] = useState(autoPlay);
  const adjustedWhileIdle = useRef(false);
  const endAt = useRef<number | null>(null);
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  const player = useAudioPlayer(track.source);

  // Remember the last track the user picked
  useEffect(() => {
    AsyncStorage.getItem(LAST_TRACK_KEY)
      .then((id) => {
        const saved = TRACK_LIST.find((t) => t.id === id);
        if (saved) setTrackState(saved);
      })
      .catch(() => {});
  }, []);

  // Follow the default focus length (onboarding/Settings) while no session is going
  useEffect(() => {
    if (!isActive && !adjustedWhileIdle.current) {
      setTimeLeft(defaultSeconds);
      setTotalSeconds(defaultSeconds);
    }
  }, [defaultSeconds, isActive]);

  // Follow the autoplay setting between sessions
  useEffect(() => {
    if (!isActive) setSoundOn(autoPlay);
  }, [autoPlay, isActive]);

  // Sound plays only while the timer runs and sound is on
  useEffect(() => {
    if (!player) return;
    try {
      if (isRunning && soundOn) {
        player.loop = true;
        player.play();
      } else {
        player.pause();
      }
    } catch {}
  }, [isRunning, soundOn, player]);

  // Countdown from a fixed end time, so it stays right even if the phone sleeps
  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      if (!endAt.current) return;
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) {
        // If the session ended while the app was in the background, the notification already
        // told them; don't buzz late when they come back
        const overdueMs = Date.now() - endAt.current;
        endAt.current = null;
        setIsRunning(false);
        setIsActive(false);
        setJustFinished(true);
        adjustedWhileIdle.current = false;
        if (overdueMs < 5000) sessionFinished(hapticsOn);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [isRunning, hapticsOn]);

  // "Session complete" notification for when the phone is locked or the app is in the background
  const [planVersion, setPlanVersion] = useState(0);
  useEffect(() => {
    if (!isRunning || !notifyOn || !endAt.current) return;
    let id: string | null = null;
    let cancelled = false;
    scheduleSessionDone((endAt.current - Date.now()) / 1000).then((scheduled) => {
      if (cancelled) cancelNotification(scheduled);
      else id = scheduled;
    });
    return () => {
      cancelled = true;
      cancelNotification(id);
    };
  }, [isRunning, notifyOn, planVersion]);

  const start = useCallback(() => {
    // A finished session starts again from the default length
    const seconds = timeLeftRef.current > 0 ? timeLeftRef.current : defaultSeconds;
    endAt.current = Date.now() + seconds * 1000;
    setJustFinished(false);
    setTimeLeft(seconds);
    if (!isActive) {
      setTotalSeconds(seconds);
      setSoundOn(autoPlay);
    }
    setIsActive(true);
    setIsRunning(true);
    setPlanVersion((v) => v + 1);
  }, [defaultSeconds, isActive, autoPlay]);

  const pause = useCallback(() => {
    if (endAt.current) setTimeLeft(Math.max(0, Math.round((endAt.current - Date.now()) / 1000)));
    endAt.current = null;
    setIsRunning(false);
  }, []);

  // Stop everything when the user signs out
  useEffect(() => {
    if (!user) {
      endAt.current = null;
      setIsRunning(false);
      setIsActive(false);
      setJustFinished(false);
    }
  }, [user]);

  const toggle = useCallback(() => (isRunning ? pause() : start()), [isRunning, pause, start]);

  const reset = useCallback(() => {
    endAt.current = null;
    setIsRunning(false);
    setIsActive(false);
    setJustFinished(false);
    adjustedWhileIdle.current = false;
    setTimeLeft(defaultSeconds);
    setTotalSeconds(defaultSeconds);
  }, [defaultSeconds]);

  const adjust = useCallback(
    (minutes: number) => {
      const live = endAt.current ? Math.max(0, Math.round((endAt.current - Date.now()) / 1000)) : timeLeftRef.current;
      const base = live > 0 ? live : defaultSeconds;
      const next = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, base + minutes * 60));
      if (endAt.current) endAt.current = Date.now() + next * 1000;
      setJustFinished(false);
      setTimeLeft(next);
      setTotalSeconds((total) => (isActive ? Math.max(next, total + (next - base)) : next));
      if (!isActive) adjustedWhileIdle.current = true;
      setPlanVersion((v) => v + 1);
    },
    [defaultSeconds, isActive]
  );

  const setTrack = useCallback((next: SoundTrack) => {
    setTrackState(next);
    AsyncStorage.setItem(LAST_TRACK_KEY, next.id).catch(() => {});
  }, []);

  const toggleSound = useCallback(() => setSoundOn((on) => !on), []);

  const value = useMemo(
    () => ({
      track,
      timeLeft,
      totalSeconds,
      isRunning,
      isActive,
      justFinished,
      soundOn,
      start,
      pause,
      toggle,
      reset,
      adjust,
      setTrack,
      toggleSound,
    }),
    [track, timeLeft, totalSeconds, isRunning, isActive, justFinished, soundOn, start, pause, toggle, reset, adjust, setTrack, toggleSound]
  );

  return <FocusSessionContext.Provider value={value}>{children}</FocusSessionContext.Provider>;
};

export const useFocusSession = () => {
  const ctx = useContext(FocusSessionContext);
  if (!ctx) throw new Error('useFocusSession must be used inside FocusSessionProvider');
  return ctx;
};

export const formatClock = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
