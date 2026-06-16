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
