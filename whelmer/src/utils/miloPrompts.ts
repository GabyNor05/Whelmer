// src/utils/miloPrompts.ts
// Milo's check-in line on Home. One prompt per day, rotating through the list, with a few
// lines that only appear at a fitting time of day. Stays the same all day so it isn't jumpy.

const ANY_TIME = [
  'Feeling stuck today? Let’s check in.',
  'What’s one tiny thing we could start together?',
  'Brain feeling busy? Let’s untangle it.',
  'No pressure today. Just one small step?',
  'Got a big task looming? I can make it smaller.',
  'How’s your energy today? Let’s plan around it.',
  'Want to talk through what’s on your mind?',
  'You don’t have to do it all. Pick one thing?',
  'Overwhelmed? Let’s find the easiest place to start.',
  'Something you keep putting off? Let’s break it down.',
];

const MORNING = ['Good morning! Want to plan a gentle start?'];
const AFTERNOON = ['Afternoon slump? A short focus session might help.'];
const EVENING = ['Winding down? Let’s note what you got done today.'];

const dayNumber = (d: Date) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);

export function miloCheckInPrompt(now: Date = new Date()): string {
  const h = now.getHours();
  const timed = h >= 5 && h < 11 ? MORNING : h >= 13 && h < 16 ? AFTERNOON : h >= 18 && h < 22 ? EVENING : [];
  const pool = [...ANY_TIME, ...timed];
  return pool[dayNumber(now) % pool.length];
}
