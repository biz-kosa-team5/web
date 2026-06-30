import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CHATBOT_MEMORY_STORAGE_KEY,
  loadChatbotConversationMemory,
  mergeChatbotConversationMemory,
  normalizeChatbotConversationMemoryPatch,
  saveChatbotConversationMemory,
} from './chatbotMemory';
import type { ChatbotConversationMemory } from './chatbotTypes';

describe('chatbot conversation memory', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('response patch를 localStorage에 저장하고 다시 읽는다', () => {
    const memory = mergeChatbotConversationMemory(null, {
      version: 'v1',
      activeComplex: {
        complexId: 1001,
        complexName: '래미안대치팰리스',
      },
      items: [
        {
          index: 1,
          kind: 'complex',
          complexId: 1001,
          complexName: '래미안대치팰리스',
        },
      ],
      lastHandler: 'simple_lookup',
      lastQueryType: 'trade_history',
    });

    saveChatbotConversationMemory(memory);

    expect(loadChatbotConversationMemory()).toMatchObject({
      version: 'v1',
      activeComplex: {
        complexId: 1001,
        complexName: '래미안대치팰리스',
      },
      items: [
        expect.objectContaining({
          index: 1,
          complexId: 1001,
          complexName: '래미안대치팰리스',
        }),
      ],
      lastHandler: 'simple_lookup',
      lastQueryType: 'trade_history',
    });
  });

  it('localStorage parse 실패 시 폐기한다', () => {
    window.localStorage.setItem(CHATBOT_MEMORY_STORAGE_KEY, '{bad json');

    expect(loadChatbotConversationMemory()).toBeNull();
    expect(window.localStorage.getItem(CHATBOT_MEMORY_STORAGE_KEY)).toBeNull();
  });

  it('expiresAt 만료 시 폐기한다', () => {
    const expired: ChatbotConversationMemory = {
      version: 'v1',
      items: [],
      updatedAt: new Date(Date.now() - 2000).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    window.localStorage.setItem(CHATBOT_MEMORY_STORAGE_KEY, JSON.stringify(expired));

    expect(loadChatbotConversationMemory()).toBeNull();
    expect(window.localStorage.getItem(CHATBOT_MEMORY_STORAGE_KEY)).toBeNull();
  });

  it('malformed patch는 버린다', () => {
    expect(normalizeChatbotConversationMemoryPatch({
      version: 'v2',
      items: [
        {
          index: 1,
          kind: 'complex',
          complexName: '잠실엘스',
        },
      ],
    })).toBeNull();
  });

  it('items는 최대 5개로 제한하고 같은 complexId는 최신 patch 항목을 우선한다', () => {
    const current = mergeChatbotConversationMemory(null, {
      version: 'v1',
      items: [
        {
          index: 1,
          kind: 'complex',
          complexId: 1001,
          complexName: '이전이름',
        },
      ],
    });

    const merged = mergeChatbotConversationMemory(current, {
      version: 'v1',
      items: Array.from({ length: 6 }, (_, index) => ({
        index: index + 1,
        kind: 'complex',
        complexId: 1001 + index,
        complexName: index === 0 ? '래미안대치팰리스' : `테스트${index}`,
      })),
    });

    expect(merged?.items).toHaveLength(5);
    expect(merged?.items[0]).toMatchObject({
      index: 1,
      complexId: 1001,
      complexName: '래미안대치팰리스',
    });
  });
});

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
