import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, Night, ReadNight, RunLine } from './types.js';

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'] satisfies JobStatus[];

function parseLine(line: string): RunLine | null {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
  if (typeof o.status !== 'string' || !STATUSES.includes(o.status)) return null;
  if (o.owner !== null && typeof o.owner !== 'string') return null;
  if (o.error !== undefined && typeof o.error !== 'string') return null;
  return { at: o.at, job: o.job, status: o.status as JobStatus, owner: o.owner, error: o.error };
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null; // path safety
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;

  const lines = readFileSync(file, 'utf8').split('\n');
  if (lines.at(-1) === '') lines.pop(); // trailing newline is not a bad line
  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const raw of lines) {
    const line = parseLine(raw);
    if (!line) {
      badLines++;
      continue;
    }
    const row = byJob.get(line.job);
    // ponytail: file order = time order; owner taken from the job's last line
    byJob.set(line.job, {
      job: line.job,
      owner: line.owner,
      runs: (row?.runs ?? 0) + 1,
      retries: (row?.retries ?? 0) + (line.status === 'retry' ? 1 : 0),
      lastStatus: line.status,
      lastError: line.error ?? null,
      firstAt: row?.firstAt ?? line.at,
      lastAt: line.at,
    });
  }

  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, badLines } satisfies Night;
};
