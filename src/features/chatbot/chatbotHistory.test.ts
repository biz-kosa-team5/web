import { afterEach, describe, expect, it } from 'vitest';

import type { ChatbotMessage, ChatbotResponse } from './chatbotTypes';
import {
  CHATBOT_HISTORY_STORAGE_KEY,
  clearExpiredChatbotHistory,
  getRecentChatbotMessages,
  loadChatbotHistory,
  saveChatbotHistory,
} from './chatbotHistory';

describe('chatbotHistory', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('user message와 완료된 assistant message만 최근 100개 저장한다', () => {
    const messages: ChatbotMessage[] = [
      ...Array.from({ length: 101 }, (_, index) => ({
        id: `user-${index}`,
        role: 'user' as const,
        content: `질문 ${index}`,
      })),
      {
        id: 'streaming-assistant',
        role: 'assistant',
        content: '작성 중',
        response: null,
      },
      {
        id: 'final-assistant',
        role: 'assistant',
        content: '완료 답변',
        response: chatbotResponse('완료 답변'),
      },
    ];

    saveChatbotHistory(messages);

    const loaded = loadChatbotHistory();
    expect(loaded).toHaveLength(100);
    expect(loaded.some((message) => message.id === 'streaming-assistant')).toBe(false);
    expect(loaded.at(-1)).toMatchObject({
      id: 'final-assistant',
      role: 'assistant',
      content: '완료 답변',
    });
  });

  it('30일 만료 history를 삭제한다', () => {
    window.localStorage.setItem(CHATBOT_HISTORY_STORAGE_KEY, JSON.stringify({
      version: 1,
      savedAt: new Date(Date.now() - 2).toISOString(),
      expiresAt: new Date(Date.now() - 1).toISOString(),
      messages: [
        {
          id: 'old-user',
          role: 'user',
          content: '오래된 질문',
        },
      ],
    }));

    clearExpiredChatbotHistory();

    expect(window.localStorage.getItem(CHATBOT_HISTORY_STORAGE_KEY)).toBeNull();
    expect(loadChatbotHistory()).toEqual([]);
  });

  it('getRecentChatbotMessages는 유효 history를 복원한다', () => {
    const messages: ChatbotMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        content: '잠실엘스 위치',
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: '지도에 표시했습니다.',
        response: chatbotResponse('지도에 표시했습니다.'),
      },
    ];
    saveChatbotHistory(messages);

    expect(getRecentChatbotMessages()).toEqual(messages);
  });
});

function chatbotResponse(answer: string): ChatbotResponse {
  return {
    answer,
    uiActions: [],
    uiArtifacts: [],
    uiSummary: null,
  };
}
