// src/components/FocusMiniPlayer.tsx
// The Home "Focus Sessions" card. Idle it shows the time and the track that will play; once
// started it becomes a mini player and counts down right here (same session as the Focus Zone).
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatClock, useFocusSession } from '../context/FocusSessionContext';
import TrackPicker from './TrackPicker';

const cosmos = require('../../assets/decor/cosmos.png');

// Card colours from the chosen mockup (E): sage-wash card, soft sage buttons instead of white
const CARD = '#F7FAE8';
const CARD_EDGE = '#E6EBCF';
const SOFT = '#EDF2DA';
const SOFT_EDGE = '#DCE4C2';

export default function FocusMiniPlayer() {
  const router = useRouter();
  const s = useFocusSession();
  const [pickerOpen, setPickerOpen] = useState(false);

  const showPlayer = s.isActive;
  const elapsedMin = Math.floor((s.totalSeconds - s.timeLeft) / 60);
  const progress = s.totalSeconds > 0 ? Math.min(1, (s.totalSeconds - s.timeLeft) / s.totalSeconds) : 0;

  const status = s.isRunning
    ? `FOCUSING · ${elapsedMin} MIN DONE`
    : 'PAUSED · TAP RESUME WHEN READY';

  return (
    <View style={styles.card}>
      {/* Soft watermark flowers */}
      <Image source={cosmos} style={styles.flowerTop} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      <Image source={cosmos} style={styles.flowerBottom} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />

      <TouchableOpacity
        style={styles.chip}
        onPress={() => setPickerOpen(true)}
        accessibilityLabel={`Change track, currently ${s.track.title}`}
      >
        <Ionicons name="musical-notes-outline" size={16} color="#3B6B6E" />
        <Text style={styles.chipMuted}>{showPlayer && s.isRunning && s.soundOn ? 'Now playing' : 'Will play'}</Text>
        <Text style={styles.chipText} numberOfLines={1}>
          {s.track.title}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#526E70" />
      </TouchableOpacity>

      <View style={styles.timerRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={() => s.adjust(-5)} accessibilityLabel="Take off 5 minutes">
          <MaterialCommunityIcons name="rewind-5" size={28} color="#3B6B6E" />
        </TouchableOpacity>
        <Text style={styles.timer} accessibilityLabel={`${Math.ceil(s.timeLeft / 60)} minutes left`}>
          {formatClock(s.timeLeft)}
        </Text>
        <TouchableOpacity style={styles.skipBtn} onPress={() => s.adjust(5)} accessibilityLabel="Add 5 minutes">
          <MaterialCommunityIcons name="fast-forward-5" size={28} color="#3B6B6E" />
        </TouchableOpacity>
      </View>

      {showPlayer ? (
        <>
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.status}>{status}</Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.squareBtn}
              onPress={s.toggleSound}
              accessibilityLabel={s.soundOn ? 'Turn sound off' : 'Turn sound on'}
            >
              <Ionicons name={s.soundOn ? 'volume-high-outline' : 'volume-mute-outline'} size={22} color="#3B6B6E" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={s.toggle}>
              <Ionicons name={s.isRunning ? 'pause' : 'play'} size={18} color="#1B3C3E" />
              <Text style={styles.primaryText}>{s.isRunning ? 'Pause' : 'Resume'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.squareBtn} onPress={s.reset} accessibilityLabel="End session">
              <Ionicons name="stop" size={20} color="#3B6B6E" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/(tabs)/focus')} style={styles.linkBtn}>
            <Text style={styles.linkText}>Open Focus Zone</Text>
            <Ionicons name="chevron-forward" size={14} color="#3B6B6E" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          {s.justFinished ? <Text style={styles.done}>Session complete. Well done! 🌿</Text> : null}
          <TouchableOpacity style={[styles.primaryBtn, styles.fullWidth]} onPress={s.start}>
            <Ionicons name="play" size={18} color="#1B3C3E" />
            <Text style={styles.primaryText}>Start Quick Session</Text>
          </TouchableOpacity>
        </>
      )}

      <TrackPicker
        visible={pickerOpen}
        selectedId={s.track.id}
        onSelect={s.setTrack}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_EDGE,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
    overflow: 'hidden',
    // Lifted card
    shadowColor: '#2C3E35',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  flowerTop: { position: 'absolute', width: 210, height: 210, right: -64, top: -64, opacity: 0.45 },
  flowerBottom: {
    position: 'absolute',
    width: 150,
    height: 150,
    left: -48,
    bottom: -48,
    opacity: 0.45,
    transform: [{ rotate: '20deg' }],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    maxWidth: '100%',
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: SOFT_EDGE,
  },
  chipMuted: { fontSize: 13, fontWeight: '600', color: '#526E70' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#2C3E35', flexShrink: 1 },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  skipBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: SOFT_EDGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: { fontSize: 48, fontWeight: '800', letterSpacing: 1, color: '#1B3C3E', fontVariant: ['tabular-nums'] },
  progressWrap: { width: '100%', gap: 6 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: CARD_EDGE, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#E6A15C' },
  status: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: '#526E70', textAlign: 'center' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  squareBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: SOFT_EDGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#7EC2C6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullWidth: { flex: 0, width: '100%' },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#1B3C3E' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32, paddingHorizontal: 8 },
  linkText: { fontSize: 13, fontWeight: '700', color: '#3B6B6E' },
  done: { fontSize: 14, fontWeight: '600', color: '#2F5D34' },
});
