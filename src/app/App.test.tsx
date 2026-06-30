import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CHATBOT_HISTORY_STORAGE_KEY } from '../features/chatbot/chatbotHistory';
import { App } from './App';

describe('App public map surface', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
    document.body.innerHTML = '';
  });

  it('renders the map-first shell and calls public marker API only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();

    expect(rootElement.textContent).toContain('홈서치');
    expect(rootElement.textContent).toContain('HomeSearch · 실거래가 인사이트');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/map/regions'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/v1/admin/'))).toBe(false);

    unmount(root);
  });

  it('keeps admin paths on the public map app instead of loading admin clients', async () => {
    window.history.pushState({}, '', '/admin/coordinates');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();

    expect(rootElement.textContent).toContain('홈서치');
    expect(rootElement.textContent).not.toContain('관리자 접근');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/v1/admin/'))).toBe(false);

    unmount(root);
  });

  it('renders chip range filters without a submit apply button', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();

    expect(getButton(rootElement, '세대수')).not.toBeNull();
    expect(getButton(rootElement, '평형')).not.toBeNull();
    expect(getButton(rootElement, '가격')).not.toBeNull();
    expect(getButton(rootElement, '입주년차')).not.toBeNull();
    expect(rootElement.textContent).toContain('초기화');
    expect(Array.from(rootElement.querySelectorAll('button')).some(
      (button) => button.textContent === '적용',
    )).toBe(false);

    unmount(root);
  });

  it('commits complex marker filter ranges as the existing API payload fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp({ initialMapLevel: 4 });
    await flushAsyncState();

    await act(async () => {
      getButton(rootElement, '가격').click();
    });

    const minInput = rootElement.querySelector<HTMLInputElement>('input[aria-label="가격 최소"]');
    const maxInput = rootElement.querySelector<HTMLInputElement>('input[aria-label="가격 최대"]');
    expect(minInput).not.toBeNull();
    expect(maxInput).not.toBeNull();

    await act(async () => {
      setInputValue(minInput!, '10');
      setInputValue(maxInput!, '30');
      window.dispatchEvent(new Event('pointerup'));
      await Promise.resolve();
    });
    await flushAsyncState();

    const markerBody = lastJsonBodyFor(fetchMock, '/api/v1/map/complexes');
    expect(markerBody).toEqual(expect.objectContaining({
      swLat: expect.any(Number),
      swLng: expect.any(Number),
      neLat: expect.any(Number),
      neLng: expect.any(Number),
      priceEokMin: 10,
      priceEokMax: 30,
      pyeongMin: null,
      pyeongMax: null,
      ageMin: null,
      ageMax: null,
      unitMin: null,
      unitMax: null,
    }));

    unmount(root);
  });

  it('resets full range filters back to null marker request fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp({ initialMapLevel: 4 });
    await flushAsyncState();

    await act(async () => {
      getButton(rootElement, '세대수').click();
    });

    const minInput = rootElement.querySelector<HTMLInputElement>('input[aria-label="세대수 최소"]');
    expect(minInput).not.toBeNull();

    await act(async () => {
      setInputValue(minInput!, '500');
      window.dispatchEvent(new Event('pointerup'));
      await Promise.resolve();
    });
    await flushAsyncState();

    await act(async () => {
      getButton(rootElement, '초기화').click();
      await Promise.resolve();
    });
    await flushAsyncState();

    const markerBody = lastJsonBodyFor(fetchMock, '/api/v1/map/complexes');
    expect(markerBody).toEqual(expect.objectContaining({
      pyeongMin: null,
      pyeongMax: null,
      priceEokMin: null,
      priceEokMax: null,
      ageMin: null,
      ageMax: null,
      unitMin: null,
      unitMax: null,
    }));

    unmount(root);
  });

  it('does not mix complex filter fields into region marker requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    const { root } = await renderApp({ initialMapLevel: 10 });
    await flushAsyncState();

    const markerBody = lastJsonBodyFor(fetchMock, '/api/v1/map/regions');
    expect(markerBody).toEqual({
      swLat: expect.any(Number),
      swLng: expect.any(Number),
      neLat: expect.any(Number),
      neLng: expect.any(Number),
      region: 'district',
    });
    expect(markerBody).not.toHaveProperty('priceEokMin');
    expect(markerBody).not.toHaveProperty('unitMin');

    unmount(root);
  });

  it('shows region complexes only after selecting a neighborhood', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(jsonResponse(regionSelectionPayloadForUrl(url))),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp({ initialRegionLoad: true });
    await flushAsyncState();

    expect(rootElement.textContent).not.toContain('강변');
    expect(rootElement.textContent).not.toContain('경남');
    expect(rootElement.textContent).not.toContain('잠원동 53-15');

    await act(async () => {
      getButton(rootElement, '서초구').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushAsyncState();

    expect(rootElement.textContent).toContain('잠원동');
    expect(rootElement.textContent).not.toContain('강변');
    expect(rootElement.textContent).not.toContain('경남');
    expect(rootElement.textContent).not.toContain('잠원동 53-15');

    await act(async () => {
      getButton(rootElement, '잠원동').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushAsyncState();

    expect(rootElement.textContent).toContain('강변');
    expect(rootElement.textContent).toContain('잠원동 53-15');
    expect(rootElement.textContent).not.toContain('경남');
    expect(rootElement.textContent).not.toContain('방배동 1028-1');

    unmount(root);
  });

  it('paginates parent region complexes before filtering selected neighborhood', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(jsonResponse(paginatedRegionSelectionPayloadForUrl(url))),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp({ initialRegionLoad: true });
    await flushAsyncState();

    await act(async () => {
      getButton(rootElement, '송파구').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushAsyncState();

    expect(rootElement.textContent).toContain('가락동');
    expect(rootElement.textContent).not.toContain('극동');
    expect(rootElement.textContent).not.toContain('가락동 192');

    await act(async () => {
      getButton(rootElement, '가락동').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushAsyncState();
    await flushAsyncState();

    expect(rootElement.textContent).toContain('극동');
    expect(rootElement.textContent).toContain('가락동 192');
    expect(rootElement.textContent).toContain('대림');
    expect(rootElement.textContent).toContain('가락동 70-19');
    expect(fetchMock.mock.calls.some(([url]) =>
      String(url).includes('/api/v1/region/11710/complexes?limit=100&offset=100'),
    )).toBe(true);

    unmount(root);
  });

  it('focuses the map after selecting a search suggestion without coordinates', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/v1/search/complexes/suggestions')) {
        return Promise.resolve(jsonResponse([
          {
            complexId: 1002,
            complexName: '잠실엘스',
            parcelId: 9001002,
            address: '잠실동 19',
          },
        ]));
      }

      return Promise.resolve(jsonResponse(apiPayloadForUrl(url)));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();

    const searchInput = rootElement.querySelector<HTMLInputElement>('input[aria-label="단지 검색"]');
    expect(searchInput).not.toBeNull();

    await act(async () => {
      setInputValue(searchInput!, '잠실엘스');
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushAsyncState();

    await act(async () => {
      getButtonByAriaLabel(rootElement, '검색 제안 선택 잠실엘스').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushAsyncState();
    await flushAsyncState();

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/v1/complex/1002'))).toBe(true);
    const markerBody = lastJsonBodyFor(fetchMock, '/api/v1/map/complexes');
    expect(markerBody.swLat).toBeCloseTo(37.5024);
    expect(markerBody.neLat).toBeCloseTo(37.5224);
    expect(markerBody.swLng).toBeCloseTo(127.0721);
    expect(markerBody.neLng).toBeCloseTo(127.0921);

    unmount(root);
  });

  it('opens the lower-right chatbot panel and renders submitted answer responses', async () => {
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (url.includes('/api/v1/chatbot/query')) {
        return Promise.resolve(jsonResponse({
          success: true,
          answer: '서울 아파트 추천 결과입니다.',
          handler: 'search',
          data: [1, 2],
        }));
      }

      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();

    const launcher = getButton(rootElement, 'AI 집찾기');
    expect(launcher.className).toContain('chatbot-launcher');

    await act(async () => {
      launcher.click();
    });

    const shell = rootElement.querySelector('.app-shell');
    expect(shell?.getAttribute('data-chatbot-open')).toBe('true');
    expect(rootElement.textContent).toContain('AI 집찾기');
    expect(rootElement.textContent).toContain('단지 실거래, 동/구 단위 최신 거래, 추천, 비교, 시세 흐름, 계약 법령을 이어서 물어볼 수 있어요.');

    const questionInput = rootElement.querySelector<HTMLTextAreaElement>('#chatbot-question');
    expect(questionInput).not.toBeNull();

    await act(async () => {
      setTextAreaValue(questionInput!, '서울 아파트 찾아줘');
    });

    await act(async () => {
      getButton(rootElement, '보내기').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushAsyncState();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/chatbot/query'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ question: '서울 아파트 찾아줘' }),
      }),
    );
    expect(rootElement.textContent).toContain('서울 아파트 찾아줘');
    expect(rootElement.textContent).not.toContain('JSON 응답 보기');
    expect(rootElement.textContent).toContain('서울 아파트 추천 결과입니다.');
    expect(rootElement.textContent).not.toContain('"handler": "search"');

    unmount(root);
  });

  it('streams chatbot progress, answer deltas, final actions, and hides raw payload details', async () => {
    const stream = controlledStreamResponse();
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (url.includes('/api/v1/chatbot/query/stream')) {
        return Promise.resolve(stream.response);
      }

      return Promise.resolve(jsonResponse(apiPayloadForUrl(url)));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();
    await submitChatbotQuestion(rootElement, '잠실엘스 위치 알려줘');

    await act(async () => {
      stream.enqueue(sseFrame('status', { label: '질문 분석 중', step: 1, total: 5 }));
      await Promise.resolve();
    });
    await flushAsyncState();

    expect(rootElement.textContent).toContain('질문 분석 중');
    expect(rootElement.textContent).toContain('답변을 준비하고 있습니다.');
    expect(rootElement.querySelector('.chatbot-progress')?.textContent).toBe('질문 분석 중');
    expect(rootElement.querySelector('.chatbot-progress ol')).toBeNull();

    await act(async () => {
      stream.enqueue(sseFrame('status', { label: '작업 1/1 처리 중', step: 3, total: 5 }));
      await Promise.resolve();
    });
    await flushAsyncState();

    expect(rootElement.querySelector('.chatbot-progress')?.textContent).toBe('작업 처리 중');
    expect(rootElement.textContent).not.toContain('작업 1/1 처리 중');

    await act(async () => {
      stream.enqueue(sseFrame('status', { label: '답변 문장 정리 중', step: 5, total: 5 }));
      stream.enqueue(sseFrame('answer_delta', { text: '잠실엘스는 ' }));
      stream.enqueue(sseFrame('answer_delta', { text: '송파구 잠실동에 있습니다.' }));
      await Promise.resolve();
    });
    await flushAsyncState();

    expect(rootElement.textContent).toContain('답변 문장 정리 중');
    expect(rootElement.querySelector('.chatbot-progress')?.textContent).toBe('답변 문장 정리 중');
    expect(rootElement.querySelector('.chatbot-progress')?.textContent).not.toContain('질문 분석 중');
    expect(rootElement.textContent).toContain('잠실엘스는 송파구 잠실동에 있습니다.');

    await act(async () => {
      stream.enqueue(sseFrame('final', chatbotStreamFocusPayload()));
      stream.close();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushAsyncState();
    await flushAsyncState();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/chatbot/query/stream'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ question: '잠실엘스 위치 알려줘' }),
      }),
    );
    expect(rootElement.textContent).toContain('잠실엘스 지도 보기');
    expect(rootElement.textContent).not.toContain('37.5124');
    expect(rootElement.textContent).not.toContain('127.0821');
    expect(rootElement.textContent).not.toContain('"handler"');

    const lastComplexCall = fetchMock.mock.calls
      .filter(([url]) => String(url).includes('/api/v1/map/complexes'))
      .at(-1);
    const markerBody = JSON.parse(String((lastComplexCall?.[1] as RequestInit).body));
    expect(markerBody.swLat).toBeCloseTo(37.5024);
    expect(markerBody.swLng).toBeCloseTo(127.0721);

    unmount(root);
  });

  it('falls back to the existing chatbot query endpoint when streaming fails', async () => {
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (url.includes('/api/v1/chatbot/query/stream')) {
        return Promise.resolve(errorResponse(503, { detail: 'stream unavailable' }));
      }
      if (url.includes('/api/v1/chatbot/query')) {
        return Promise.resolve(jsonResponse({
          success: true,
          answer: '기존 API fallback 답변입니다.',
        }));
      }

      return Promise.resolve(jsonResponse(apiPayloadForUrl(url)));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();
    await submitChatbotQuestion(rootElement, 'fallback 질문');
    await flushAsyncState();

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/v1/chatbot/query/stream'))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/api/v1/chatbot/query'))).toBe(true);
    expect(rootElement.textContent).toContain('기존 API fallback 답변입니다.');

    unmount(root);
  });

  it('stores final chatbot messages in window.localStorage and restores them on reload', async () => {
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (url.includes('/api/v1/chatbot/query')) {
        return Promise.resolve(jsonResponse({
          success: true,
          answer: '저장된 챗봇 답변입니다.',
        }));
      }

      return Promise.resolve(jsonResponse(apiPayloadForUrl(url)));
    });
    vi.stubGlobal('fetch', fetchMock);

    const firstRender = await renderApp();
    await flushAsyncState();
    await submitChatbotQuestion(firstRender.rootElement, '저장할 질문');
    await flushAsyncState();

    const rawHistory = window.localStorage.getItem(CHATBOT_HISTORY_STORAGE_KEY);
    expect(rawHistory).not.toBeNull();
    expect(JSON.parse(String(rawHistory)).messages).toEqual([
      expect.objectContaining({ role: 'user', content: '저장할 질문' }),
      expect.objectContaining({ role: 'assistant', content: '저장된 챗봇 답변입니다.' }),
    ]);

    unmount(firstRender.root);

    const secondRender = await renderApp();
    await flushAsyncState();
    await act(async () => {
      getButton(secondRender.rootElement, 'AI 집찾기').click();
    });

    expect(secondRender.rootElement.textContent).toContain('저장할 질문');
    expect(secondRender.rootElement.textContent).toContain('저장된 챗봇 답변입니다.');

    unmount(secondRender.root);
  });

  it('deletes expired chatbot history before restore', async () => {
    window.localStorage.setItem(CHATBOT_HISTORY_STORAGE_KEY, JSON.stringify({
      version: 1,
      savedAt: new Date(Date.now() - 2).toISOString(),
      expiresAt: new Date(Date.now() - 1).toISOString(),
      messages: [
        {
          id: 'old-user',
          role: 'user',
          content: '만료된 질문',
        },
      ],
    }));
    const fetchMock = vi.fn((url: string) => Promise.resolve(jsonResponse(apiPayloadForUrl(url))));
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();
    await act(async () => {
      getButton(rootElement, 'AI 집찾기').click();
    });

    expect(window.localStorage.getItem(CHATBOT_HISTORY_STORAGE_KEY) ?? '').not.toContain('만료된 질문');
    expect(rootElement.textContent).not.toContain('만료된 질문');

    unmount(root);
  });

  it('stores chatbot memory patch and includes it in the next stream question', async () => {
    let chatbotCallCount = 0;
    const patchUpdatedAt = new Date().toISOString();
    const patchExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (url.includes('/api/v1/chatbot/query/stream')) {
        chatbotCallCount += 1;
        return Promise.resolve(streamResponse([
          sseFrame(
            'final',
            chatbotCallCount === 1
              ? {
                  success: true,
                  answer: '대치동 최신 실거래입니다.',
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
                        complexId: 3810,
                        complexName: '풍림아이원2차202동',
                        address: '대치동 910-6',
                        tradeId: 7781885,
                        dealDate: '2026-06-23',
                        dealAmount: 255000,
                      },
                      {
                        index: 2,
                        kind: 'complex',
                        complexId: 1001,
                        complexName: '래미안대치팰리스',
                        address: '대치동 1027',
                        tradeId: 7781906,
                        dealDate: '2026-06-16',
                        dealAmount: 445000,
                      },
                    ],
                    lastHandler: 'simple_lookup',
                    lastQueryType: 'region_trade_history',
                    updatedAt: patchUpdatedAt,
                    expiresAt: patchExpiresAt,
                  },
                }
              : {
                  success: true,
                  answer: '래미안대치팰리스 흐름입니다.',
                },
          ),
        ]));
      }

      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();
    await submitChatbotQuestion(rootElement, '대치동 최신 실거래가 3개 뽑아줘');
    await flushAsyncState();

    const storedMemory = JSON.parse(
      window.localStorage.getItem('home-search.chatbot.memory.v1') ?? 'null',
    );
    expect(storedMemory).toMatchObject({
      version: 'v1',
      activeRegion: {
        name: '대치동',
        code: '11680106',
        type: 'neighborhood',
      },
      items: [
        expect.objectContaining({
          index: 1,
          complexId: 3810,
          complexName: '풍림아이원2차202동',
        }),
        expect.objectContaining({
          index: 2,
          complexId: 1001,
          complexName: '래미안대치팰리스',
        }),
      ],
    });
    expect(JSON.stringify(storedMemory)).not.toContain('대치동 최신 실거래입니다.');

    const questionInput = rootElement.querySelector<HTMLTextAreaElement>('#chatbot-question');
    expect(questionInput).not.toBeNull();

    await act(async () => {
      setTextAreaValue(questionInput!, '두 번째 거 최근 1년 흐름도 알려줘');
    });

    await act(async () => {
      getButton(rootElement, '보내기').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushAsyncState();

    const chatbotCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/v1/chatbot/query/stream'));
    expect(chatbotCalls).toHaveLength(2);
    expect(JSON.parse(String((chatbotCalls[0][1] as RequestInit).body))).toEqual({
      question: '대치동 최신 실거래가 3개 뽑아줘',
    });
    expect(JSON.parse(String((chatbotCalls[1][1] as RequestInit).body))).toMatchObject({
      question: '두 번째 거 최근 1년 흐름도 알려줘',
      conversationContext: {
        version: 'v1',
        activeRegion: {
          name: '대치동',
        },
        items: [
          expect.objectContaining({
            complexId: 3810,
          }),
          expect.objectContaining({
            complexId: 1001,
          }),
        ],
      },
    });

    unmount(root);
  });

  it('submits chatbot questions with Enter and scrolls to the newest message', async () => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const scrollIntoViewMock = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (url.includes('/api/v1/chatbot/query')) {
        return Promise.resolve(jsonResponse({
          success: true,
          answer: 'chatbot answer',
        }));
      }

      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();

    const launcher = rootElement.querySelector<HTMLButtonElement>('.chatbot-launcher');
    expect(launcher).not.toBeNull();

    await act(async () => {
      launcher!.click();
    });

    const questionInput = rootElement.querySelector<HTMLTextAreaElement>('#chatbot-question');
    expect(questionInput).not.toBeNull();

    await act(async () => {
      setTextAreaValue(questionInput!, 'enter submit question');
    });

    await act(async () => {
      questionInput!.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
      }));
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushAsyncState();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/chatbot/query'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ question: 'enter submit question' }),
      }),
    );
    expect(rootElement.textContent).toContain('enter submit question');
    expect(rootElement.textContent).toContain('chatbot answer');
    expect(scrollIntoViewMock).toHaveBeenCalled();

    unmount(root);
    if (originalScrollIntoView) {
      Object.defineProperty(Element.prototype, 'scrollIntoView', {
        configurable: true,
        value: originalScrollIntoView,
      });
    } else {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    }
  });

  it('runs chatbot complex focus_map action and opens detail without rendering raw coordinates', async () => {
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (url.includes('/api/v1/chatbot/query')) {
        return Promise.resolve(jsonResponse(chatbotFocusPayload({
          kind: 'complex',
          openDetail: true,
        })));
      }

      return Promise.resolve(jsonResponse(apiPayloadForUrl(url)));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();
    await submitChatbotQuestion(rootElement, '잠실엘스 위치 알려줘');
    await flushAsyncState();
    await flushAsyncState();

    const complexMarkerCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/api/v1/map/complexes'));
    expect(complexMarkerCall).toBeDefined();
    const markerBody = JSON.parse(String((complexMarkerCall?.[1] as RequestInit).body));
    expect(markerBody.swLat).toBeCloseTo(37.5024);
    expect(markerBody.neLat).toBeCloseTo(37.5224);
    expect(markerBody.swLng).toBeCloseTo(127.0721);
    expect(markerBody.neLng).toBeCloseTo(127.0921);

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/v1/complex/1002'))).toBe(true);
    expect(rootElement.textContent).toContain('지도에 표시했습니다.');
    expect(rootElement.textContent).toContain('잠실엘스 지도 보기');
    expect(rootElement.textContent).not.toContain('37.5124');
    expect(rootElement.textContent).not.toContain('longitude');

    unmount(root);
  });

  it('runs chatbot region focus_map without opening complex detail', async () => {
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (url.includes('/api/v1/chatbot/query')) {
        return Promise.resolve(jsonResponse(chatbotFocusPayload({
          kind: 'region',
          openDetail: false,
        })));
      }

      return Promise.resolve(jsonResponse(apiPayloadForUrl(url)));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();
    await submitChatbotQuestion(rootElement, '강남구 시세 알려줘');
    await flushAsyncState();

    const regionCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/v1/map/regions'));
    expect(regionCalls.length).toBeGreaterThanOrEqual(2);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/v1/complex/1002'))).toBe(false);

    unmount(root);
  });

  it('allows manual chatbot action rerun from the action row', async () => {
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (url.includes('/api/v1/chatbot/query')) {
        return Promise.resolve(jsonResponse(chatbotFocusPayload({
          kind: 'complex',
          openDetail: false,
        })));
      }

      return Promise.resolve(jsonResponse(apiPayloadForUrl(url)));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();
    await submitChatbotQuestion(rootElement, '잠실엘스 위치 알려줘');
    await flushAsyncState();
    const callsAfterAutoRun = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/v1/map/complexes')).length;

    await act(async () => {
      getButton(rootElement, '잠실엘스 지도 보기').click();
      await Promise.resolve();
    });
    await flushAsyncState();

    const callsAfterManualRun = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/v1/map/complexes')).length;
    expect(callsAfterManualRun).toBeGreaterThan(callsAfterAutoRun);

    unmount(root);
  });

  it('runs linked comparison artifact actions from item buttons', async () => {
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (url.includes('/api/v1/chatbot/query')) {
        return Promise.resolve(jsonResponse(chatbotComparisonPayload()));
      }

      return Promise.resolve(jsonResponse(apiPayloadForUrl(url)));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();
    await submitChatbotQuestion(rootElement, '잠실엘스 래미안대치팰리스 비교');
    await flushAsyncState();

    expect(rootElement.textContent).toContain('단지 비교');
    expect(rootElement.textContent).toContain('최근가');

    await act(async () => {
      getButton(rootElement, '래미안대치팰리스').click();
      await Promise.resolve();
    });
    await flushAsyncState();

    const lastComplexCall = fetchMock.mock.calls
      .filter(([url]) => String(url).includes('/api/v1/map/complexes'))
      .at(-1);
    const markerBody = JSON.parse(String((lastComplexCall?.[1] as RequestInit).body));
    expect(markerBody.swLat).toBeCloseTo(37.4888);
    expect(markerBody.swLng).toBeCloseTo(127.0552);

    unmount(root);
  });
});

async function renderApp(appProps: {
  initialMapLevel?: number;
  initialRegionLoad?: boolean;
  kakaoMapAppKey?: string;
} = {}) {
  const rootElement = document.createElement('div');
  document.body.appendChild(rootElement);
  const root = createRoot(rootElement);

  await act(async () => {
    root.render(<App initialRegionLoad={false} kakaoMapAppKey="" {...appProps} />);
  });

  return { root, rootElement };
}

async function flushAsyncState() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function unmount(root: Root) {
  act(() => {
    root.unmount();
  });
}

function installLocalStorageMock() {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

function errorResponse(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    json: async () => body,
  } as Response;
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function controlledStreamResponse() {
  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
  });

  return {
    response: {
      ok: true,
      status: 200,
      body,
    } as Response,
    enqueue(frame: string) {
      if (streamController == null) {
        throw new Error('Stream controller is not ready');
      }
      streamController.enqueue(encoder.encode(frame));
    },
    close() {
      if (streamController == null) {
        throw new Error('Stream controller is not ready');
      }
      streamController.close();
    },
  };
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

async function submitChatbotQuestion(rootElement: HTMLElement, question: string) {
  await act(async () => {
    getButton(rootElement, 'AI 집찾기').click();
  });

  const questionInput = rootElement.querySelector<HTMLTextAreaElement>('#chatbot-question');
  if (questionInput == null) {
    throw new Error('Chatbot input not found');
  }

  await act(async () => {
    setTextAreaValue(questionInput, question);
  });

  await act(async () => {
    getButton(rootElement, '보내기').click();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function apiPayloadForUrl(url: string): unknown {
  if (url.includes('/api/v1/complex/1002/trades')) {
    return {
      parcelId: 9001002,
      complexId: 1002,
      content: [],
      page: 0,
      size: 25,
      totalElements: 0,
      totalPages: 0,
    };
  }
  if (url.includes('/api/v1/complex/1002/trade-trend')) {
    return [];
  }
  if (url.includes('/api/v1/complex/1002')) {
    return {
      parcelId: 9001002,
      complexId: 1002,
      latitude: 37.5124,
      longitude: 127.0821,
      address: '서울특별시 송파구 잠실동 19',
      tradeName: '잠실엘스',
      name: '잠실엘스',
      dongCnt: 72,
      unitCnt: 5678,
      platArea: null,
      archArea: null,
      totArea: null,
      bcRat: null,
      vlRat: null,
      useDate: '2008-09-30',
    };
  }
  if (url.includes('/api/v1/detail/9001002/complexes')) {
    return [];
  }
  if (url.includes('/api/v1/map/complexes')) {
    return [];
  }
  if (url.includes('/api/v1/map/regions')) {
    return [];
  }
  return [];
}

function regionSelectionPayloadForUrl(url: string): unknown {
  const path = new URL(url).pathname;
  if (path === '/api/v1/map/complexes' || path === '/api/v1/map/regions') {
    return [];
  }
  if (path === '/api/v1/region') {
    return [
      {
        id: 11,
        name: '서초구',
      },
    ];
  }
  if (path === '/api/v1/region/11') {
    return {
      id: 11,
      name: '서초구',
      latitude: 37.4837,
      longitude: 127.0324,
      children: [
        {
          id: 111,
          name: '잠원동',
        },
      ],
    };
  }
  if (path === '/api/v1/region/11/complexes') {
    return [
      {
        complexId: 1001,
        complexName: '강변',
        parcelId: 9001,
        latitude: 37.5188,
        longitude: 127.0126,
        address: '잠원동 53-15',
        dongCnt: null,
        unitCnt: null,
        useDate: null,
      },
      {
        complexId: 1002,
        complexName: '경남',
        parcelId: 9002,
        latitude: 37.4788,
        longitude: 126.9926,
        address: '방배동 1028-1',
        dongCnt: null,
        unitCnt: null,
        useDate: null,
      },
    ];
  }
  if (path === '/api/v1/region/111') {
    return {
      id: 111,
      name: '잠원동',
      latitude: 37.5188,
      longitude: 127.0126,
      children: [],
    };
  }
  if (path === '/api/v1/region/111/complexes') {
    return [];
  }
  if (path.endsWith('/complexes')) {
    return [
      {
        complexId: 9999,
        complexName: '숨겨져야 하는 단지',
        parcelId: 9999,
        latitude: 37.5,
        longitude: 127,
        address: '읍면동 전에는 숨김',
        dongCnt: null,
        unitCnt: null,
        useDate: null,
      },
    ];
  }
  return [];
}

function paginatedRegionSelectionPayloadForUrl(url: string): unknown {
  const requestUrl = new URL(url);
  const { pathname } = requestUrl;

  if (pathname === '/api/v1/region') {
    return [
      {
        id: 11710,
        name: '송파구',
      },
    ];
  }
  if (pathname === '/api/v1/region/11710') {
    return {
      id: 11710,
      name: '송파구',
      latitude: 37.5145,
      longitude: 127.1059,
      children: [
        {
          id: 11710107,
          name: '가락동',
        },
      ],
    };
  }
  if (pathname === '/api/v1/region/11710107') {
    return {
      id: 11710107,
      name: '가락동',
      latitude: 37.497,
      longitude: 127.125,
      children: [],
    };
  }
  if (pathname === '/api/v1/region/11710107/complexes') {
    return [];
  }
  if (pathname === '/api/v1/region/11710/complexes') {
    const offset = Number(requestUrl.searchParams.get('offset') ?? '0');
    if (offset === 0) {
      return Array.from({ length: 100 }, (_, index) =>
        regionComplexFixture({
          complexId: 2000 + index,
          complexName: `다른단지${index}`,
          address: `문정동 ${index}`,
        }),
      );
    }
    if (offset === 100) {
      return [
        regionComplexFixture({
          complexId: 11474,
          complexName: '극동',
          address: '가락동 192',
        }),
        regionComplexFixture({
          complexId: 11592,
          complexName: '대련',
          address: '가락동 166-15',
        }),
        regionComplexFixture({
          complexId: 11572,
          complexName: '대림',
          address: '가락동 70-19',
        }),
        regionComplexFixture({
          complexId: 11999,
          complexName: '다른동',
          address: '방이동 1',
        }),
      ];
    }
  }
  if (pathname.includes('/api/v1/map/')) {
    return [];
  }
  return [];
}

function regionComplexFixture({
  complexId,
  complexName,
  address,
}: {
  complexId: number;
  complexName: string;
  address: string;
}) {
  return {
    complexId,
    complexName,
    parcelId: complexId + 100000,
    latitude: 37.5,
    longitude: 127.1,
    address,
    dongCnt: null,
    unitCnt: null,
    useDate: null,
  };
}

function chatbotFocusPayload({
  kind,
  openDetail,
}: {
  kind: 'complex' | 'region';
  openDetail: boolean;
}) {
  const target = kind === 'complex'
    ? {
        kind,
        name: '잠실엘스',
        complexId: 1002,
        parcelId: null,
        latitude: 37.5124,
        longitude: 127.0821,
        level: 4,
        openDetail,
      }
    : {
        kind,
        name: '강남구',
        complexId: null,
        parcelId: null,
        latitude: 37.5172363,
        longitude: 127.0473248,
        level: 7,
        openDetail,
      };

  return {
    success: true,
    answer: '지도에 표시했습니다.',
    uiActions: [
      {
        id: kind === 'complex' ? 'focus_map:complex:1002' : 'focus_map:region:강남구',
        type: 'focus_map',
        label: `${target.name} 지도 보기`,
        autoRun: true,
        priority: 'primary',
        source: 'test',
        target,
      },
    ],
    uiArtifacts: [],
    uiSummary: {
      hasMapFocus: true,
      primaryTargetName: target.name,
      primaryActionLabel: `${target.name} 지도 보기`,
      artifactTypes: [],
    },
  };
}

function chatbotStreamFocusPayload() {
  return {
    ...chatbotFocusPayload({
      kind: 'complex',
      openDetail: false,
    }),
    answer: '잠실엘스는 송파구 잠실동에 있습니다.',
    result: {
      handler: 'simple_lookup',
      data: [
        {
          complex_name: '잠실엘스',
          latitude: 37.5124,
          longitude: 127.0821,
        },
      ],
    },
  };
}

function chatbotComparisonPayload() {
  return {
    success: true,
    answer: '아래 비교 그래프로 가격 차이를 볼 수 있습니다.',
    uiActions: [
      {
        id: 'focus_map:complex:1002',
        type: 'focus_map',
        label: '잠실엘스 지도 보기',
        autoRun: true,
        priority: 'primary',
        source: 'comparison.results',
        target: {
          kind: 'complex',
          name: '잠실엘스',
          complexId: 1002,
          parcelId: null,
          latitude: 37.5124,
          longitude: 127.0821,
          level: 4,
          openDetail: false,
        },
      },
      {
        id: 'focus_map:complex:1001',
        type: 'focus_map',
        label: '래미안대치팰리스 지도 보기',
        autoRun: false,
        priority: 'secondary',
        source: 'comparison.results',
        target: {
          kind: 'complex',
          name: '래미안대치팰리스',
          complexId: 1001,
          parcelId: null,
          latitude: 37.4988,
          longitude: 127.0652,
          level: 4,
          openDetail: false,
        },
      },
    ],
    uiArtifacts: [
      {
        id: 'comparison_bar_chart:잠실엘스:래미안대치팰리스',
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
          {
            key: 'unitCnt',
            label: '세대수',
            unit: '세대',
            direction: 'higher_is_larger',
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
              unitCnt: 5678,
            },
          },
          {
            name: '래미안대치팰리스',
            complexId: 1001,
            parcelId: null,
            actionId: 'focus_map:complex:1001',
            values: {
              latestDealAmount: 435000,
              unitCnt: 1608,
            },
          },
        ],
      },
    ],
    uiSummary: {
      hasMapFocus: true,
      primaryTargetName: '잠실엘스',
      artifactTypes: ['comparison_bar_chart'],
    },
  };
}

function getButton(rootElement: HTMLElement, name: string): HTMLButtonElement {
  const button = Array.from(rootElement.querySelectorAll('button')).find(
    (candidate) => candidate.textContent === name,
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${name}`);
  }

  return button;
}

function getButtonByAriaLabel(rootElement: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(rootElement.querySelectorAll('button')).find(
    (candidate) => candidate.getAttribute('aria-label') === label,
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found by aria-label: ${label}`);
  }

  return button;
}

function lastJsonBodyFor(fetchMock: ReturnType<typeof vi.fn>, path: string) {
  const call = fetchMock.mock.calls
    .filter(([url]) => String(url).includes(path))
    .at(-1);
  if (call == null) {
    throw new Error(`No fetch call found for ${path}`);
  }
  return JSON.parse(String((call[1] as RequestInit).body));
}

function setInputValue(element: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    valueSetter?.call(element, value);
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function setTextAreaValue(element: HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    valueSetter?.call(element, value);
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
}
