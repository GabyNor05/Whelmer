import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/Colors';
import { globalTasks, TaskItem } from '../../src/services/taskService';


export default function HomeScreen() {

  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Task & Timer State
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [selectedTrack, setSelectedTrack] = useState('Lofi Track 1');

  useFocusEffect(
    useCallback(() => {
      setTasks([...globalTasks]);
    }, [])
  );

  const pendingTasks = tasks.filter((t) => !t.completed);

  const toggleTask = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    const target = globalTasks.find((t) => t.id === id);
    if (target) target.completed = !target.completed;
  };

  const adjustTimer = (delta: number) => {
    setTimerMinutes((prev) => Math.max(5, Math.min(60, prev + delta)));
  };

  return (
    <View style={styles.screen}>
      {/* 1. Curved Teal Top Header */}
      <View style={[styles.topHeader, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText}>Welcome, Liya</Text>
          <TouchableOpacity
        onPress={() => router.push('/settings')}
        activeOpacity={0.8}
      >
        {/* TODO: Avatar 
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        */}
        <Ionicons name="person" size={24} color={Colors.textMuted || '#A0A0A0'} />
      </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Milo Check-In Card */}
        <View style={styles.checkInCard}>
          <View style={styles.mascotSquare}>
            <Ionicons name="sparkles" size={32} color="#B0B0B0" />
          </View>
          <View style={styles.checkInRight}>
            <Text style={styles.checkInQuote}>
              “Feeling stuck today? Let's check in.”
            </Text>
            <TouchableOpacity
              style={styles.talkBtn}
              onPress={() => router.push('/(tabs)/milo')}
            >
              <Text style={styles.talkBtnText}>Talk to Milo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Focus Sessions Widget */}
        <Text style={styles.sectionTitle}>Focus Sessions</Text>
        <View style={styles.focusCard}>
          <Text style={styles.timerDisplay}>{timerMinutes} : 00</Text>

          <View style={styles.trackRow}>
            <Text style={styles.trackLabel}>Will play...</Text>
            <View style={styles.trackBadge}>
              <View style={styles.trackDot} />
              <Text style={styles.trackText}>{selectedTrack}</Text>
            </View>
          </View>

          <View style={styles.timerControlsRow}>
            <TouchableOpacity
              style={styles.timeAdjBtn}
              onPress={() => adjustTimer(-5)}
            >
              <Text style={styles.timeAdjText}>- 5 mins</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.startSessionBtn}
              onPress={() => router.push('/(tabs)/focus')}
            >
              <Text style={styles.startSessionText}>Start Quick Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeAdjBtn}
              onPress={() => adjustTimer(5)}
            >
              <Text style={styles.timeAdjText}>+ 5 mins</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Your Tasks Section */}
        <View style={styles.tasksHeaderRow}>
          <Text style={styles.sectionTitle}>Your Tasks</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {pendingTasks.length === 0 ? (
          <View style={styles.emptyTaskCard}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#7BAE7F" />
            <Text style={styles.emptyTaskText}>No active tasks right now!</Text>
          </View>
        ) : (
          pendingTasks.map((item, index) => (
            <View key={item.id} style={styles.taskCard}>
              <View style={styles.taskLeftAccent} />
              <View style={styles.taskMainContent}>
                <View style={styles.taskHeaderRow}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {item.parentTitle}
                  </Text>
                  <Text style={styles.taskTime}>15:00</Text>
                  <Text style={styles.taskStepsCount}>
                    {index + 1}/4 steps
                  </Text>
                </View>
                <View style={styles.taskSubRow}>
                  <Text style={styles.taskDescription} numberOfLines={2}>
                    Break down and complete key micro-steps for this session.
                  </Text>
                  <TouchableOpacity
                    style={styles.checkCircle}
                    onPress={() => toggleTask(item.id)}
                  >
                    <Ionicons
                      name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={item.completed ? '#7BAE7F' : '#A4C3B2'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F5E9', // Warm off-white background matching design
  },
  topHeader: {
    backgroundColor: '#7EC2C6', // Curved teal banner header
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#3B6B6E',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#7EC2C6',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  /* Milo Check-In Card */
  checkInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  mascotSquare: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkInRight: {
    flex: 1,
  },
  checkInQuote: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D312E',
    marginBottom: 8,
  },
  talkBtn: {
    backgroundColor: '#D6E2A3', // Soft green button fill
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  talkBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B4D21',
  },
  /* Focus Sessions Section */
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222523',
    marginBottom: 12,
  },
  focusCard: {
    backgroundColor: '#F8FDEB', // Subtle yellow/green tint
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2EECA',
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 2,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 18,
    gap: 6,
  },
  trackLabel: {
    fontSize: 13,
    color: '#666666',
  },
  trackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6C839B',
  },
  trackText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7EC2C6',
  },
  timerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  timeAdjBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7EC2C6',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  timeAdjText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B6B6E',
  },
  startSessionBtn: {
    flex: 1,
    backgroundColor: '#7EC2C6',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  startSessionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B3C3E',
  },
  /* Your Tasks Section */
  tasksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7EC2C6',
  },
  emptyTaskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyTaskText: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '500',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  taskLeftAccent: {
    width: 6,
    backgroundColor: '#7EC2C6',
  },
  taskMainContent: {
    flex: 1,
    padding: 12,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  taskTime: {
    fontSize: 12,
    color: '#999999',
    marginRight: 10,
  },
  taskStepsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#526E70',
  },
  taskSubRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  taskDescription: {
    fontSize: 12,
    color: '#777777',
    flex: 1,
    paddingRight: 10,
    lineHeight: 16,
  },
  checkCircle: {
    paddingLeft: 4,
  },
});