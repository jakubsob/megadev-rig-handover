import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const JOBS = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];

let tmp: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-runs-'));
  fs.copyFileSync('runs/2026-10-28.jsonl', path.join(tmp, '2026-10-28.jsonl'));
  fs.writeFileSync(path.join(tmp, '2026-10-30.jsonl'), '');
  fs.writeFileSync(
    path.join(tmp, '2026-10-31.jsonl'),
    '{"at":"2026-10-31T23:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}\nnot json\n',
  );
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: tmp });
});

afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

const json = async (night: string) => {
  const res = await app.request(`/api/digest/${night}`);
  return { res, body: (await res.json()) as Night };
};

describe('digest routes', () => {
  it('serves a night as page and JSON', async () => {
    const page = await app.request('/digest/2026-10-28');
    const html = await page.text();
    expect(page.status).toBe(200);
    for (const job of JOBS) expect(html).toContain(job);

    const { res, body } = await json('2026-10-28');
    expect(res.status).toBe(200);
    expect(body.rows).toHaveLength(5);
    expect(body.badLines).toBe(1);
  });

  it('page and JSON list jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    const { body } = await json('2026-10-28');
    const jobs = body.rows.map((r) => r.job);
    const positions = jobs.map((j) => html.indexOf(j));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/2026-01-01')).status).toBe(404);
    const { res } = await json('2026-01-01');
    expect(res.status).toBe(404);
  });

  it('empty night: "nothing ran", no rows', async () => {
    const page = await app.request('/digest/2026-10-30');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const { body } = await json('2026-10-30');
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('bad-line night still renders and counts the bad line', async () => {
    expect((await app.request('/digest/2026-10-31')).status).toBe(200);
    const { body } = await json('2026-10-31');
    expect(body.rows).toHaveLength(1);
    expect(body.badLines).toBe(1);
  });
});
