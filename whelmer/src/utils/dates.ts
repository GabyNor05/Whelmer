// src/utils/dates.ts
// Small, dependency-free date helpers (no Intl needed, so output is identical on every phone)

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const dayDiff = (a: Date, b: Date) =>
  Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);

export const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const formatDay = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

// "Fri 31 Oct, 18:00"
export const formatDateTime = (ms: number) => {
  const d = new Date(ms);
  return `${formatDay(d)}, ${formatTime(d)}`;
};

// "today", "tomorrow", "in 3 days", "on Fri 7 Nov", gentle wording when it's passed
export const relativeDay = (ms: number, now = new Date()) => {
  const d = new Date(ms);
  if (d.getTime() < now.getTime()) return 'date has passed';
  const diff = dayDiff(d, now);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff < 7) return `in ${diff} days`;
  return `on ${formatDay(d)}`;
};

// "today at 18:00" / "tomorrow at 09:00" / "on Fri 7 Nov at 14:00"
export const duePhrase = (ms: number, now = new Date()) => {
  const d = new Date(ms);
  const diff = dayDiff(d, now);
  const at = formatTime(d);
  if (diff === 0) return `today at ${at}`;
  if (diff === 1) return `tomorrow at ${at}`;
  return `on ${formatDay(d)} at ${at}`;
};
