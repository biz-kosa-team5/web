import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveApiUrl } from '../../map/api/resolveApiUrl';
import { queryChatbotStream } from './queryChatbotStream';

describe('queryChatbotStream API 어댑터', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('status, answer_delta, final 이벤트를 fetch stream에서 처리한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([
      sseFrame('status', { label: '질문 분석 중', step: 1, total: 5 }),
      sseFrame('answer_delta', { text: '잠실엘스는 ' }),
      sseFrame('answer_delta', { text: '송파구에 있습니다.' }),
      sseFrame('final', chatbotPayload()),
    ]));
    vi.stubGlobal('fetch', fetchMock);

    const statuses: unknown[] = [];
    let streamedAnswer = '';
    const response = await queryChatbotStream('잠실엘스 위치', {
      onAnswerDelta: (text) => {
        streamedAnswer += text;
      },
      onStatus: (status) => {
        statuses.push(status);
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      resolveApiUrl('/api/v1/chatbot/query/stream'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: '잠실엘스 위치' }),
      }),
    );
    expect(statuses).toEqual([{ label: '질문 분석 중', step: 1, total: 5 }]);
    expect(streamedAnswer).toBe('잠실엘스는 송파구에 있습니다.');
    expect(response).toMatchObject({
      answer: '잠실엘스는 송파구에 있습니다.',
      uiActions: [expect.objectContaining({ id: 'focus_map:complex:1002' })],
      uiArtifacts: [],
      uiSummary: expect.objectContaining({ hasMapFocus: true }),
    });
  });

  it('chunk 경계에서 끊긴 SSE frame을 buffer에 보관했다가 파싱한다', async () => {
    const finalFrame = sseFrame('final', chatbotPayload());
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([
      'event: answer_delta\ndata: {"te',
      'xt":"분할된 "}\n\n',
      'event: answer_delta\ndata: {"text":"응답"}\n\n',
      finalFrame.slice(0, 24),
      finalFrame.slice(24),
    ]));
    vi.stubGlobal('fetch', fetchMock);

    let streamedAnswer = '';
    await queryChatbotStream('질문', {
      onAnswerDelta: (text) => {
        streamedAnswer += text;
      },
    });

    expect(streamedAnswer).toBe('분할된 응답');
  });

  it('final 이벤트가 malformed이면 기존 query endpoint로 fallback한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(streamResponse([sseFrame('final', { success: true })]))
      .mockResolvedValueOnce(jsonResponse({ success: true, answer: 'fallback answer' }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await queryChatbotStream('질문');

    expect(response.answer).toBe('fallback answer');
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/chatbot/query/stream');
    expect(fetchMock.mock.calls[1][0]).toContain('/api/v1/chatbot/query');
  });

  it('stream error 이벤트를 받으면 기존 query endpoint로 fallback한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(streamResponse([
        sseFrame('error', { message: 'AI 집찾기 응답을 불러오지 못했습니다.' }),
      ]))
      .mockResolvedValueOnce(jsonResponse({ success: true, answer: 'legacy answer' }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await queryChatbotStream('질문');

    expect(response.answer).toBe('legacy answer');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return {
    ok: true,
    status: 200,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
  } as Response;
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response;
}

function chatbotPayload() {
  return {
    success: true,
    answer: '잠실엘스는 송파구에 있습니다.',
    uiActions: [
      {
        id: 'focus_map:complex:1002',
        type: 'focus_map',
        label: '잠실엘스 지도 보기',
        autoRun: true,
        priority: 'primary',
        source: 'simple_lookup.location',
        target: {
          kind: 'complex',
          name: '잠실엘스',
          complexId: 1002,
          parcelId: null,
          latitude: 37.5124,
          longitude: 127.0821,
          level: 4,
          openDetail: true,
        },
      },
    ],
    uiArtifacts: [],
    uiSummary: {
      hasMapFocus: true,
      primaryTargetName: '잠실엘스',
      primaryActionLabel: '잠실엘스 지도 보기',
      artifactTypes: [],
    },
  };
}
