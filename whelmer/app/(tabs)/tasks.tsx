import React, { useState, useCallback, memo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { globalTasks, TaskItem, parseAndSaveMiloTasks } from '../../src/services/taskService';

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

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useFocusEffect(
    useCallback(() => {
      setTasks([...globalTasks]);
      if (globalTasks.length > 0 && !expandedTaskId) {
        setExpandedTaskId(globalTasks[0].id);
      }
    }, [])
  );

  // Delete parent task group
  const deleteTaskGroup = useCallback((taskId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const globalIdx = globalTasks.findIndex((t) => t.id === taskId);
    if (globalIdx !== -1) globalTasks.splice(globalIdx, 1);
  }, []);

  // Delete individual sub-step
  const deleteSubStep = useCallback((taskId: string, stepId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSubSteps = t.subSteps.filter((s) => s.id !== stepId);
          return { ...t, subSteps: updatedSubSteps };
        }
        return t;
      })
    );

    const targetGroup = globalTasks.find((t) => t.id === taskId);
    if (targetGroup) {
      targetGroup.subSteps = targetGroup.subSteps.filter((s) => s.id !== stepId);
    }
  }, []);

  const toggleSubStep = useCallback((taskId: string, stepId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated = t.subSteps.map((s) =>
            s.id === stepId ? { ...s, completed: !s.completed } : s
          );
          return { ...t, subSteps: updated, completed: updated.every((s) => s.completed) };
        }
        return t;
      })
    );

    const targetGroup = globalTasks.find((t) => t.id === taskId);
    if (targetGroup) {
      const step = targetGroup.subSteps.find((s) => s.id === stepId);
      if (step) step.completed = !step.completed;
      targetGroup.completed = targetGroup.subSteps.every((s) => s.completed);
    }
  }, []);

  const toggleExpand = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTaskId((prev) => (prev === id ? null : id));
  }, []);

  const handleAddNewTask = () => {
    const input = newTaskTitle.trim();
    if (!input) return;

    const parsedGroups = parseAndSaveMiloTasks(input);
    if (parsedGroups.length > 0) {
      setTasks([...globalTasks]);
      setExpandedTaskId(parsedGroups[0].id);
    } else {
      const newTask: TaskItem = {
        id: `${Date.now()}`,
        parentTitle: input,
        completed: false,
        createdAt: Date.now(),
        subSteps: [{ id: `${Date.now()}-1`, title: 'Start working on task', completed: false }],
      };
      globalTasks.unshift(newTask);
      setTasks([...globalTasks]);
      setExpandedTaskId(newTask.id);
    }
    setNewTaskTitle('');
  };

  const renderParentTask = ({ item }: { item: TaskItem }) => {
    const isExpanded = expandedTaskId === item.id;
    const doneCount = item.subSteps.filter((s) => s.completed).length;
    const totalSteps = item.subSteps.length;

    return (
      <View style={styles.groupCardWrapper}>
        <Swipeable
          renderRightActions={(progress, dragX) =>
            renderRightActions(progress, dragX, () => deleteTaskGroup(item.id))
          }
          friction={2}
          overshootRight={false}
        >
          <View style={styles.groupCard}>
            {/* Parent Header */}
            <TouchableOpacity
              style={styles.parentHeader}
              onPress={() => toggleExpand(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.parentAccentBar} />
              <View style={styles.parentTitleContainer}>
                <Text style={styles.parentTitle}>{item.parentTitle}</Text>
                <Text style={styles.stepCounterText}>
                  {doneCount} / {totalSteps} steps completed
                </Text>
              </View>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#526E70"
              />
            </TouchableOpacity>

            {/* Nested Sub-Steps */}
            {isExpanded && (
              <View style={styles.subStepsList}>
                {item.subSteps.map((step, idx) => (
                  <Swipeable
                    key={step.id}
                    renderRightActions={(progress, dragX) =>
                      renderRightActions(progress, dragX, () => deleteSubStep(item.id, step.id))
                    }
                    friction={2}
                    overshootRight={false}
                  >
                    <TouchableOpacity
                      style={[styles.subStepCard, step.completed && styles.subStepCompleted]}
                      onPress={() => toggleSubStep(item.id, step.id)}
                    >
                      <Ionicons
                        name={step.completed ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={step.completed ? '#7BAE7F' : '#A4C3B2'}
                      />
                      <View style={styles.subStepContent}>
                        <Text
                          style={[styles.subStepText, step.completed && styles.completedText]}
                        >
                          {step.title.replace(/\*\*/g, '')}
                        </Text>
                        <View style={styles.subStepBadgeRow}>
                          <Text style={styles.stepBadge}>Step {idx + 1}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Swipeable>
                ))}
              </View>
            )}
          </View>
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
              <Text style={styles.headerSubtitle}>Swipe left on a task to delete</Text>
            </View>
            <TouchableOpacity
              style={styles.aiBreakdownBtn}
              onPress={() => router.push('/(tabs)/milo')}
            >
              <Ionicons name="sparkles" size={16} color="#3B4D21" />
              <Text style={styles.aiBreakdownText}>Ask Milo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
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
            >
              <Ionicons name="add" size={22} color="#1B3C3E" />
            </TouchableOpacity>
          </View>

          {/* Grouped Task List */}
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={renderParentTask}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7EC2C6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.4 },
  groupCardWrapper: { marginBottom: 14, borderRadius: 18, overflow: 'hidden' },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  deleteActionContainer: {
    backgroundColor: '#E65C5C',
    justifyContent: 'center',
    alignItems: 'center',
    width: 75,
    borderRadius: 18,
    marginLeft: 8,
  },
  parentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  parentAccentBar: {
    width: 5,
    height: '100%',
    backgroundColor: '#7EC2C6',
    borderRadius: 3,
    marginRight: 12,
  },
  parentTitleContainer: { flex: 1 },
  parentTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  stepCounterText: { fontSize: 12, color: '#777777', marginTop: 2, fontWeight: '500' },
  subStepsList: {
    backgroundColor: '#F9FAF3',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  subStepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  subStepCompleted: { opacity: 0.6 },
  subStepContent: { flex: 1 },
  subStepText: { fontSize: 14, color: '#222222', lineHeight: 19, fontWeight: '500' },
  completedText: { textDecorationLine: 'line-through', color: '#888888' },
  subStepBadgeRow: { marginTop: 4 },
  stepBadge: { fontSize: 11, fontWeight: '600', color: '#7EC2C6' },
});