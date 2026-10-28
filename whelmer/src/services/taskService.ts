import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';


export interface SubStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
  id: string;
  parentTitle: string;
  completed: boolean;
  createdAt: number;
  subSteps: SubStep[];
}

type TaskDoc = Omit<TaskItem, 'id'>;

const tasksCol = (uid: string) => collection(db, 'users', uid, 'tasks');
const taskRef = (uid: string, taskId: string) => doc(db, 'users', uid, 'tasks', taskId);

const makeStepId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const commit = (label: string, write: Promise<unknown>) => {
  write.catch((e) => console.warn(`[taskService] ${label} failed:`, e));
};

const toTaskItem = (id: string, data: Partial<TaskDoc>): TaskItem => ({
  id,
  parentTitle: data.parentTitle ?? 'Untitled task',
  completed: data.completed ?? false,
  createdAt: data.createdAt ?? 0,
  subSteps: Array.isArray(data.subSteps) ? data.subSteps : [],
});


export const subscribeToTasks = (
  uid: string,
  onChange: (tasks: TaskItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe =>
  onSnapshot(
    query(tasksCol(uid), orderBy('createdAt', 'desc')),
    (snap) => onChange(snap.docs.map((d) => toTaskItem(d.id, d.data() as Partial<TaskDoc>))),
    (err) => {
      console.warn('[taskService] subscription error:', err);
      onError?.(err);
    }
  );


export const createTask = (
  uid: string,
  parentTitle: string,
  stepTitles: string[] = []
): TaskItem => {
  const ref = doc(tasksCol(uid));
  const data: TaskDoc = {
    parentTitle,
    completed: false,
    createdAt: Date.now(),
    subSteps: stepTitles.map((title) => ({ id: makeStepId(), title, completed: false })),
  };
  commit('createTask', setDoc(ref, data));
  return { id: ref.id, ...data };
};


export const toggleTaskCompleted = (uid: string, task: TaskItem): void => {
  const completed = !task.completed;
  const subSteps = completed
    ? task.subSteps.map((s) => ({ ...s, completed: true }))
    : task.subSteps;
  commit('toggleTaskCompleted', updateDoc(taskRef(uid, task.id), { completed, subSteps }));
};

export const toggleSubStep = (uid: string, task: TaskItem, stepId: string): void => {
  const subSteps = task.subSteps.map((s) =>
    s.id === stepId ? { ...s, completed: !s.completed } : s
  );
  const completed = subSteps.length > 0 && subSteps.every((s) => s.completed);
  commit('toggleSubStep', updateDoc(taskRef(uid, task.id), { subSteps, completed }));
};

export const addSubStep = (uid: string, task: TaskItem, title: string): void => {
  const subSteps = [...task.subSteps, { id: makeStepId(), title, completed: false }];
  commit('addSubStep', updateDoc(taskRef(uid, task.id), { subSteps, completed: false }));
};

export const deleteSubStep = (uid: string, task: TaskItem, stepId: string): void => {
  const subSteps = task.subSteps.filter((s) => s.id !== stepId);
  const completed = subSteps.length > 0 && subSteps.every((s) => s.completed);
  commit('deleteSubStep', updateDoc(taskRef(uid, task.id), { subSteps, completed }));
};

export const deleteTask = (uid: string, taskId: string): void => {
  commit('deleteTask', deleteDoc(taskRef(uid, taskId)));
};


function extractSmartTitle(text: string): string {
  
  const boldMatch = text.match(/\*\*(.*?)\*\*/);
  if (boldMatch && boldMatch[1]) {
    const cleanHeader = boldMatch[1]
      .replace(/\s*\(\d+.*?\)/g, '') 
      .replace(/:\s*$/, '')          
      .trim();

    if (cleanHeader.length > 2 && cleanHeader.length < 40) {
      return cleanHeader;
    }
  }

  
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !/^#+/.test(l) &&
        !/^(hey|hi|hello|sure|here|that sounds|i'd love|let's)/i.test(l) &&
        !/roadmap|adventure|check-in|feeling/i.test(l)
    );

  if (lines.length > 0) {
    const candidate = lines[0].replace(/[*_~`]/g, '').trim();
    if (candidate.length <= 45) return candidate;
    // Truncate cleanly to first 5 words if sentence is long
    return candidate.split(' ').slice(0, 5).join(' ') + '...';
  }

  return 'New Activity';
}

export const parseMiloSteps = (text: string): { title: string; steps: string[] } | null => {
  // Match numbered items (1.) or bullet points (-, *)
  const stepMatches = text.match(/(?:^|\n)\s*(?:\d+[\.\)]|[-*])\s*(.+)/g);
  if (!stepMatches || stepMatches.length === 0) return null;

  const steps = stepMatches.map((stepStr) =>
    stepStr
      .replace(/^\s*(?:\d+[\.\)]|[-*])\s*/, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .trim()
  );

  return { title: extractSmartTitle(text), steps };
};

export const parseAndSaveMiloTasks = (uid: string, text: string): TaskItem | null => {
  const parsed = parseMiloSteps(text);
  if (!parsed) return null;
  return createTask(uid, parsed.title, parsed.steps);
};
