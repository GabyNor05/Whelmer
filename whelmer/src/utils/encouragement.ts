// src/utils/encouragement.ts
// Warm, shame-free progress messages. Every bit of progress counts.
import type { TaskItem } from '../services/taskService';

export const countSteps = (task: TaskItem) => ({
  done: task.subSteps.filter((s) => s.completed).length,
  total: task.subSteps.length,
});

// Banner on the Tasks screen
export function tasksBannerMessage(tasks: TaskItem[]): { headline: string; sub: string } {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const stepsDone = tasks.reduce((n, t) => n + countSteps(t).done, 0);

  if (total === 0) {
    return { headline: 'A fresh start 🌱', sub: 'Add one task, or ask Milo to break something down. Small is perfect.' };
  }
  if (done === total) {
    return { headline: 'Everything is done! 🎉', sub: 'Be proud of yourself. You showed up and followed through.' };
  }
  const stepLine =
    stepsDone > 0 ? `You've ticked off ${stepsDone} step${stepsDone === 1 ? '' : 's'} so far. That all counts.` : '';
  if (done === 0) {
    return {
      headline: stepsDone > 0 ? 'You\'re making progress 💛' : 'One tiny step is enough to begin 💛',
      sub: stepLine || 'Pick the easiest step and start there. No rush.',
    };
  }
  return {
    headline: `${done} of ${total} tasks finished. Well done! 🌿`,
    sub: stepLine || 'Keep going at your own pace.',
  };
}

// Line under the progress bar on a task's own screen
export function taskProgressMessage(task: TaskItem): string {
  const { done, total } = countSteps(task);
  if (total === 0) return 'Add a first small step to get going.';
  if (done === total) return 'You finished this! Every single step counted. 🎉';
  if (done === 0) return 'Start with whichever step feels easiest. That still counts.';
  if (done === 1) return 'First step done. That\'s often the hardest one! 🌱';
  if (total - done === 1) return 'Just one step left. You\'re so close! ✨';
  return `${done} steps done. Look how far you've come. 🌿`;
}
