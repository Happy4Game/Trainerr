import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApi } from '@/data/remote/api';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  });
  return calls;
}

describe('server client', () => {
  it('sends the token and the JSON body', async () => {
    const calls = stubFetch(200, { id: 'g', name: 'Potes', code: 'ABC234' });
    const api = createApi('https://serveur.example/', 'jeton');
    expect(await api.joinGroup('abc234')).toEqual({ id: 'g', name: 'Potes', code: 'ABC234' });
    expect(calls[0]?.url).toBe('https://serveur.example/v1/groups/join');
    expect(calls[0]?.init.headers).toMatchObject({ Authorization: 'Bearer jeton' });
    expect(calls[0]?.init.body).toBe('{"code":"abc234"}');
  });

  it('turns server errors into typed errors', async () => {
    stubFetch(429, { error: 'daily_limit' });
    await expect(createApi('https://s').advice('r', '', 'fr-FR')).rejects.toEqual(
      new ApiError(429, 'daily_limit'),
    );
  });

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('offline');
    });
    await expect(createApi('https://s').groups()).rejects.toMatchObject({
      status: 0,
      code: 'network',
    });
  });
});
