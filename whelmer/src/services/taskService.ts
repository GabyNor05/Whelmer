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

export const globalTasks: TaskItem[] = [];

/**
 * Extracts a concise, clean parent title from Milo's message.
 */
function extractSmartTitle(text: string): string {
  // 1. Try to find explicit action headers in bold markdown within the steps
  // e.g., "**Gather inspiration (5-10 min)**" -> "Gather Inspiration"
  const boldMatch = text.match(/\*\*(.*?)\*\*/);
  if (boldMatch && boldMatch[1]) {
    const cleanHeader = boldMatch[1]
      .replace(/\s*\(\d+.*?\)/g, '') // remove time hints like (5-10 min)
      .replace(/:\s*$/, '')          // remove trailing colons
      .trim();

    if (cleanHeader.length > 2 && cleanHeader.length < 40) {
      // If it's a specific step title, format it as an overarching topic or action
      return cleanHeader;
    }
  }

  // 2. Filter out conversational intro lines (e.g. "Hey there!", "Here's a gentle roadmap", etc.)
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

export const parseAndSaveMiloTasks = (text: string): TaskItem[] => {
  // Match numbered items (1.) or bullet points (-, *)
  const stepMatches = text.match(/(?:^|\n)\s*(?:\d+[\.\)]|[-*])\s*(.+)/g);

  if (!stepMatches || stepMatches.length === 0) return [];

  const subSteps: SubStep[] = stepMatches.map((stepStr, idx) => {
    const cleanText = stepStr
      .replace(/^\s*(?:\d+[\.\)]|[-*])\s*/, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .trim();

    return {
      id: `${Date.now()}-${idx}`,
      title: cleanText,
      completed: false,
    };
  });

  const smartTitle = extractSmartTitle(text);

  const newTaskGroup: TaskItem = {
    id: `${Date.now()}`,
    parentTitle: smartTitle,
    completed: false,
    createdAt: Date.now(),
    subSteps,
  };

  globalTasks.unshift(newTaskGroup);
  return [newTaskGroup];
};