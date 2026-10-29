// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type JobStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, once parsed.
export type RunLine = {
  at: string;
  job: string;
  status: JobStatus;
  owner: string | null;
  error?: string;
};

// One row per job. Times keep the offset from the log.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// A night as read: rows sorted by job, plus the lines that didn't parse (counted, never thrown).
export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

// Returns null when runs/<night>.jsonl doesn't exist; an empty file is a Night with no rows.
export type ReadNight = (runsDir: string, night: string) => Night | null;
