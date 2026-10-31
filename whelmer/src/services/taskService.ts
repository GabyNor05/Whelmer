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
import { auth, db } from './firebase';
import { normalizeMiloText } from '../utils/miloText';


export interface StepDetail {
  id: string;
  title: string;
  completed: boolean;
}

export interface SubStep {
  id: string;
  title: string;
  completed: boolean;
  // Smaller tickable points that belong to this step (shown as a dropdown)
  details?: StepDetail[];
}

// A step as produced by the parser, before ids are assigned
export type StepInput = string | { title: string; details?: string[] };

export interface TaskItem {
  id: string;
  parentTitle: string;
  completed: boolean;
  createdAt: number;
  subSteps: SubStep[];
  // Optional due date (ms since epoch), set by the user on the task screen
  deadline?: number | null;
  // Milo's suggested time plan for reaching the deadline (markdown)
  miloPlan?: string | null;
}

type TaskDoc = Omit<TaskItem, 'id'>;

const tasksCol = (uid: string) => collection(db, 'users', uid, 'tasks');
const taskRef = (uid: string, taskId: string) => doc(db, 'users', uid, 'tasks', taskId);

const makeStepId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Removes markdown symbols (**bold**, *italics*, `code`, # headings, "Step 1:" prefixes)
export const cleanStepText = (text: string): string =>
  text
    .replace(/\*\*|__|`/g, '')
    .replace(/(^|\s)[*_](\S)/g, '$1$2')
    .replace(/(\S)[*_](?=\s|$|[.,:;!?)])/g, '$1')
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*step\s*\d+\s*[:.)-]\s*/i, '')
    .replace(/\s*:\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

const toSubStep = (step: StepInput): SubStep => {
  const title = cleanStepText(typeof step === 'string' ? step : step.title);
  const details = typeof step === 'string' ? [] : (step.details ?? []);
  const base: SubStep = { id: makeStepId(), title, completed: false };
  // Firestore rejects undefined fields, so only add details when there are some
  return details.length > 0
    ? {
        ...base,
        details: details.map((d) => ({ id: makeStepId(), title: cleanStepText(d), completed: false })),
      }
    : base;
};

const commit = (label: string, write: Promise<unknown>) => {
  write.catch((e) => console.warn(`[taskService] ${label} failed:`, e));
};

const toTaskItem = (id: string, data: Partial<TaskDoc>): TaskItem => ({
  id,
  parentTitle: data.parentTitle ?? 'Untitled task',
  completed: data.completed ?? false,
  createdAt: data.createdAt ?? 0,
  subSteps: Array.isArray(data.subSteps) ? data.subSteps : [],
  deadline: typeof data.deadline === 'number' ? data.deadline : null,
  miloPlan: typeof data.miloPlan === 'string' ? data.miloPlan : null,
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
      // permission-denied is expected for a moment while signing out
      if (!auth.currentUser) return;
      console.warn('[taskService] subscription error:', err);
      onError?.(err);
    }
  );


export const createTask = (
  uid: string,
  parentTitle: string,
  steps: StepInput[] = []
): TaskItem => {
  const ref = doc(tasksCol(uid));
  const data: TaskDoc = {
    parentTitle,
    completed: false,
    createdAt: Date.now(),
    subSteps: steps.map(toSubStep),
  };
  commit('createTask', setDoc(ref, data));
  return { id: ref.id, ...data };
};


export const toggleTaskCompleted = (uid: string, task: TaskItem): void => {
  const completed = !task.completed;
  const subSteps = completed
    ? task.subSteps.map((s) => setStepCompleted(s, true))
    : task.subSteps;
  commit('toggleTaskCompleted', updateDoc(taskRef(uid, task.id), { completed, subSteps }));
};

// Ticking a step ticks all of its smaller details too (and un-ticking clears them)
const setStepCompleted = (step: SubStep, completed: boolean): SubStep =>
  step.details && step.details.length > 0
    ? { ...step, completed, details: step.details.map((d) => ({ ...d, completed })) }
    : { ...step, completed };

export const toggleSubStep = (uid: string, task: TaskItem, stepId: string): void => {
  const subSteps = task.subSteps.map((s) =>
    s.id === stepId ? setStepCompleted(s, !s.completed) : s
  );
  const completed = subSteps.length > 0 && subSteps.every((s) => s.completed);
  commit('toggleSubStep', updateDoc(taskRef(uid, task.id), { subSteps, completed }));
};

// Ticks one smaller detail; its step completes once all its details are done
export const toggleStepDetail = (
  uid: string,
  task: TaskItem,
  stepId: string,
  detailId: string
): void => {
  const subSteps = task.subSteps.map((s) => {
    if (s.id !== stepId || !s.details) return s;
    const details = s.details.map((d) => (d.id === detailId ? { ...d, completed: !d.completed } : d));
    return { ...s, details, completed: details.every((d) => d.completed) };
  });
  const completed = subSteps.length > 0 && subSteps.every((s) => s.completed);
  commit('toggleStepDetail', updateDoc(taskRef(uid, task.id), { subSteps, completed }));
};

export const addSubStep = (uid: string, task: TaskItem, title: string): void => {
  const clean = cleanStepText(title);
  if (!clean) return;
  const subSteps = [...task.subSteps, { id: makeStepId(), title: clean, completed: false }];
  commit('addSubStep', updateDoc(taskRef(uid, task.id), { subSteps, completed: false }));
};

export const deleteSubStep = (uid: string, task: TaskItem, stepId: string): void => {
  const subSteps = task.subSteps.filter((s) => s.id !== stepId);
  const completed = subSteps.length > 0 && subSteps.every((s) => s.completed);
  commit('deleteSubStep', updateDoc(taskRef(uid, task.id), { subSteps, completed }));
};

// Rename the task, set/clear its deadline, or save Milo's plan
export const updateTaskFields = (
  uid: string,
  taskId: string,
  fields: Partial<Pick<TaskItem, 'parentTitle' | 'deadline' | 'miloPlan'>>
): void => {
  commit('updateTaskFields', updateDoc(taskRef(uid, taskId), fields));
};

export const renameSubStep = (uid: string, task: TaskItem, stepId: string, title: string): void => {
  const clean = cleanStepText(title);
  if (!clean) return;
  const subSteps = task.subSteps.map((s) => (s.id === stepId ? { ...s, title: clean } : s));
  commit('renameSubStep', updateDoc(taskRef(uid, task.id), { subSteps }));
};

export const addStepDetail = (uid: string, task: TaskItem, stepId: string, title: string): void => {
  const clean = cleanStepText(title);
  if (!clean) return;
  const subSteps = task.subSteps.map((s) =>
    s.id === stepId
      ? {
          ...s,
          completed: false,
          details: [...(s.details ?? []), { id: makeStepId(), title: clean, completed: false }],
        }
      : s
  );
  commit('addStepDetail', updateDoc(taskRef(uid, task.id), { subSteps, completed: false }));
};

export const deleteStepDetail = (uid: string, task: TaskItem, stepId: string, detailId: string): void => {
  const subSteps = task.subSteps.map((s) => {
    if (s.id !== stepId || !s.details) return s;
    const details = s.details.filter((d) => d.id !== detailId);
    const next: SubStep = { ...s, details };
    if (details.length > 0) next.completed = details.every((d) => d.completed);
    return next;
  });
  const completed = subSteps.length > 0 && subSteps.every((s) => s.completed);
  commit('deleteStepDetail', updateDoc(taskRef(uid, task.id), { subSteps, completed }));
};

// Would this toggle finish the whole task? Used to celebrate (haptics) at the right moment.
export const wouldCompleteTask = (task: TaskItem, stepId: string, detailId?: string): boolean => {
  if (task.completed) return false;
  return task.subSteps.every((s) => {
    if (s.id !== stepId) return s.completed;
    if (!detailId) return !s.completed;
    const details = s.details ?? [];
    return details.every((d) => (d.id === detailId ? !d.completed : d.completed));
  });
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

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'my']);

// Turns what the user asked Milo into a short task heading.
// "Hey Milo, please, I need to build a rocket!" -> "Build a Rocket"
export function titleFromRequest(request: string): string {
  const fillers = [
    /^(hey|hi|hello|yo|ok(ay)?|so|um+|uh+|well)\b[\s,!.]*(milo\b)?[\s,!.]*/i,
    /^milo\b[\s,!.]*/i,
    /^(please|pls|plz|kindly)\b[\s,!.]*/i,
    /^(you know|like|basically|honestly|actually)\b[\s,!.]*/i,
    /^(can|could|would|will) you( please)?( help me( to)?)?\s*/i,
    /^help me( to| with)?\s*/i,
    /^(i|i'm|im|i am)\s+(really\s+)?(need|needs|want|wanna|have|got|gotta|have got|'ve got|would like|'d like|trying|going|planning|meant|supposed)(\s+to)?\s*/i,
    /^(i've|ive|i'd|id)\s+(got|like|love)(\s+to)?\s*/i,
    /^(how (do|can|should) i|how to|what are the steps to|steps to|steps for)\s*/i,
    /^(break (it |this |that )?down( for me)?|give me (a |the )?(plan|steps|breakdown)( for| to)?)[\s:,-]*/i,
    /^(to|me)\s+/i,
  ];

  let s = request.replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim();
  for (let changed = true; changed; ) {
    changed = false;
    for (const re of fillers) {
      const next = s.replace(re, '').trim();
      if (next !== s && next.length > 0) {
        s = next;
        changed = true;
      }
    }
  }

  // Keep the first clause and drop trailing politeness
  s = s
    .split(/[.!?\n]/)[0]
    .replace(/[\s,]+(please|pls|for me|thanks|thank you|asap)\b.*$/i, '')
    .replace(/[\s,:;-]+$/, '')
    .trim();

  if (s.length < 3) return '';

  const words = s.split(' ');
  const clipped = words.length > 7 ? [...words.slice(0, 7), '…'] : words;
  return clipped
    .map((w, i) =>
      i > 0 && SMALL_WORDS.has(w.toLowerCase())
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(' ');
}

// Reads Milo's response as an outline:
//   1. **Clarify the why**        <- a step
//      - Write down the goal      <- a smaller detail inside step 1
//      - Set up a sample          <- a smaller detail inside step 1
//   2. Gather materials           <- the next step
// Only top-level items become steps, so a 5-step plan stays 5 steps.
export const parseMiloSteps = (
  text: string
): { title: string; steps: { title: string; details: string[] }[] } | null => {
  text = normalizeMiloText(text);
  type Line =
    | { kind: 'num' | 'bullet'; indent: number; text: string }
    | { kind: 'heading'; text: string }
    | { kind: 'para'; indent: number };

  const lines: Line[] = text
    .replace(/\r/g, '')
    .split('\n')
    .map((raw): Line | null => {
      const line = raw.replace(/\t/g, '  ').replace(/^(\s*)\*\*(?=\d+[.)])/, '$1');
      if (!line.trim()) return null;
      const heading = line.match(/^\s*#{1,6}\s+(.+)$/);
      if (heading) return { kind: 'heading', text: heading[1] };
      const num = line.match(/^(\s*)\d+[.)]\s+(.+)$/);
      if (num) return { kind: 'num', indent: num[1].length, text: num[2] };
      const bullet = line.match(/^(\s*)[-*+•]\s+(.+)$/);
      if (bullet) return { kind: 'bullet', indent: bullet[1].length, text: bullet[2] };
      return { kind: 'para', indent: line.length - line.trimStart().length };
    })
    .filter((l): l is Line => l !== null);

  const listItems = lines.filter(
    (l): l is { kind: 'num' | 'bullet'; indent: number; text: string } =>
      l.kind === 'num' || l.kind === 'bullet'
  );
  const nums = listItems.filter((l) => l.kind === 'num');
  const headings = lines.filter((l) => l.kind === 'heading');

  // Decide what counts as a top-level step
  let isTop: (l: Line) => boolean;
  if (nums.length > 0) {
    const minIndent = Math.min(...nums.map((n) => n.indent));
    isTop = (l) => l.kind === 'num' && l.indent <= minIndent + 1;
  } else if (headings.length >= 2 && listItems.length > 0) {
    isTop = (l) => l.kind === 'heading';
  } else if (listItems.length > 0) {
    const minIndent = Math.min(...listItems.map((n) => n.indent));
    isTop = (l) => l.kind === 'bullet' && l.indent <= minIndent + 1;
  } else {
    return null;
  }

  const steps: { title: string; details: string[] }[] = [];
  let current: { title: string; details: string[] } | null = null;
  for (const l of lines) {
    if (isTop(l)) {
      current = { title: (l as { text: string }).text, details: [] };
      steps.push(current);
    } else if (l.kind === 'heading' || (l.kind === 'para' && l.indent === 0)) {
      // A new section or closing paragraph ends the current step
      current = null;
    } else if (current && (l.kind === 'num' || l.kind === 'bullet')) {
      const detail = cleanStepText(l.text);
      if (detail) current.details.push(detail);
    }
  }

  const cleaned = steps
    .map((st) => ({ title: cleanStepText(st.title), details: st.details }))
    .filter((st) => st.title.length > 0);
  if (cleaned.length === 0) return null;

  return { title: extractSmartTitle(text), steps: cleaned };
};

// Heading comes from the user's original request when given (e.g. "Build a Rocket"),
// otherwise from Milo's text.
export const parseAndSaveMiloTasks = (
  uid: string,
  text: string,
  userRequest?: string
): TaskItem | null => {
  const parsed = parseMiloSteps(text);
  if (!parsed) return null;
  const title = (userRequest && titleFromRequest(userRequest)) || parsed.title;
  return createTask(uid, title, parsed.steps);
};
