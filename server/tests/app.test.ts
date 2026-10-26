import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type Anthropic from '@anthropic-ai/sdk';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { claudeAdvice, type AdviceGenerator } from '../src/advice.ts';
import { createApp } from '../src/app.ts';
import { openDatabase } from '../src/db.ts';

let server: Server;
let base: string;
let adviceCalls: { summary: string; question: string; language: string }[];
let adviceResult: Awaited<ReturnType<AdviceGenerator>>;

beforeEach(async () => {
  adviceCalls = [];
  adviceResult = { ok: true, text: 'Belle régularité, continue !' };
  const app = createApp({
    db: openDatabase(':memory:'),
    advice: async (input) => {
      adviceCalls.push(input);
      return adviceResult;
    },
    allowedOrigins: ['http://localhost:5173'],
    adviceDailyLimit: 2,
    now: () => new Date('2026-10-25T10:00:00Z'),
  });
  server = createServer((req, res) => void app(req, res));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function call(method: string, path: string, body?: unknown, token?: string) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? (JSON.parse(text) as Record<string, unknown>) : undefined,
  };
}

async function account(name: string): Promise<string> {
  const { body } = await call('POST', '/v1/accounts', { name });
  return (body as { token: string }).token;
}

describe('challenges between friends', () => {
  it('creates a group, lets a friend join with the code, ranks by regularity', async () => {
    const thibaut = await account('Thibaut');
    const ami = await account('Léa');
    const created = await call('POST', '/v1/groups', { name: 'Les potes' }, thibaut);
    expect(created.status).toBe(201);
    const code = (created.body as { code: string }).code;
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    expect((await call('POST', '/v1/groups/join', { code: code.toLowerCase() }, ami)).status).toBe(
      200,
    );
    await call(
      'PUT',
      '/v1/stats',
      { weekStart: '2026-10-19', sessions: 3, weeksOnPace: 2 },
      thibaut,
    );
    await call('PUT', '/v1/stats', { weekStart: '2026-10-19', sessions: 4, weeksOnPace: 5 }, ami);

    const id = (created.body as { id: string }).id;
    const board = await call(
      'GET',
      `/v1/groups/${id}/leaderboard?week=2026-10-19`,
      undefined,
      thibaut,
    );
    expect(board.body?.members).toEqual([
      { name: 'Léa', me: false, sessions: 4, weeksOnPace: 5 },
      { name: 'Thibaut', me: true, sessions: 3, weeksOnPace: 2 },
    ]);
  });

  it('keeps loads hidden unless the user shares their records', async () => {
    const thibaut = await account('Thibaut');
    const group = await call('POST', '/v1/groups', { name: 'Solo' }, thibaut);
    await call(
      'PUT',
      '/v1/stats',
      {
        weekStart: '2026-10-19',
        sessions: 3,
        weeksOnPace: 1,
        records: [{ name: 'Presse', load: '107 kg × 10' }],
      },
      thibaut,
    );
    const id = (group.body as { id: string }).id;
    const board = await call(
      'GET',
      `/v1/groups/${id}/leaderboard?week=2026-10-19`,
      undefined,
      thibaut,
    );
    expect(board.body?.members).toEqual([
      expect.objectContaining({ records: [{ name: 'Presse', load: '107 kg × 10' }] }),
    ]);
  });

  it('refuses unknown tokens, foreign groups and bad input', async () => {
    expect((await call('GET', '/v1/groups', undefined, 'faux')).status).toBe(401);
    const a = await account('A');
    const b = await account('B');
    const group = await call('POST', '/v1/groups', { name: 'Privé' }, a);
    const id = (group.body as { id: string }).id;
    expect(
      (await call('GET', `/v1/groups/${id}/leaderboard?week=2026-10-19`, undefined, b)).status,
    ).toBe(404);
    expect((await call('POST', '/v1/accounts', { name: '' })).status).toBe(400);
    expect((await call('POST', '/v1/accounts', { name: 'x'.repeat(41) })).status).toBe(400);
    expect(
      (await call('PUT', '/v1/stats', { weekStart: 'hier', sessions: 3, weeksOnPace: 1 }, a))
        .status,
    ).toBe(400);
    expect((await call('POST', '/v1/groups/join', { code: 'ZZZZZZ' }, a)).status).toBe(404);
  });

  it('deletes everything about an account on request', async () => {
    const a = await account('A');
    await call('POST', '/v1/groups', { name: 'Seul' }, a);
    expect((await call('DELETE', '/v1/accounts/me', undefined, a)).status).toBe(204);
    expect((await call('GET', '/v1/groups', undefined, a)).status).toBe(401);
  });

  it('answers the app origin only (CORS)', async () => {
    const allowed = await fetch(`${base}/v1/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    const other = await fetch(`${base}/v1/health`, { headers: { Origin: 'https://evil.example' } });
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('advice in natural language', () => {
  it('passes the summary, the question and the language, and returns the advice', async () => {
    const token = await account('Thibaut');
    const response = await call(
      'POST',
      '/v1/advice',
      { summary: '3 séances : Push, Pull, Legs', question: 'Je stagne au DC', language: 'fr-FR' },
      token,
    );
    expect(response).toEqual({ status: 200, body: { advice: 'Belle régularité, continue !' } });
    expect(adviceCalls).toEqual([
      {
        summary: '3 séances : Push, Pull, Legs',
        question: 'Je stagne au DC',
        language: 'français',
      },
    ]);
  });

  it('limits the number of advice requests per day', async () => {
    const token = await account('Thibaut');
    await call('POST', '/v1/advice', { summary: 'a' }, token);
    await call('POST', '/v1/advice', { summary: 'b' }, token);
    expect((await call('POST', '/v1/advice', { summary: 'c' }, token)).status).toBe(429);
  });

  it('reports a refusal or an unavailable service', async () => {
    const token = await account('Thibaut');
    adviceResult = { ok: false, reason: 'refused' };
    expect((await call('POST', '/v1/advice', { summary: 'a' }, token)).status).toBe(422);
    adviceResult = { ok: false, reason: 'unavailable' };
    expect((await call('POST', '/v1/advice', { summary: 'b' }, token)).status).toBe(503);
  });

  it('rejects empty or oversized summaries', async () => {
    const token = await account('Thibaut');
    expect((await call('POST', '/v1/advice', { summary: '' }, token)).status).toBe(400);
    expect((await call('POST', '/v1/advice', { summary: 'x'.repeat(4001) }, token)).status).toBe(
      400,
    );
  });
});

describe('Claude call', () => {
  function fakeClient(response: object, capture: object[]): Anthropic {
    return {
      beta: {
        messages: {
          create: async (params: object) => {
            capture.push(params);
            return response;
          },
        },
      },
    } as unknown as Anthropic;
  }

  it('uses the current Opus with the server-side fallback, and joins the text blocks', async () => {
    const capture: object[] = [];
    const advice = claudeAdvice(
      fakeClient(
        {
          stop_reason: 'end_turn',
          content: [
            { type: 'thinking', thinking: '' },
            { type: 'text', text: 'Bravo.' },
          ],
        },
        capture,
      ),
    );
    expect(await advice({ summary: 's', question: '', language: 'français' })).toEqual({
      ok: true,
      text: 'Bravo.',
    });
    expect(capture[0]).toMatchObject({
      model: 'claude-opus-5-5',
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  });

  it('turns a refusal into a clear answer instead of empty text', async () => {
    const advice = claudeAdvice(fakeClient({ stop_reason: 'refusal', content: [] }, []));
    expect(await advice({ summary: 's', question: '', language: 'français' })).toEqual({
      ok: false,
      reason: 'refused',
    });
  });
});
