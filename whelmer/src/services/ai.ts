import Groq from 'groq-sdk';
import type { User as UserProfile } from '../types/user';

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
`;

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
  profile?: Partial<UserProfile> | null
): Promise<string> {
  try {
    const activeModel = await getAvailableModel();

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: MILO_SYSTEM_INSTRUCTION + buildPersonalContext(profile) },
        { role: 'user', content: userPrompt },
      ],
      model: activeModel,
      temperature: 0.7,
      max_tokens: 500,
    });

    return (
      completion.choices[0]?.message?.content ||
      "I'm here with you. Let's take a quick breath and try that again."
    );
  } catch (error: any) {
    console.error('Error calling Groq API:', error);
    return "I couldn't connect right now, but take your time. Let's try again in a moment.";
  }
}