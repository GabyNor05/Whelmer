import Groq from 'groq-sdk';
import type { User as UserProfile } from '../types/user';
import type { TaskItem } from './taskService';
import { duePhrase, formatDateTime } from '../utils/dates';

const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

if (!apiKey) {
  console.warn('⚠️ WARNING: EXPO_PUBLIC_GROQ_API_KEY is missing from .env!');
}

const groq = new Groq({ 
  apiKey: apiKey || '', 
  dangerouslyAllowBrowser: true 
});

const MILO_SYSTEM_INSTRUCTION = `
You are Milo, an empathetic, calm, and supportive AI companion for an ADHD task management app called Whelmer.
Your primary job is to help users process task paralysis and overwhelm. 
Speak in a warm, concise, and non-judgmental tone. Never sound pushy or overly clinical.
When asked to break down a task, break it into 3 to 5 bite-sized, low-friction micro-steps.
Format breakdowns as a numbered list (1., 2., 3.). If a step needs smaller actions, put them as
indented "-" bullets under that step, at most 3 per step. Keep step titles short.

Formatting rules (the app renders simple Markdown only):
- Never use tables, HTML tags (such as <br>), code blocks or emoji numbers like 1️⃣.
- Use short paragraphs, **bold**, numbered lists and "-" bullets only.
- Keep replies under about 220 words, and always finish your last sentence.

If the user lists several projects or deadlines at once, do not plan everything in one reply.
Give a one-line order of priority (most urgent first), then micro-steps for the most urgent
project only, and offer to break down the next one when they're ready.

Remember the earlier messages in this conversation. If the user says "try again", "continue"
or "you stopped", carry on from your previous reply instead of starting over.

Safety and honesty:
- You are an AI coach, not a doctor, therapist or medical tool, and you can be wrong.
- Never diagnose, and never give advice about medication, dosages or treatment. For anything
  medical or about mental health treatment, gently suggest speaking to a doctor, psychologist
  or other qualified professional.
- If the user mentions wanting to harm themselves, suicide, or being in danger, respond with
  care, encourage them to contact someone they trust right now and a professional helpline.
  In South Africa this is the SADAG Suicide Crisis Helpline on 0800 567 567, or emergency
  services on 112 from a cellphone. Do not continue with productivity advice in that reply.
`;

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

// ---------------------------------------------------------------------------
// Personalisation from the user's onboarding choices (users/{uid})
// ---------------------------------------------------------------------------

const GOAL_GUIDANCE: Record<UserProfile['primaryGoal'], string> = {
  breakdown:
    'Their main goal is TASK BREAKDOWN. Whenever they mention something to do, offer a short numbered micro-step plan by default. Make step 1 something they can start in under 2 minutes.',
  focus:
    'Their main goal is DEEP FOCUS SESSIONS. Keep plans to 3 steps and frame the work around one focus session. Suggest starting a timer in the Focus Zone and protecting that time from distractions.',
  routines:
    'Their main goal is HABIT ROUTINES. Frame plans as small repeatable routines they can do daily, suggest a consistent time and a cue to anchor the habit, and celebrate consistency over perfection.',
};

const PEAK_LABEL: Record<UserProfile['peakFocusTime'], string> = {
  morning: 'the morning',
  afternoon: 'the afternoon',
  evening: 'the evening',
  night: 'late at night',
  random: 'unpredictable times',
};

const currentPeriod = (): UserProfile['peakFocusTime'] => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
};

const buildPersonalContext = (profile?: Partial<UserProfile> | null): string => {
  if (!profile) return '';
  const lines: string[] = ['About this user (use it naturally, never recite it back):'];

  if (profile.nickname) lines.push(`- Their name is ${profile.nickname}. Use it occasionally, not in every message.`);

  if (profile.primaryGoal && GOAL_GUIDANCE[profile.primaryGoal]) {
    lines.push(`- ${GOAL_GUIDANCE[profile.primaryGoal]}`);
  }

  if (profile.defaultFocusDuration) {
    lines.push(
      `- Their preferred focus session is ${profile.defaultFocusDuration} minutes. Size steps so the first one or two fit inside one session.`
    );
  }

  if (profile.peakFocusTime) {
    const now = currentPeriod();
    if (profile.peakFocusTime === 'random') {
      lines.push('- Their focus comes at unpredictable times, so help them catch a good moment when it shows up rather than planning rigid schedules.');
    } else if (profile.peakFocusTime === now) {
      lines.push(`- They focus best in ${PEAK_LABEL[profile.peakFocusTime]}, and it is that time now. Encourage tackling the hardest step first.`);
    } else {
      lines.push(
        `- They focus best in ${PEAK_LABEL[profile.peakFocusTime]}, but it is currently ${PEAK_LABEL[now]}. Suggest lighter, low-effort steps now and saving the most demanding step for their peak time.`
      );
    }
  }

  return lines.length > 1 ? '\n' + lines.join('\n') : '';
};

// Preferred default model priorities
const PREFERRED_MODELS = [
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
];

async function getAvailableModel(): Promise<string> {
  try {
    const list = await groq.models.list();
    const availableIds = list.data.map((m) => m.id);

    // 1. Try matching one of our preferred model strings
    for (const pref of PREFERRED_MODELS) {
      if (availableIds.includes(pref)) {
        return pref;
      }
    }

    // 2. Fallback: filter out Whisper audio/speech models and pick the first text model
    const textModel = availableIds.find((id) => !id.includes('whisper') && !id.includes('guard'));
    if (textModel) {
      return textModel;
    }
  } catch (err) {
    console.warn('Could not fetch model list automatically, falling back to default:', err);
  }

  return 'llama-3.3-70b-versatile';
}

export async function askMilo(
  userPrompt: string,
  profile?: Partial<UserProfile> | null,
  history: ChatTurn[] = []
): Promise<string> {
  try {
    const activeModel = await getAvailableModel();
    const base = [
      { role: 'system' as const, content: MILO_SYSTEM_INSTRUCTION + buildPersonalContext(profile) },
      // Recent conversation, so "try again" or "continue" makes sense to Milo
      ...history.slice(-12),
      { role: 'user' as const, content: userPrompt },
    ];

    const completion = await groq.chat.completions.create({
      messages: base,
      model: activeModel,
      temperature: 0.7,
      max_tokens: 1200,
    });

    let reply = completion.choices[0]?.message?.content?.trim() || '';

    // If the reply hit the length limit, ask Milo once to finish it off
    if (reply && completion.choices[0]?.finish_reason === 'length') {
      const more = await groq.chat.completions.create({
        messages: [
          ...base,
          { role: 'assistant', content: reply },
          { role: 'user', content: 'Please finish that reply briefly, continuing exactly where you stopped.' },
        ],
        model: activeModel,
        temperature: 0.5,
        max_tokens: 600,
      });
      const rest = more.choices[0]?.message?.content?.trim();
      if (rest) reply = `${reply} ${rest}`;
    }

    return reply || "I'm here with you. Let's take a quick breath and try that again.";
  } catch (error: any) {
    console.error('Error calling Groq API:', error);
    return "I couldn't connect right now, but take your time. Let's try again in a moment.";
  }
}

// ---------------------------------------------------------------------------
// Gentle time plan for a task with a deadline (Task screen -> "Ask Milo for a plan")
// ---------------------------------------------------------------------------

export async function askMiloForTimePlan(
  task: TaskItem,
  profile?: Partial<UserProfile> | null
): Promise<string> {
  const now = new Date();
  const remaining = task.subSteps.filter((s) => !s.completed);
  const done = task.subSteps.length - remaining.length;

  const stepList = remaining.length
    ? remaining
        .map((s, i) => {
          const details = (s.details ?? []).filter((d) => !d.completed).map((d) => d.title);
          return `${i + 1}. ${s.title}${details.length ? ` (smaller steps: ${details.join('; ')})` : ''}`;
        })
        .join('\n')
    : '(all steps are done)';

  const prompt = `Task: "${task.parentTitle}"
Right now it is ${formatDateTime(now.getTime())}.
Deadline: ${task.deadline ? `${formatDateTime(task.deadline)} (${duePhrase(task.deadline, now)})` : 'none set'}.
Steps already done: ${done} of ${task.subSteps.length}.
Steps still to do:
${stepList}

Suggest WHEN to do each remaining step so it is finished comfortably before the deadline.
Rules:
- Start with one short, warm sentence (no pressure, no guilt).
- Then a "-" bullet list, one bullet per step, like: "- **Today, 18:30** · Step title (about 25 min)".
- Use real days and times between now and the deadline. Never schedule between 22:00 and 08:00 unless they are a night owl.
- Prefer their peak focus time for harder steps and keep each sitting within one focus session.
- Leave a buffer before the deadline and include at least one rest break if there are several days.
- If time is very tight, suggest only the single most important step first and say that is okay.
- Under 130 words. No headings.`;

  try {
    const activeModel = await getAvailableModel();
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: MILO_SYSTEM_INSTRUCTION + buildPersonalContext(profile) },
        { role: 'user', content: prompt },
      ],
      model: activeModel,
      temperature: 0.5,
      max_tokens: 450,
    });
    return (
      completion.choices[0]?.message?.content?.trim() ||
      "I couldn't put a plan together just now. Let's try again in a moment."
    );
  } catch (error) {
    console.error('Error calling Groq API (time plan):', error);
    throw error;
  }
}

