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

  it('opens the lower-right chatbot panel and renders submitted JSON responses', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/v1/chatbot/query')) {
        return Promise.resolve(jsonResponse({ success: true, handler: 'search', data: [1, 2] }));
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
    expect(rootElement.textContent).toContain('"handler": "search"');

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
