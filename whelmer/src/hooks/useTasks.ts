import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as taskService from '../services/taskService';
import type { TaskItem } from '../services/taskService';
import { celebrate } from '../utils/haptics';

/**
 * Live view of the signed-in user's tasks at users/{uid}/tasks, plus actions
 * bound to that uid. Every screen that calls this sees the same Firestore data,
 * and local writes show up instantly through the snapshot listener.
 */
export function useTasks() {
  const { user, profile } = useAuth();
  const uid = user?.uid ?? null;
  const hapticsOn = profile?.preferences?.haptics ?? true;

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
      createTask: (title: string, steps?: taskService.StepInput[]) =>
        uid ? taskService.createTask(uid, title, steps) : null,
      saveMiloResponse: (text: string, userRequest?: string) =>
        uid ? taskService.parseAndSaveMiloTasks(uid, text, userRequest) : null,
      toggleTaskCompleted: (task: TaskItem) => {
        if (!uid) return;
        if (!task.completed) celebrate(hapticsOn);
        taskService.toggleTaskCompleted(uid, task);
      },
      toggleSubStep: (task: TaskItem, stepId: string) => {
        if (!uid) return;
        if (taskService.wouldCompleteTask(task, stepId)) celebrate(hapticsOn);
        taskService.toggleSubStep(uid, task, stepId);
      },
      toggleStepDetail: (task: TaskItem, stepId: string, detailId: string) => {
        if (!uid) return;
        if (taskService.wouldCompleteTask(task, stepId, detailId)) celebrate(hapticsOn);
        taskService.toggleStepDetail(uid, task, stepId, detailId);
      },
      addSubStep: (task: TaskItem, title: string) => {
        if (uid) taskService.addSubStep(uid, task, title);
      },
      renameSubStep: (task: TaskItem, stepId: string, title: string) => {
        if (uid) taskService.renameSubStep(uid, task, stepId, title);
      },
      deleteSubStep: (task: TaskItem, stepId: string) => {
        if (uid) taskService.deleteSubStep(uid, task, stepId);
      },
      addStepDetail: (task: TaskItem, stepId: string, title: string) => {
        if (uid) taskService.addStepDetail(uid, task, stepId, title);
      },
      deleteStepDetail: (task: TaskItem, stepId: string, detailId: string) => {
        if (uid) taskService.deleteStepDetail(uid, task, stepId, detailId);
      },
      updateTaskFields: (
        taskId: string,
        fields: Parameters<typeof taskService.updateTaskFields>[2]
      ) => {
        if (uid) taskService.updateTaskFields(uid, taskId, fields);
      },
      deleteTask: (taskId: string) => {
        if (uid) taskService.deleteTask(uid, taskId);
      },
    }),
    [uid, hapticsOn]
  );

  return { tasks, isLoading, error, ...actions };
}
