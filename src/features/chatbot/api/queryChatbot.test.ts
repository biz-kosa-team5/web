import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveApiUrl } from '../../map/api/resolveApiUrl';
import { queryChatbot } from './queryChatbot';

describe('queryChatbot API 어댑터', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('질문을 chatbot query endpoint로 POST한다', async () => {
    const payload = { success: true, answer: 'ok' };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    await expect(queryChatbot('서울 아파트 알려줘')).resolves.toBe(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      resolveApiUrl('/api/v1/chatbot/query'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: '서울 아파트 알려줘' }),
      }),
    );
  });

  it('success false payload도 JSON 객체면 그대로 반환한다', async () => {
    const payload = { success: false, error: 'handler failed' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));

    await expect(queryChatbot('실패 케이스')).resolves.toBe(payload);
  });

  it('non-OK 응답은 ProblemDetail을 포함해 reject한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        errorResponse(500, {
          detail: 'Chatbot unavailable.',
        }),
      ),
    );

    await expect(queryChatbot('질문')).rejects.toThrow(
      'Failed to query chatbot: 500 Chatbot unavailable.',
    );
  });

  it('객체가 아닌 payload는 invalid response로 reject한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(['not-object'])));

    await expect(queryChatbot('질문')).rejects.toThrow(
      'Invalid chatbot response: expected a JSON object',
    );
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response;
}

function errorResponse(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}
