import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

describe('App public map surface', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
    document.body.innerHTML = '';
  });

  it('renders the map-first shell and calls public marker API only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    const { root, rootElement } = await renderApp();
    await flushAsyncState();

    expect(rootElement.textContent).toContain('Home Search');
    expect(rootElement.textContent).toContain('지도 탐색');
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

    expect(rootElement.textContent).toContain('Home Search');
    expect(rootElement.textContent).not.toContain('관리자 접근');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/v1/admin/'))).toBe(false);

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

    const launcher = getButton(rootElement, '챗봇');
    expect(launcher.className).toContain('chatbot-launcher');

    await act(async () => {
      launcher.click();
    });

    const shell = rootElement.querySelector('.app-shell');
    expect(shell?.getAttribute('data-chatbot-open')).toBe('true');
    expect(rootElement.textContent).toContain('챗봇');

    const questionInput = rootElement.querySelector<HTMLTextAreaElement>('#chatbot-question');
    expect(questionInput).not.toBeNull();

    await act(async () => {
      setTextAreaValue(questionInput!, '서울 아파트 찾아줘');
    });

    await act(async () => {
      getButton(rootElement, '전송').click();
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

async function renderApp() {
  const rootElement = document.createElement('div');
  document.body.appendChild(rootElement);
  const root = createRoot(rootElement);

  await act(async () => {
    root.render(<App initialRegionLoad={false} kakaoMapAppKey="" />);
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

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

async function submitChatbotQuestion(rootElement: HTMLElement, question: string) {
  await act(async () => {
    getButton(rootElement, '챗봇').click();
  });

  const questionInput = rootElement.querySelector<HTMLTextAreaElement>('#chatbot-question');
  if (questionInput == null) {
    throw new Error('Chatbot input not found');
  }

  await act(async () => {
    setTextAreaValue(questionInput, question);
  });

  await act(async () => {
    getButton(rootElement, '전송').click();
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
