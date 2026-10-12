import Groq from 'groq-sdk';

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
`;

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

export async function askMilo(userPrompt: string): Promise<string> {
  try {
    const activeModel = await getAvailableModel();

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: MILO_SYSTEM_INSTRUCTION },
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