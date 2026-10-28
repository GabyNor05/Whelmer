import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as taskService from '../services/taskService';
import type { TaskItem } from '../services/taskService';

/**
 * Live view of the signed-in user's tasks at users/{uid}/tasks, plus actions
 * bound to that uid. Every screen that calls this sees the same Firestore data,
 * and local writes show up instantly through the snapshot listener.
 */
export function useTasks() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setTasks([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsubscribe = taskService.subscribeToTasks(
      uid,
      (next) => {
        setTasks(next);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
    return unsubscribe;
  }, [uid]);

  const actions = useMemo(
    () => ({
      createTask: (title: string, steps?: string[]) =>
        uid ? taskService.createTask(uid, title, steps) : null,
      saveMiloResponse: (text: string) =>
        uid ? taskService.parseAndSaveMiloTasks(uid, text) : null,
      toggleTaskCompleted: (task: TaskItem) => {
        if (uid) taskService.toggleTaskCompleted(uid, task);
      },
      toggleSubStep: (task: TaskItem, stepId: string) => {
        if (uid) taskService.toggleSubStep(uid, task, stepId);
      },
      addSubStep: (task: TaskItem, title: string) => {
        if (uid) taskService.addSubStep(uid, task, title);
      },
      deleteSubStep: (task: TaskItem, stepId: string) => {
        if (uid) taskService.deleteSubStep(uid, task, stepId);
      },
      deleteTask: (taskId: string) => {
        if (uid) taskService.deleteTask(uid, taskId);
      },
    }),
    [uid]
  );

  return { tasks, isLoading, error, ...actions };
}
