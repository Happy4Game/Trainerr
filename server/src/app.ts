import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { DatabaseSync } from 'node:sqlite';
import type { AdviceGenerator } from './advice.ts';

export interface AppOptions {
  readonly db: DatabaseSync;
  readonly advice: AdviceGenerator;
  /** Origins allowed to call the API (the app, the dev server). */
  readonly allowedOrigins: readonly string[];
  readonly adviceDailyLimit?: number;
  readonly now?: () => Date;
}

const MAX_BODY_BYTES = 16 * 1024;
const NAME_MAX = 40;
const SUMMARY_MAX = 4000;
const QUESTION_MAX = 500;
// No easily confused characters (0/O, 1/I).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

function groupCode(): string {
  const bytes = randomBytes(6);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

function cleanName(value: unknown): string {
  if (typeof value !== 'string') throw new HttpError(400, 'invalid_name');
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length === 0 || name.length > NAME_MAX) throw new HttpError(400, 'invalid_name');
  return name;
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'too_large');
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

/** HTTP handler of the challenges and advice API. */
export function createApp(options: AppOptions) {
  const { db } = options;
  const now = options.now ?? (() => new Date());
  const adviceLimit = options.adviceDailyLimit ?? 10;

  function authenticate(req: IncomingMessage): string {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const row = token
      ? (db.prepare('SELECT id FROM account WHERE token_hash = ?').get(hash(token)) as
          { id: string } | undefined)
      : undefined;
    if (!row) throw new HttpError(401, 'unauthorized');
    return row.id;
  }

  function memberOf(groupId: string, accountId: string): void {
    const row = db
      .prepare('SELECT 1 AS ok FROM membership WHERE group_id = ? AND account_id = ?')
      .get(groupId, accountId);
    if (!row) throw new HttpError(404, 'not_found');
  }

  function groupView(groupId: string) {
    return db.prepare('SELECT id, name, code FROM challenge_group WHERE id = ?').get(groupId);
  }

  async function route(req: IncomingMessage, url: URL): Promise<[number, unknown]> {
    const method = req.method ?? 'GET';
    const path = url.pathname;

    if (method === 'GET' && path === '/v1/health') return [200, { ok: true }];

    if (method === 'POST' && path === '/v1/accounts') {
      const body = await readJson(req);
      const id = randomUUID();
      const token = randomBytes(32).toString('hex');
      db.prepare('INSERT INTO account (id, token_hash, name, created_at) VALUES (?, ?, ?, ?)').run(
        id,
        hash(token),
        cleanName(body.name),
        now().toISOString(),
      );
      return [201, { id, token }];
    }

    const accountId = authenticate(req);

    if (method === 'DELETE' && path === '/v1/accounts/me') {
      // Right to erasure: everything about the account goes, memberships and stats included.
      db.prepare('DELETE FROM account WHERE id = ?').run(accountId);
      db.prepare(
        'DELETE FROM challenge_group WHERE id NOT IN (SELECT DISTINCT group_id FROM membership)',
      ).run();
      return [204, undefined];
    }

    if (method === 'POST' && path === '/v1/groups') {
      const body = await readJson(req);
      const id = randomUUID();
      db.prepare(
        'INSERT INTO challenge_group (id, name, code, created_at) VALUES (?, ?, ?, ?)',
      ).run(id, cleanName(body.name), groupCode(), now().toISOString());
      db.prepare('INSERT INTO membership (group_id, account_id) VALUES (?, ?)').run(id, accountId);
      return [201, groupView(id)];
    }

    if (method === 'POST' && path === '/v1/groups/join') {
      const body = await readJson(req);
      const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
      const group = db.prepare('SELECT id FROM challenge_group WHERE code = ?').get(code) as
        { id: string } | undefined;
      if (!group) throw new HttpError(404, 'unknown_code');
      db.prepare('INSERT OR IGNORE INTO membership (group_id, account_id) VALUES (?, ?)').run(
        group.id,
        accountId,
      );
      return [200, groupView(group.id)];
    }

    if (method === 'GET' && path === '/v1/groups') {
      const groups = db
        .prepare(
          `SELECT g.id, g.name, g.code FROM challenge_group g
             JOIN membership m ON m.group_id = g.id WHERE m.account_id = ? ORDER BY g.created_at`,
        )
        .all(accountId);
      return [200, { groups }];
    }

    const leaderboard = /^\/v1\/groups\/([\w-]+)\/leaderboard$/.exec(path);
    if (method === 'GET' && leaderboard) {
      const groupId = leaderboard[1] as string;
      memberOf(groupId, accountId);
      const week = url.searchParams.get('week') ?? '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) throw new HttpError(400, 'invalid_week');
      const rows = db
        .prepare(
          `SELECT a.id, a.name, COALESCE(s.sessions, 0) AS sessions,
                  COALESCE(s.weeks_on_pace, 0) AS weeksOnPace, s.records AS records
             FROM membership m JOIN account a ON a.id = m.account_id
             LEFT JOIN weekly_stats s ON s.account_id = a.id AND s.week_start = ?
            WHERE m.group_id = ?
            ORDER BY weeksOnPace DESC, sessions DESC, a.name`,
        )
        .all(week, groupId) as {
        id: string;
        name: string;
        sessions: number;
        weeksOnPace: number;
        records: string | null;
      }[];
      return [
        200,
        {
          group: groupView(groupId),
          members: rows.map((r) => ({
            name: r.name,
            me: r.id === accountId,
            sessions: r.sessions,
            weeksOnPace: r.weeksOnPace,
            ...(r.records ? { records: JSON.parse(r.records) as unknown } : {}),
          })),
        },
      ];
    }

    if (method === 'PUT' && path === '/v1/stats') {
      const body = await readJson(req);
      const week = typeof body.weekStart === 'string' ? body.weekStart : '';
      const sessions = Number(body.sessions);
      const weeksOnPace = Number(body.weeksOnPace);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) throw new HttpError(400, 'invalid_week');
      if (!Number.isInteger(sessions) || sessions < 0 || sessions > 21) {
        throw new HttpError(400, 'invalid_stats');
      }
      if (!Number.isInteger(weeksOnPace) || weeksOnPace < 0 || weeksOnPace > 1000) {
        throw new HttpError(400, 'invalid_stats');
      }
      // Loads are hidden by default: records are only stored when the app sends them.
      const records = Array.isArray(body.records)
        ? JSON.stringify(body.records.slice(0, 10))
        : null;
      db.prepare(
        `INSERT INTO weekly_stats (account_id, week_start, sessions, weeks_on_pace, records, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (account_id, week_start) DO UPDATE SET sessions = excluded.sessions,
           weeks_on_pace = excluded.weeks_on_pace, records = excluded.records,
           updated_at = excluded.updated_at`,
      ).run(accountId, week, sessions, weeksOnPace, records, now().toISOString());
      return [204, undefined];
    }

    if (method === 'POST' && path === '/v1/advice') {
      const body = await readJson(req);
      const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
      const question = typeof body.question === 'string' ? body.question.trim() : '';
      const language = body.language === 'en-US' ? 'English' : 'français';
      if (!summary || summary.length > SUMMARY_MAX || question.length > QUESTION_MAX) {
        throw new HttpError(400, 'invalid_advice_request');
      }
      const day = now().toISOString().slice(0, 10);
      const used = db
        .prepare('SELECT count FROM advice_usage WHERE account_id = ? AND day = ?')
        .get(accountId, day) as { count: number } | undefined;
      if ((used?.count ?? 0) >= adviceLimit) throw new HttpError(429, 'daily_limit');
      db.prepare(
        `INSERT INTO advice_usage (account_id, day, count) VALUES (?, ?, 1)
         ON CONFLICT (account_id, day) DO UPDATE SET count = count + 1`,
      ).run(accountId, day);
      const result = await options.advice({ summary, question, language });
      if (!result.ok) throw new HttpError(result.reason === 'refused' ? 422 : 503, result.reason);
      return [200, { advice: result.text }];
    }

    throw new HttpError(404, 'not_found');
  }

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const origin = req.headers.origin;
    if (origin && options.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    try {
      const [status, body] = await route(req, new URL(req.url ?? '/', 'http://localhost'));
      if (body === undefined) res.writeHead(status).end();
      else {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(body));
      }
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const code = error instanceof HttpError ? error.code : 'server_error';
      if (status === 500) console.error(error);
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: code }));
    }
  };
}
