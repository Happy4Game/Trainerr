/**
 * Client of the optional Trainerr server (challenges, AI advice). Nothing is
 * sent unless the user set a server and created an account in the settings.
 */
export interface Group {
  readonly id: string;
  readonly name: string;
  readonly code: string;
}

export interface LeaderboardMember {
  readonly name: string;
  readonly me: boolean;
  readonly sessions: number;
  readonly weeksOnPace: number;
  readonly records?: readonly { name: string; load: string }[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function createApi(baseUrl: string, token?: string) {
  const root = baseUrl.replace(/\/+$/, '');

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${root}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new ApiError(0, 'network');
    }
    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      // Not our server (captive portal, proxy page...).
      throw new ApiError(response.status, 'server_error');
    }
    if (!response.ok) {
      const code = (data as { error?: string } | undefined)?.error ?? 'server_error';
      throw new ApiError(response.status, code);
    }
    return data as T;
  }

  return {
    createAccount: (name: string) =>
      request<{ id: string; token: string }>('POST', '/v1/accounts', { name }),
    deleteAccount: () => request<undefined>('DELETE', '/v1/accounts/me'),
    groups: async () => (await request<{ groups: Group[] }>('GET', '/v1/groups')).groups,
    createGroup: (name: string) => request<Group>('POST', '/v1/groups', { name }),
    joinGroup: (code: string) => request<Group>('POST', '/v1/groups/join', { code }),
    leaderboard: async (groupId: string, weekStart: string) =>
      (
        await request<{ members: LeaderboardMember[] }>(
          'GET',
          `/v1/groups/${encodeURIComponent(groupId)}/leaderboard?week=${weekStart}`,
        )
      ).members,
    putStats: (stats: {
      weekStart: string;
      sessions: number;
      weeksOnPace: number;
      records?: readonly { name: string; load: string }[];
    }) => request<undefined>('PUT', '/v1/stats', stats),
    advice: async (summary: string, question: string, language: string) =>
      (await request<{ advice: string }>('POST', '/v1/advice', { summary, question, language }))
        .advice,
  };
}
