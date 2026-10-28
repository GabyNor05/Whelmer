import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
  FlatList,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";
import { TRACK_LIST, SoundTrack } from "../../src/services/trackService";
const milo = require('../../assets/milo/Milo-Pleased.png');

export default function FocusScreen() {
  const insets = useSafeAreaInsets();

  // Timer & State Management
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SoundTrack>(TRACK_LIST[0]);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  // Audio player hook from expo-audio
  const player = useAudioPlayer(selectedTrack.source);

  // Animation Refs
  const spinValue = useRef(new Animated.Value(0)).current;
  const tonearmAngle = useRef(new Animated.Value(0)).current;

  // Handle Audio Play / Pause
  useEffect(() => {
    if (!player) return;

    if (isRunning || isPlayingMusic) {
      player.loop = true;
      player.play();
    } else {
      player.pause();
    }
  }, [isRunning, isPlayingMusic, player]);

  // Handle Record & Tonearm Animations
  useEffect(() => {
    let spinAnimation: Animated.CompositeAnimation;

    if (isRunning || isPlayingMusic) {
      spinValue.setValue(0);
      spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      spinAnimation.start();

      Animated.timing(tonearmAngle, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      spinValue.stopAnimation();
      Animated.timing(tonearmAngle, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }

    return () => spinAnimation?.stop();
  }, [isRunning, isPlayingMusic]);

  // Countdown Interval
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      setIsPlayingMusic(false);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  // Track Selector Switch
  const handleSelectTrack = (track: SoundTrack) => {
    setSelectedTrack(track);
    setIsPickerVisible(false);
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const armRotation = tonearmAngle.interpolate({
    inputRange: [0, 1],
    outputRange: ["-25deg", "0deg"],
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.topHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Focus Zone</Text>
        <Text style={styles.headerSubtitle}>
          Deep work with gentle ambient rhythms
        </Text>
      </View>

      <View style={styles.container}>
        {/* Record Player */}
        <View style={styles.turntableCard}>
          <Animated.View
            style={[
              styles.tonearmContainer,
              { transform: [{ rotate: armRotation }] },
            ]}
          >
            <View style={styles.tonearmPivot} />
            <View style={styles.tonearmArm} />
            <View style={styles.tonearmCartridge} />
          </Animated.View>

          <Animated.View
            style={[styles.recordOuter, { transform: [{ rotate: spin }] }]}
          >
            <View style={styles.recordGrooveLine} />
            <View style={styles.recordGrooveLineInner} />
            <View style={styles.recordCenterLabel}>
              
              <Image source={milo} style={styles.recordLabelImage} />
              <Text style={styles.recordLabelText}>Milo's Mix</Text>
            </View>
            <View style={styles.centerSpindlePin} />
          </Animated.View>
        </View>

        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <Text style={styles.timerStatus}>
            {isRunning ? "FOCUS SESSION IN PROGRESS" : "READY TO FOCUS"}
          </Text>
        </View>

        {/* Time Adjusters */}
        <View style={styles.adjustRow}>
          <TouchableOpacity
            style={styles.adjustPill}
            onPress={() => setTimeLeft((t) => Math.max(0, t - 300))}
          >
            <Text style={styles.adjustText}>-5 Min</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adjustPill}
            onPress={() => setTimeLeft((t) => t + 300)}
          >
            <Text style={styles.adjustText}>+5 Min</Text>
          </TouchableOpacity>
        </View>

        {/* Main Controls */}
        <View style={styles.mainControlsRow}>
          <TouchableOpacity
            style={styles.iconBtnSecondary}
            onPress={() => {
              setIsRunning(false);
              setIsPlayingMusic(false);
              setTimeLeft(25 * 60);
            }}
          >
            <Ionicons name="refresh" size={24} color="#3B6B6E" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playPauseBtn}
            onPress={() => {
              setIsRunning(!isRunning);
              setIsPlayingMusic(!isRunning);
            }}
          >
            <Ionicons
              name={isRunning ? "pause" : "play"}
              size={32}
              color="#1B3C3E"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtnSecondary}
            onPress={() => setIsPlayingMusic(!isPlayingMusic)}
          >
            <Ionicons
              name={isPlayingMusic ? "volume-high" : "volume-mute"}
              size={24}
              color={isPlayingMusic ? "#3B6B6E" : "#999999"}
            />
          </TouchableOpacity>
        </View>

        {/* Track Selector Button */}
        <TouchableOpacity
          style={styles.nowPlayingCard}
          onPress={() => setIsPickerVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="musical-notes" size={20} color="#7EC2C6" />
          <View style={styles.nowPlayingTextGroup}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {selectedTrack.title}
            </Text>
            <Text style={styles.artistName}>{selectedTrack.artist}</Text>
          </View>
          <Ionicons name="chevron-up" size={20} color="#3B6B6E" />
        </TouchableOpacity>
      </View>

      {/* Track Selection Sheet Modal */}
      <Modal visible={isPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Ambient Sound</Text>
              <TouchableOpacity onPress={() => setIsPickerVisible(false)}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={TRACK_LIST || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedTrack.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.trackOption,
                      isSelected && styles.trackOptionSelected,
                    ]}
                    onPress={() => handleSelectTrack(item)}
                  >
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isSelected ? "#7EC2C6" : "#999999"}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.trackOptionTitle}>{item.title}</Text>
                      <Text style={styles.trackOptionArtist}>
                        {item.artist}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F5E9" },
  topHeader: {
    backgroundColor: "#7EC2C6",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: "#3B6B6E" },
  headerSubtitle: {
    fontSize: 13,
    color: "#1B3C3E",
    marginTop: 2,
    fontWeight: "500",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  turntableCard: {
    width: 240,
    height: 240,
    backgroundColor: "#FFFFFF",
    borderRadius: 120,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    position: "relative",
    marginTop: 10,
  },
  recordOuter: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "#1E2022",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2C2F33",
  },
  recordGrooveLine: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  recordGrooveLineInner: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  recordCenterLabel: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#D6E2A3",
    alignItems: "center",
    justifyContent: "center",
  },
  recordLabelImage:{
    width: 40,
    height: 40,
    resizeMode: "contain",
    borderRadius: 100,
  },
  recordLabelText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#3B4D21",
    marginTop: 2,
  },
  centerSpindlePin: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  tonearmContainer: {
    position: "absolute",
    top: 15,
    right: 25,
    zIndex: 10,
    alignItems: "center",
  },
  tonearmPivot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#3B6B6E",
  },
  tonearmArm: {
    width: 4,
    height: 65,
    backgroundColor: "#A4C3B2",
    borderRadius: 2,
  },
  tonearmCartridge: {
    width: 10,
    height: 14,
    backgroundColor: "#3B6B6E",
    borderRadius: 2,
  },
  timerContainer: { alignItems: "center" },
  timerText: { fontSize: 52, fontWeight: "800", color: "#1B3C3E" },
  timerStatus: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7EC2C6",
    letterSpacing: 1.5,
  },
  adjustRow: { flexDirection: "row", gap: 16 },
  adjustPill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  adjustText: { fontSize: 13, fontWeight: "700", color: "#3B6B6E" },
  mainControlsRow: { flexDirection: "row", alignItems: "center", gap: 24 },
  iconBtnSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  playPauseBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#7EC2C6",
    alignItems: "center",
    justifyContent: "center",
  },
  nowPlayingCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 18,
    gap: 12,
  },
  nowPlayingTextGroup: { flex: 1 },
  songTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  artistName: { fontSize: 12, color: "#777777", marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  trackOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  trackOptionSelected: { backgroundColor: "#F0F7F7" },
  trackOptionTitle: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  trackOptionArtist: { fontSize: 12, color: "#777777", marginTop: 2 },
});
