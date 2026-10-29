// app/task/[id].tsx
// Full screen for one task: edit the title and steps, tick things off, set an optional
// deadline, and ask Milo for a gentle plan of when to do each step.
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTasks } from '../../src/hooks/useTasks';
import { useAuth } from '../../src/context/AuthContext';
import { askMiloForTimePlan } from '../../src/services/ai';
import { cleanStepText } from '../../src/services/taskService';
import type { SubStep } from '../../src/services/taskService';
import { FormattedMiloText } from '../../src/components/MiloMarkdown';
import { formatDateTime, formatDay, relativeDay, startOfDay } from '../../src/utils/dates';
import { countSteps, taskProgressMessage } from '../../src/utils/encouragement';

const TEAL = '#7EC2C6';
const DEEP_TEAL = '#3B6B6E';
const INK = '#1B3C3E';
const GREEN = '#7BAE7F';
const RED = '#D64545';

// ---------------------------------------------------------------------------
// Deadline picker: a few calm choices instead of a fiddly calendar
// ---------------------------------------------------------------------------

const TIME_SLOTS = [
  { label: 'Morning', hour: 9, minute: 0 },
  { label: 'Afternoon', hour: 14, minute: 0 },
  { label: 'Evening', hour: 18, minute: 0 },
  { label: 'Night', hour: 21, minute: 0 },
];
const QUICK_DAYS = [
  { label: 'Today', add: 0 },
  { label: 'Tomorrow', add: 1 },
  { label: 'In 3 days', add: 3 },
  { label: 'Next week', add: 7 },
];

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function DeadlineModal({
  visible,
  initial,
  onClose,
  onSave,
  onClear,
}: {
  visible: boolean;
  initial: number | null | undefined;
  onClose: () => void;
  onSave: (ms: number) => void;
  onClear: () => void;
}) {
  const [day, setDay] = useState(() => startOfDay(addDays(new Date(), 1)));
  const [slot, setSlot] = useState(2);

  // Start from the current deadline each time the picker opens
  useEffect(() => {
    if (!visible) return;
    if (initial) {
      const d = new Date(initial);
      setDay(startOfDay(d));
      const mins = d.getHours() * 60 + d.getMinutes();
      let best = 0;
      TIME_SLOTS.forEach((s, i) => {
        if (Math.abs(s.hour * 60 + s.minute - mins) < Math.abs(TIME_SLOTS[best].hour * 60 + TIME_SLOTS[best].minute - mins)) best = i;
      });
      setSlot(best);
    } else {
      setDay(startOfDay(addDays(new Date(), 1)));
      setSlot(2);
    }
  }, [visible, initial]);

  const now = new Date();
  const today = startOfDay(now);
  const chosen = new Date(day.getFullYear(), day.getMonth(), day.getDate(), TIME_SLOTS[slot].hour, TIME_SLOTS[slot].minute);
  const isPast = chosen.getTime() <= now.getTime();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>When would you like this done?</Text>
          <Text style={styles.sheetSubtitle}>Optional, and you can change it any time.</Text>

          <View style={styles.chipRow}>
            {QUICK_DAYS.map((q) => {
              const d = addDays(today, q.add);
              const active = d.getTime() === day.getTime();
              return (
                <TouchableOpacity
                  key={q.label}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setDay(d)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{q.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.dayStepper}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setDay((d) => (d.getTime() > today.getTime() ? addDays(d, -1) : d))}
              disabled={day.getTime() <= today.getTime()}
              accessibilityLabel="Previous day"
            >
              <Ionicons name="chevron-back" size={22} color={day.getTime() <= today.getTime() ? '#C5CCC9' : DEEP_TEAL} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.stepperDay}>{formatDay(day)}</Text>
              <Text style={styles.stepperRel}>{relativeDay(addDays(day, 0).getTime() + 86399000, now)}</Text>
            </View>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => setDay((d) => addDays(d, 1))} accessibilityLabel="Next day">
              <Ionicons name="chevron-forward" size={22} color={DEEP_TEAL} />
            </TouchableOpacity>
          </View>

          <View style={styles.chipRow}>
            {TIME_SLOTS.map((s, i) => (
              <TouchableOpacity key={s.label} style={[styles.chip, slot === i && styles.chipActive]} onPress={() => setSlot(i)}>
                <Text style={[styles.chipText, slot === i && styles.chipTextActive]}>
                  {s.label} · {String(s.hour).padStart(2, '0')}:{String(s.minute).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.deadlinePreview, isPast && { color: RED }]}>
            {isPast ? 'That time has already passed. Pick a later one.' : `Due ${formatDateTime(chosen.getTime())}`}
          </Text>

          <View style={styles.sheetActions}>
            {initial ? (
              <TouchableOpacity onPress={onClear} style={styles.sheetLinkBtn}>
                <Text style={[styles.sheetLinkText, { color: RED }]}>Remove</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={onClose} style={styles.sheetLinkBtn}>
                <Text style={styles.sheetLinkText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onSave(chosen.getTime())}
                disabled={isPast}
                style={[styles.primaryBtn, isPast && { opacity: 0.4 }]}
              >
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Task screen
// ---------------------------------------------------------------------------

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const t = useTasks();
  const task = t.tasks.find((x) => x.id === id);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepDraft, setStepDraft] = useState('');
  const [addingDetailFor, setAddingDetailFor] = useState<string | null>(null);
  const [detailDraft, setDetailDraft] = useState('');
  const [newStep, setNewStep] = useState('');
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/tasks'));

  if (!task) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        {t.isLoading ? (
          <ActivityIndicator color={DEEP_TEAL} />
        ) : (
          <>
            <Text style={styles.emptyTitle}>This task isn't here anymore</Text>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} onPress={goBack}>
              <Text style={styles.primaryBtnText}>Back to tasks</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  const { done, total } = countSteps(task);
  const percent = total ? Math.round((done / total) * 100) : 0;

  const saveTitle = () => {
    const next = titleDraft.trim();
    if (next && next !== task.parentTitle) t.updateTaskFields(task.id, { parentTitle: next.slice(0, 200) });
    setEditingTitle(false);
  };

  const startEditStep = (step: SubStep) => {
    setEditingStepId(step.id);
    setStepDraft(cleanStepText(step.title));
  };
  const saveStep = () => {
    if (editingStepId && stepDraft.trim()) t.renameSubStep(task, editingStepId, stepDraft);
    setEditingStepId(null);
  };

  const confirmDeleteStep = (step: SubStep) =>
    Alert.alert('Remove this step?', cleanStepText(step.title), [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => t.deleteSubStep(task, step.id) },
    ]);

  const confirmDeleteTask = () =>
    Alert.alert('Delete this task?', `"${task.parentTitle}" and all its steps will be removed.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          t.deleteTask(task.id);
          goBack();
        },
      },
    ]);

  const addDetail = (stepId: string) => {
    if (detailDraft.trim()) t.addStepDetail(task, stepId, detailDraft);
    setDetailDraft('');
  };

  const addStep = () => {
    if (newStep.trim()) t.addSubStep(task, newStep);
    setNewStep('');
  };

  const askForPlan = async () => {
    setPlanLoading(true);
    try {
      const plan = await askMiloForTimePlan(task, profile);
      t.updateTaskFields(task.id, { miloPlan: plan.slice(0, 6000) });
    } catch {
      Alert.alert("Milo couldn't connect", 'Check your internet and try again in a moment.');
    } finally {
      setPlanLoading(false);
    }
  };

  const deadlinePassed = !!task.deadline && task.deadline < Date.now();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.topHeader, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBtn} onPress={goBack} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={22} color={INK} />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>Your Task</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={confirmDeleteTask} accessibilityLabel="Delete task">
            <Ionicons name="trash-outline" size={20} color={RED} />
          </TouchableOpacity>
        </View>

        {editingTitle ? (
          <TextInput
            style={styles.titleInput}
            value={titleDraft}
            onChangeText={setTitleDraft}
            onBlur={saveTitle}
            autoFocus
            returnKeyType="done"
            maxLength={200}
          />
        ) : (
          <TouchableOpacity
            style={styles.titleRow}
            onPress={() => {
              setTitleDraft(task.parentTitle);
              setEditingTitle(true);
            }}
            accessibilityHint="Tap to rename this task"
          >
            <Text style={styles.title}>{task.parentTitle}</Text>
            <Ionicons name="pencil" size={16} color={INK} style={{ marginTop: 6 }} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.cardTitle}>
              {done} of {total} steps done
            </Text>
            <Text style={styles.percent}>{percent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.encourage}>{taskProgressMessage(task)}</Text>
        </View>

        {/* Deadline */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.iconBubble}>
                <Ionicons name="calendar-outline" size={18} color={DEEP_TEAL} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{task.deadline ? formatDateTime(task.deadline) : 'No deadline'}</Text>
                <Text style={styles.cardSub}>
                  {task.deadline
                    ? deadlinePassed
                      ? "This date has passed. That's okay, you can set a new one."
                      : `Due ${relativeDay(task.deadline)}. You'll get a gentle reminder.`
                    : "That's okay. Add one if it helps you plan."}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.smallBtn} onPress={() => setDeadlineOpen(true)}>
              <Text style={styles.smallBtnText}>{task.deadline ? 'Change' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Milo's plan */}
        {task.deadline && !task.completed && !deadlinePassed ? (
          <View style={[styles.card, styles.miloCard]}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Milo's gentle plan</Text>
              {task.miloPlan && !planLoading ? (
                <TouchableOpacity onPress={askForPlan} style={styles.sheetLinkBtn}>
                  <Text style={styles.sheetLinkText}>Refresh</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {planLoading ? (
              <View style={styles.planLoading}>
                <ActivityIndicator color={DEEP_TEAL} />
                <Text style={styles.cardSub}>Milo is finding good times for you…</Text>
              </View>
            ) : task.miloPlan ? (
              <View style={{ marginTop: 6 }}>
                <FormattedMiloText text={task.miloPlan} />
                <Text style={styles.planNote}>Just a suggestion. Move things around however suits you.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.cardSub}>
                  Milo can suggest when to do each step so you finish comfortably, with breaks built in.
                </Text>
                <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12, alignSelf: 'flex-start' }]} onPress={askForPlan}>
                  <Text style={styles.primaryBtnText}>Suggest times for my steps</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        {/* Steps */}
        <Text style={styles.sectionTitle}>Steps</Text>
        {task.subSteps.length === 0 ? (
          <Text style={styles.cardSub}>No steps yet. Add a first small one below.</Text>
        ) : null}

        {task.subSteps.map((step, idx) => (
          <View key={step.id} style={[styles.stepCard, step.completed && styles.stepCardDone]}>
            <View style={styles.stepRow}>
              <TouchableOpacity
                onPress={() => t.toggleSubStep(task, step.id)}
                style={styles.checkHit}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: step.completed }}
                accessibilityLabel={cleanStepText(step.title)}
              >
                <Ionicons
                  name={step.completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={28}
                  color={step.completed ? GREEN : '#A4C3B2'}
                />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.stepNumber}>Step {idx + 1}</Text>
                {editingStepId === step.id ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={stepDraft}
                    onChangeText={setStepDraft}
                    onBlur={saveStep}
                    autoFocus
                    returnKeyType="done"
                  />
                ) : (
                  <Text style={[styles.stepTitle, step.completed && styles.doneText]}>{cleanStepText(step.title)}</Text>
                )}
              </View>

              <TouchableOpacity style={styles.iconHit} onPress={() => startEditStep(step)} accessibilityLabel="Edit step">
                <Ionicons name="pencil" size={17} color={DEEP_TEAL} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconHit} onPress={() => confirmDeleteStep(step)} accessibilityLabel="Remove step">
                <Ionicons name="trash-outline" size={17} color={RED} />
              </TouchableOpacity>
            </View>

            {/* Smaller steps inside this step */}
            {(step.details ?? []).map((d) => (
              <View key={d.id} style={styles.detailRow}>
                <TouchableOpacity
                  onPress={() => t.toggleStepDetail(task, step.id, d.id)}
                  style={styles.detailCheck}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: d.completed }}
                >
                  <Ionicons
                    name={d.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={d.completed ? GREEN : '#A4C3B2'}
                  />
                  <Text style={[styles.detailText, d.completed && styles.doneText]}>{cleanStepText(d.title)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconHit}
                  onPress={() => t.deleteStepDetail(task, step.id, d.id)}
                  accessibilityLabel="Remove smaller step"
                >
                  <Ionicons name="close" size={16} color="#9AA5A1" />
                </TouchableOpacity>
              </View>
            ))}

            {addingDetailFor === step.id ? (
              <View style={styles.addDetailRow}>
                <TextInput
                  style={[styles.inlineInput, { flex: 1 }]}
                  value={detailDraft}
                  onChangeText={setDetailDraft}
                  placeholder="A smaller step…"
                  placeholderTextColor="#999"
                  autoFocus
                  blurOnSubmit={false}
                  onSubmitEditing={() => addDetail(step.id)}
                  onBlur={() => {
                    addDetail(step.id);
                    setAddingDetailFor(null);
                  }}
                  returnKeyType="done"
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addDetailBtn}
                onPress={() => {
                  setDetailDraft('');
                  setAddingDetailFor(step.id);
                }}
              >
                <Ionicons name="add" size={16} color={DEEP_TEAL} />
                <Text style={styles.addDetailText}>Add a smaller step</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Add a step */}
        <View style={styles.addStepRow}>
          <TextInput
            style={styles.addStepInput}
            value={newStep}
            onChangeText={setNewStep}
            placeholder="Add another step…"
            placeholderTextColor="#999"
            blurOnSubmit={false}
            onSubmitEditing={addStep}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addStepBtn, !newStep.trim() && { opacity: 0.4 }]}
            onPress={addStep}
            disabled={!newStep.trim()}
            accessibilityLabel="Add step"
          >
            <Ionicons name="add" size={22} color={INK} />
          </TouchableOpacity>
        </View>

        {task.completed ? (
          <View style={styles.celebrateCard}>
            <Text style={styles.celebrateTitle}>You did it! 🎉</Text>
            <Text style={styles.celebrateSub}>Take a moment to feel good about this. Every step counted.</Text>
          </View>
        ) : null}
      </ScrollView>

      <DeadlineModal
        visible={deadlineOpen}
        initial={task.deadline}
        onClose={() => setDeadlineOpen(false)}
        onSave={(ms) => {
          // A new deadline makes the old plan out of date
          t.updateTaskFields(task.id, { deadline: ms, miloPlan: null });
          setDeadlineOpen(false);
        }}
        onClear={() => {
          t.updateTaskFields(task.id, { deadline: null, miloPlan: null });
          setDeadlineOpen(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F5E9' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: INK },

  topHeader: {
    backgroundColor: TEAL,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: { fontSize: 15, fontWeight: '700', color: DEEP_TEAL },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14 },
  title: { flexShrink: 1, fontSize: 24, lineHeight: 30, fontWeight: '700', color: INK },
  titleInput: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '700',
    color: INK,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  body: { paddingHorizontal: 20, paddingTop: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  miloCard: { backgroundColor: '#F7FAF0', borderColor: '#D6E2A3' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  cardSub: { fontSize: 13, lineHeight: 19, color: '#5F6B66', marginTop: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtn: { backgroundColor: '#E6F2F2', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, minHeight: 40, justifyContent: 'center' },
  smallBtnText: { fontSize: 13, fontWeight: '700', color: DEEP_TEAL },

  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  percent: { fontSize: 13, fontWeight: '700', color: DEEP_TEAL },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: '#E8EDE3', marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: GREEN },
  encourage: { fontSize: 14, lineHeight: 20, color: '#2C3E35', marginTop: 10, fontWeight: '500' },

  planLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  planNote: { fontSize: 12, color: '#7A857F', marginTop: 8, fontStyle: 'italic' },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: DEEP_TEAL, marginTop: 8, marginBottom: 8 },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  stepCardDone: { backgroundColor: '#F6F9F2' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconHit: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontSize: 11, fontWeight: '700', color: DEEP_TEAL, marginTop: 4 },
  stepTitle: { fontSize: 15, lineHeight: 21, color: '#1F2A26', fontWeight: '600', marginTop: 2 },
  doneText: { textDecorationLine: 'line-through', color: '#8A938F' },
  inlineInput: {
    fontSize: 15,
    color: '#1F2A26',
    backgroundColor: '#F3F5E9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },

  detailRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 44 },
  detailCheck: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  detailText: { flex: 1, fontSize: 14, lineHeight: 19, color: '#2C3E35' },
  addDetailRow: { marginLeft: 44, marginRight: 8, marginTop: 4 },
  addDetailBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 44, minHeight: 40, alignSelf: 'flex-start', paddingRight: 8 },
  addDetailText: { fontSize: 13, fontWeight: '600', color: DEEP_TEAL },

  addStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginTop: 4,
  },
  addStepInput: { flex: 1, minHeight: 40, fontSize: 14, color: '#1A1A1A' },
  addStepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },

  celebrateCard: { backgroundColor: '#E9F4E4', borderRadius: 18, padding: 18, marginTop: 16, alignItems: 'center' },
  celebrateTitle: { fontSize: 18, fontWeight: '700', color: '#2F5D34' },
  celebrateSub: { fontSize: 14, color: '#3E6B44', marginTop: 4, textAlign: 'center' },

  primaryBtn: { backgroundColor: TEAL, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, minHeight: 44, justifyContent: 'center' },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: INK },

  // Deadline sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  sheetSubtitle: { fontSize: 13, color: '#6B7671', marginTop: 2, marginBottom: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F5E9', minHeight: 40, justifyContent: 'center' },
  chipActive: { backgroundColor: TEAL },
  chipText: { fontSize: 13, fontWeight: '600', color: DEEP_TEAL },
  chipTextActive: { color: INK },
  dayStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F9F4',
    borderRadius: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  stepperBtn: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepperDay: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  stepperRel: { fontSize: 12, color: '#6B7671' },
  deadlinePreview: { fontSize: 14, fontWeight: '600', color: DEEP_TEAL, marginBottom: 14 },
  sheetActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetLinkBtn: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  sheetLinkText: { fontSize: 14, fontWeight: '600', color: '#6B7671' },
});
