import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatbotArtifacts } from './ChatbotArtifacts';
import type { ChatbotUiAction, ChatbotUiArtifact } from './chatbotTypes';

describe('ChatbotArtifacts', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('comparison artifact renders all metric values in a table', () => {
    const { root, rootElement } = renderArtifacts([comparisonArtifact()], actions());
    const headers = Array.from(rootElement.querySelectorAll('th')).map((header) => header.textContent);

    expect(rootElement.querySelector('.chatbot-comparison-table-wrap table')).not.toBeNull();
    expect(headers).toEqual(expect.arrayContaining(['항목', '잠실엘스', '래미안대치팰리스', '최근가', '세대수']));
    expect(rootElement.textContent).toContain('최근가');
    expect(rootElement.textContent).toContain('세대수');
    expect(rootElement.textContent).toContain('잠실엘스');
    expect(rootElement.textContent).toContain('33.0억원');
    expect(rootElement.textContent).toContain('5,678세대');
    expect(rootElement.textContent).toContain('래미안대치팰리스');
    expect(rootElement.textContent).toContain('43.5억원');
    expect(rootElement.textContent).toContain('1,608세대');

    unmount(root);
  });

  it('trend chart renders empty state for too few points', () => {
    const { root, rootElement } = renderArtifacts([
      {
        id: 'trend',
        type: 'trend_line_chart',
        title: '시세 흐름',
        source: 'test',
        unit: '만원',
        points: [],
      },
    ], []);

    expect(rootElement.textContent).toContain('표시할 시세 흐름이 없습니다');

    unmount(root);
  });

  it('ranking and recommendation action buttons call linked actions', async () => {
    const onUiAction = vi.fn();
    const { root, rootElement } = renderArtifacts([
      {
        id: 'ranking',
        type: 'ranking_list',
        title: '상승률 상위 단지',
        source: 'test',
        items: [
          {
            rank: 1,
            name: '잠실엘스',
            metricLabel: '상승률',
            metricValue: '12.4%',
            actionId: 'focus_map:complex:1002',
          },
        ],
      },
      {
        id: 'recommendation',
        type: 'recommendation_list',
        title: '추천 후보',
        source: 'test',
        items: [
          {
            name: '래미안대치팰리스',
            priceText: '43.5억원',
            meta: ['대치역 320m'],
            actionId: 'focus_map:complex:1001',
          },
        ],
      },
    ], actions(), onUiAction);

    await act(async () => {
      button(rootElement, '지도 보기').click();
    });
    await act(async () => {
      button(rootElement, '래미안대치팰리스').click();
    });

    expect(onUiAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'focus_map:complex:1002' }));
    expect(onUiAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'focus_map:complex:1001' }));

    unmount(root);
  });
});

function renderArtifacts(
  artifacts: ChatbotUiArtifact[],
  artifactActions: ChatbotUiAction[],
  onUiAction = vi.fn(),
) {
  const rootElement = document.createElement('div');
  document.body.appendChild(rootElement);
  const root = createRoot(rootElement);

  act(() => {
    root.render(
      <ChatbotArtifacts
        actions={artifactActions}
        artifacts={artifacts}
        onUiAction={onUiAction}
      />,
    );
  });

  return { root, rootElement };
}

function comparisonArtifact(): ChatbotUiArtifact {
  return {
    id: 'comparison',
    type: 'comparison_bar_chart',
    title: '단지 비교',
    source: 'test',
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
  };
}

function actions(): ChatbotUiAction[] {
  return [
    action('focus_map:complex:1002', '잠실엘스', 37.5124, 127.0821),
    action('focus_map:complex:1001', '래미안대치팰리스', 37.4988, 127.0652),
  ];
}

function action(id: string, name: string, latitude: number, longitude: number): ChatbotUiAction {
  return {
    id,
    type: 'focus_map',
    label: `${name} 지도 보기`,
    autoRun: false,
    priority: 'secondary',
    source: 'test',
    target: {
      kind: 'complex',
      name,
      complexId: Number(id.split(':').at(-1)),
      parcelId: null,
      latitude,
      longitude,
      level: 4,
      openDetail: true,
    },
  };
}

function button(rootElement: HTMLElement, text: string): HTMLButtonElement {
  const found = Array.from(rootElement.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.includes(text),
  );
  if (!(found instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${text}`);
  }
  return found;
}

function unmount(root: Root) {
  act(() => {
    root.unmount();
  });
}
