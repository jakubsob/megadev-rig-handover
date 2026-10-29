import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';

// Line-level counts per status (not rows). Bad lines are skipped.
export function countNight(runsDir: string, night: string): { ok: number; retry: number; fail: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;
  const c = { ok: 0, retry: 0, fail: 0 };
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = parseLine(raw);
    if (line) c[line.status]++;
  }
  return c;
}
