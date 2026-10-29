import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import type { TaskItem } from '../../src/services/taskService';
import { useTasks } from '../../src/hooks/useTasks';
import { countSteps, tasksBannerMessage } from '../../src/utils/encouragement';
import { relativeDay } from '../../src/utils/dates';
const milo = require('../../assets/milo/Milo-Excited.png');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Render the red delete button revealed on left swipe
const renderRightActions = (
  progress: Animated.AnimatedInterpolation<number>,
  dragX: Animated.AnimatedInterpolation<number>,
  onDelete: () => void
) => {
  const scale = dragX.interpolate({
    inputRange: [-80, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity style={styles.deleteActionContainer} onPress={onDelete} activeOpacity={0.8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tasks, createTask, saveMiloResponse, deleteTask } = useTasks();
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Unfinished tasks first (newest at the top), finished ones below
  const sorted = useMemo(
    () => [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt),
    [tasks]
  );
  const banner = tasksBannerMessage(tasks);
  const doneTasks = tasks.filter((t) => t.completed).length;
  const tasksPercent = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

  const openTask = (id: string) => router.push({ pathname: '/task/[id]', params: { id } });

  const deleteTaskGroup = useCallback(
    (taskId: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      deleteTask(taskId);
    },
    [deleteTask]
  );

  const handleAddNewTask = () => {
    const input = newTaskTitle.trim();
    if (!input) return;
    const created = saveMiloResponse(input) ?? createTask(input, ['Start working on task']);
    setNewTaskTitle('');
    // Open it straight away so they can shape the steps and add a deadline
    if (created) openTask(created.id);
  };

  const renderTask = ({ item }: { item: TaskItem }) => {
    const { done, total } = countSteps(item);
    const percent = total ? Math.round((done / total) * 100) : 0;
    const deadlinePassed = !!item.deadline && item.deadline < Date.now();

    return (
      <View style={styles.cardWrapper}>
        <Swipeable
          renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, () => deleteTaskGroup(item.id))}
          friction={2}
          overshootRight={false}
        >
          <TouchableOpacity
            style={[styles.card, item.completed && styles.cardDone]}
            onPress={() => openTask(item.id)}
            activeOpacity={0.85}
            accessibilityHint="Opens this task"
          >
            <View style={[styles.accentBar, item.completed && { backgroundColor: '#7BAE7F' }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, item.completed && styles.cardTitleDone]} numberOfLines={2}>
                {item.parentTitle}
              </Text>

              <View style={styles.metaRow}>
                {item.completed ? (
                  <Text style={styles.doneBadge}>Done 🎉</Text>
                ) : (
                  <Text style={styles.metaText}>
                    {done} of {total} steps
                  </Text>
                )}
                {item.deadline && !item.completed ? (
                  <View style={[styles.deadlineChip, deadlinePassed && styles.deadlineChipPast]}>
                    <Ionicons name="calendar-outline" size={12} color={deadlinePassed ? '#8A6D3B' : '#3B6B6E'} />
                    <Text style={[styles.deadlineText, deadlinePassed && { color: '#8A6D3B' }]}>
                      {deadlinePassed ? 'Date passed' : `Due ${relativeDay(item.deadline)}`}
                    </Text>
                  </View>
                ) : null}
              </View>

              {!item.completed && total > 0 ? (
                <View style={styles.miniTrack}>
                  <View style={[styles.miniFill, { width: `${percent}%` }]} />
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#526E70" />
          </TouchableOpacity>
        </Swipeable>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.screen}>
        {/* Header */}
        <View style={[styles.topHeader, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Your Tasks</Text>
              <Text style={styles.headerSubtitle}>Tap a task to open it · swipe left to delete</Text>
            </View>
            <TouchableOpacity style={styles.aiBreakdownBtn} onPress={() => router.push('/(tabs)/milo')}>
              <Image source={milo} style={{ height: 15, width: 11, borderRadius: 100 }} />
              <Text style={styles.aiBreakdownText}>Ask Milo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
          {/* Encouraging progress banner */}
          <View style={styles.banner}>
            <Text style={styles.bannerHeadline}>{banner.headline}</Text>
            <Text style={styles.bannerSub}>{banner.sub}</Text>
            {tasks.length > 0 ? (
              <>
                <View style={styles.bannerTrack}>
                  <View style={[styles.bannerFill, { width: `${tasksPercent}%` }]} />
                </View>
                <Text style={styles.bannerCount}>
                  {doneTasks} of {tasks.length} tasks finished
                </Text>
              </>
            ) : null}
          </View>

          {/* Quick Add */}
          <View style={styles.addInputRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Add new task or paste Milo breakdown..."
              placeholderTextColor="#999999"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              onSubmitEditing={handleAddNewTask}
            />
            <TouchableOpacity
              style={[styles.addButton, !newTaskTitle.trim() && styles.addButtonDisabled]}
              onPress={handleAddNewTask}
              disabled={!newTaskTitle.trim()}
              accessibilityLabel="Add task"
            >
              <Ionicons name="add" size={22} color="#1B3C3E" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={sorted}
            keyExtractor={(item) => item.id}
            renderItem={renderTask}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F5E9' },
  topHeader: {
    backgroundColor: '#7EC2C6',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#3B6B6E' },
  headerSubtitle: { fontSize: 13, color: '#1B3C3E', marginTop: 2, fontWeight: '500' },
  aiBreakdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D6E2A3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  aiBreakdownText: { fontSize: 12, fontWeight: '700', color: '#3B4D21' },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

  banner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D6E2A3',
  },
  bannerHeadline: { fontSize: 16, fontWeight: '700', color: '#2F4F3A' },
  bannerSub: { fontSize: 13, lineHeight: 19, color: '#556660', marginTop: 4 },
  bannerTrack: { height: 8, borderRadius: 4, backgroundColor: '#E8EDE3', marginTop: 12, overflow: 'hidden' },
  bannerFill: { height: '100%', borderRadius: 4, backgroundColor: '#7BAE7F' },
  bannerCount: { fontSize: 12, fontWeight: '600', color: '#3B6B6E', marginTop: 6 },

  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 10,
  },
  addInput: { flex: 1, height: 40, fontSize: 14, color: '#1A1A1A' },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7EC2C6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.4 },

  cardWrapper: { marginBottom: 12, borderRadius: 18, overflow: 'hidden' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardDone: { backgroundColor: '#F6F9F2' },
  accentBar: { width: 5, alignSelf: 'stretch', backgroundColor: '#7EC2C6', borderRadius: 3 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  cardTitleDone: { color: '#5F6B66' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  metaText: { fontSize: 12, color: '#6B7671', fontWeight: '500' },
  doneBadge: { fontSize: 12, fontWeight: '700', color: '#2F5D34' },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  deadlineChipPast: { backgroundColor: '#F6EEDD' },
  deadlineText: { fontSize: 12, fontWeight: '600', color: '#3B6B6E' },
  miniTrack: { height: 6, borderRadius: 3, backgroundColor: '#E8EDE3', marginTop: 10, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 3, backgroundColor: '#7BAE7F' },

  deleteActionContainer: {
    backgroundColor: '#E65C5C',
    justifyContent: 'center',
    alignItems: 'center',
    width: 75,
    borderRadius: 18,
    marginLeft: 8,
  },
});
