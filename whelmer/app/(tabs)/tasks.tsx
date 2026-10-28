import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
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
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { cleanStepText } from '../../src/services/taskService';
import type { TaskItem } from '../../src/services/taskService';
import { useTasks } from '../../src/hooks/useTasks';
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

  const {
    tasks,
    createTask,
    saveMiloResponse,
    toggleSubStep,
    toggleStepDetail,
    deleteSubStep,
    deleteTask,
  } = useTasks();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Open the newest task the first time tasks arrive from Firestore
  const didAutoExpand = useRef(false);
  useEffect(() => {
    if (!didAutoExpand.current && tasks.length > 0) {
      didAutoExpand.current = true;
      setExpandedTaskId((prev) => prev ?? tasks[0].id);
    }
  }, [tasks]);

  // Delete parent task group
  const deleteTaskGroup = useCallback(
    (taskId: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      deleteTask(taskId);
    },
    [deleteTask]
  );

  // Delete individual sub-step
  const handleDeleteSubStep = useCallback(
    (task: TaskItem, stepId: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      deleteSubStep(task, stepId);
    },
    [deleteSubStep]
  );

  // Which steps have their smaller details open (collapsed by default to avoid overwhelm)
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const toggleDetails = useCallback((stepId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenDetails((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTaskId((prev) => (prev === id ? null : id));
  }, []);

  const handleAddNewTask = () => {
    const input = newTaskTitle.trim();
    if (!input) return;

    const created =
      saveMiloResponse(input) ?? createTask(input, ['Start working on task']);
    if (created) setExpandedTaskId(created.id);
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
                      renderRightActions(progress, dragX, () => handleDeleteSubStep(item, step.id))
                    }
                    friction={2}
                    overshootRight={false}
                  >
                    <View style={[styles.subStepCard, styles.subStepCardColumn, step.completed && styles.subStepCompleted]}>
                      <TouchableOpacity
                        style={styles.subStepRow}
                        onPress={() => toggleSubStep(item, step.id)}
                        activeOpacity={0.7}
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
                            {cleanStepText(step.title)}
                          </Text>
                          <View style={styles.subStepBadgeRow}>
                            <Text style={styles.stepBadge}>Step {idx + 1}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Smaller tickable details inside this step */}
                      {step.details && step.details.length > 0 && (
                        <View>
                          <TouchableOpacity
                            style={styles.detailsToggle}
                            onPress={() => toggleDetails(step.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={openDetails[step.id] ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color="#3B6B6E"
                            />
                            <Text style={styles.detailsToggleText}>
                              {step.details.filter((d) => d.completed).length} of {step.details.length} smaller steps
                            </Text>
                          </TouchableOpacity>

                          {openDetails[step.id] &&
                            step.details.map((detail) => (
                              <TouchableOpacity
                                key={detail.id}
                                style={styles.detailRow}
                                onPress={() => toggleStepDetail(item, step.id, detail.id)}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={detail.completed ? 'checkmark-circle' : 'ellipse-outline'}
                                  size={18}
                                  color={detail.completed ? '#7BAE7F' : '#A4C3B2'}
                                />
                                <Text
                                  style={[styles.detailText, detail.completed && styles.completedText]}
                                >
                                  {cleanStepText(detail.title)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                        </View>
                      )}
                    </View>
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
              <Image source={milo} style={{ height:15, width: 11, borderRadius: 100 }} />
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
  stepBadge: { fontSize: 11, fontWeight: '600', color: '#3B6B6E' },
  subStepCardColumn: { flexDirection: 'column', alignItems: 'stretch', gap: 0 },
  subStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginLeft: 32,
    minHeight: 36,
    alignSelf: 'flex-start',
    paddingRight: 8,
  },
  detailsToggleText: { fontSize: 13, fontWeight: '600', color: '#3B6B6E' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 32,
    minHeight: 44,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  detailText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#2C3E35' },
});