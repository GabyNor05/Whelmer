// src/utils/miloText.ts
// Turns whatever the AI returns into the simple Markdown the app can show and parse:
// tables become numbered steps with bullets, <br> becomes a line break, emoji numbers
// like 1️⃣ become plain text. Used by the chat bubbles, "+ Task" and Copy.

const KEYCAP = /([0-9])️?⃣/g; // 1️⃣ -> 1
const CELL_BULLET = /^\s*(?:[•\-*]|\d+[.)])\s*/;

const splitCell = (cell: string) =>
  cell
    .split(/<br\s*\/?>|\n|\s•\s/i)
    .map((s) => s.replace(CELL_BULLET, '').trim())
    .filter(Boolean);

function tableToList(rows: string[][]): string[] {
  const out: string[] = [];
  rows.forEach((cells, i) => {
    const [first = '', ...rest] = cells;
    // Skip a header row such as "| Step | What to do |"
    if (i === 0 && !/^\**\s*\d/.test(first) && rows.length > 1) return;
    const title = first.replace(/<br\s*\/?>/gi, ' ').replace(/\*\*/g, '').trim();
    const numbered = title.match(/^\**\s*(\d+)[.)]\s*(.*)$/);
    out.push(numbered ? `${numbered[1]}. ${numbered[2]}` : `- ${title}`);
    for (const cell of rest) for (const line of splitCell(cell)) out.push(`   - ${line}`);
  });
  return out;
}

export function normalizeMiloText(raw: string): string {
  const lines = raw
    .replace(/\r/g, '')
    .replace(/^(\s*)[0-9]\uFE0F?\u20E3\s*/gm, '$1### ') // "1️⃣ Title" at a line start -> heading
    .replace(KEYCAP, '$1')
    .replace(/<br\s*\/?>/gi, (m, offset, full) => {
      // Inside a table row keep the marker so the cell can be split; elsewhere make a new line
      const lineStart = full.lastIndexOf('\n', offset) + 1;
      return full.slice(lineStart, offset).trimStart().startsWith('|') ? m : '\n';
    })
    .replace(/<\/?(p|div|span|b|strong|i|em)\b[^>]*>/gi, '')
    .split('\n');

  const out: string[] = [];
  let table: string[][] = [];
  const flush = () => {
    if (table.length) out.push(...tableToList(table));
    table = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('|')) {
      if (/^\|?[\s:|-]+\|?$/.test(t)) continue; // |-----|-----| separator
      table.push(t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      continue;
    }
    flush();
    out.push(line);
  }
  flush();
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
