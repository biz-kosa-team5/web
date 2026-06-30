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

    await expect(queryChatbot('서울 아파트 알려줘')).resolves.toEqual({
      ...payload,
      uiActions: [],
      uiArtifacts: [],
      uiSummary: null,
    });

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

  it('conversation context가 있으면 request body에 포함한다', async () => {
    const payload = { success: true, answer: 'ok' };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal('fetch', fetchMock);

    await queryChatbot('두 번째 거 최근 1년 흐름도 알려줘', {
      version: 'v1',
      activeComplex: {
        complexId: 1001,
        complexName: '래미안대치팰리스',
      },
      items: [],
      updatedAt: '2026-06-30T00:00:00.000Z',
      expiresAt: '2026-07-07T00:00:00.000Z',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      resolveApiUrl('/api/v1/chatbot/query'),
      expect.objectContaining({
        body: JSON.stringify({
          question: '두 번째 거 최근 1년 흐름도 알려줘',
          conversationContext: {
            version: 'v1',
            activeComplex: {
              complexId: 1001,
              complexName: '래미안대치팰리스',
            },
            items: [],
            updatedAt: '2026-06-30T00:00:00.000Z',
            expiresAt: '2026-07-07T00:00:00.000Z',
          },
        }),
      }),
    );
  });

  it('success false payload도 answer가 있으면 그대로 반환한다', async () => {
    const payload = { success: false, answer: '질문을 처리하지 못했습니다.', error: 'handler failed' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));

    await expect(queryChatbot('실패 케이스')).resolves.toEqual({
      ...payload,
      uiActions: [],
      uiArtifacts: [],
      uiSummary: null,
    });
  });

  it('conversation memory patch를 정규화한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      success: true,
      answer: 'ok',
      conversationMemoryPatch: {
        version: 'v1',
        activeRegion: {
          name: '대치동',
          code: '11680106',
          type: 'neighborhood',
        },
        items: [
          {
            index: 1,
            kind: 'complex',
            complexId: '1001',
            complexName: '래미안대치팰리스',
          },
        ],
        lastHandler: 'simple_lookup',
        lastQueryType: 'region_trade_history',
      },
    })));

    const result = await queryChatbot('대치동 최신 실거래');

    expect(result.conversationMemoryPatch).toMatchObject({
      version: 'v1',
      activeRegion: {
        name: '대치동',
        code: '11680106',
        type: 'neighborhood',
      },
      items: [
        expect.objectContaining({
          index: 1,
          complexId: 1001,
          complexName: '래미안대치팰리스',
        }),
      ],
      lastHandler: 'simple_lookup',
      lastQueryType: 'region_trade_history',
    });
  });

  it('malformed conversation memory patch는 null로 버린다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      success: true,
      answer: 'ok',
      conversationMemoryPatch: {
        version: 'v2',
        items: [],
      },
    })));

    const result = await queryChatbot('질문');

    expect(result.conversationMemoryPatch).toBeNull();
  });

  it('valid focus_map action을 보존한다', async () => {
    const payload = {
      success: true,
      answer: '지도에 표시했습니다.',
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
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));

    const result = await queryChatbot('잠실엘스 위치');

    expect(result.uiActions).toEqual(payload.uiActions);
  });

  it('malformed action은 버린다', async () => {
    const payload = {
      success: true,
      answer: 'ok',
      uiActions: [
        {
          id: 'bad',
          type: 'focus_map',
          label: 'bad',
          target: {
            kind: 'complex',
            latitude: 'not-a-number',
            longitude: 127,
            level: 4,
          },
        },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));

    const result = await queryChatbot('질문');

    expect(result.uiActions).toEqual([]);
  });

  it('comparison artifact를 정규화한다', async () => {
    const payload = {
      success: true,
      answer: 'ok',
      uiArtifacts: [
        {
          id: 'comparison_bar_chart:a:b',
          type: 'comparison_bar_chart',
          title: '단지 비교',
          source: 'comparison.results',
          defaultMetric: 'latestDealAmount',
          metrics: [
            {
              key: 'latestDealAmount',
              label: '최근 거래가',
              unit: '만원',
              direction: 'higher_is_more_expensive',
            },
          ],
          items: [
            {
              name: '잠실엘스',
              complexId: 1002,
              parcelId: null,
              actionId: 'focus_map:complex:1002',
              values: {
                latestDealAmount: 330000,
              },
            },
            {
              name: '래미안대치팰리스',
              complexId: 1001,
              parcelId: null,
              actionId: 'focus_map:complex:1001',
              values: {
                latestDealAmount: '435000',
              },
            },
          ],
        },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(payload)));

    const result = await queryChatbot('비교');

    expect(result.uiArtifacts[0]).toMatchObject({
      type: 'comparison_bar_chart',
      defaultMetric: 'latestDealAmount',
      items: [
        expect.objectContaining({ name: '잠실엘스' }),
        expect.objectContaining({ name: '래미안대치팰리스' }),
      ],
    });
  });

  it('trend artifact를 정규화한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      success: true,
      answer: 'ok',
      uiArtifacts: [
        {
          id: 'trend_line_chart:complex:1002',
          type: 'trend_line_chart',
          title: '잠실엘스 시세 흐름',
          source: 'price_trend.timeseries',
          unit: '만원',
          points: [
            { period: '2025-01', value: '300000', count: 2 },
            { period: '2025-02', value: 310000, count: null },
          ],
        },
      ],
    })));

    const result = await queryChatbot('시세');

    expect(result.uiArtifacts[0]).toMatchObject({
      type: 'trend_line_chart',
      points: [
        { period: '2025-01', value: 300000, count: 2 },
        { period: '2025-02', value: 310000, count: null },
      ],
    });
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
      'Invalid chatbot response: expected a JSON object with string answer',
    );
  });

  it('answer가 없는 payload는 invalid response로 reject한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true })));

    await expect(queryChatbot('질문')).rejects.toThrow(
      'Invalid chatbot response: expected a JSON object with string answer',
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
