import { afterEach, describe, expect, test, vi } from 'vitest';
import { api, ApiError } from '../api/client';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => vi.restoreAllMocks());

describe('api client', () => {
  test('sends credentials and builds query strings without empty values', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, { ok: true }));
    await api('/resources', { params: { q: 'jwt', types: ['notes', 'tips'], empty: '', none: undefined } });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/resources?q=jwt&types=notes%2Ctips');
    expect(opts.credentials).toBe('include');
  });

  test('refreshes the session once on 401 and retries', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(401, { error: 'Please log in' }))
      .mockResolvedValueOnce(json(200, { user: {} }))
      .mockResolvedValueOnce(json(200, { reviews: [] }));
    const data = await api('/me/reviews');
    expect(data).toEqual({ reviews: [] });
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/refresh');
  });

  test('throws ApiError with field errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json(400, { error: 'Invalid input', details: [{ path: 'email', message: 'Enter a valid email' }] }),
    );
    const err = await api('/auth/register', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.fieldErrors()).toEqual({ email: 'Enter a valid email' });
  });
});
