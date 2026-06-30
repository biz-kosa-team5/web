import { useRef, useState } from 'react';

import { queryChatbot } from './api/queryChatbot';
import {
  loadChatbotConversationMemory,
  mergeChatbotConversationMemory,
  saveChatbotConversationMemory,
  toChatbotConversationContext,
} from './chatbotMemory';
import type {
  ChatbotConversationMemory,
  ChatbotMessage,
  ChatbotRequestState,
  ChatbotResponse,
  ChatbotUiAction,
} from './chatbotTypes';

const IDLE_REQUEST_STATE: ChatbotRequestState = {
  status: 'idle',
  error: null,
};

const CHATBOT_INTRO_ANSWER = '단지 실거래, 동/구 단위 최신 거래, 추천, 비교, 시세 흐름, 계약 법령을 이어서 물어볼 수 있어요.';

const INTRO_RESPONSE: ChatbotResponse = {
  answer: CHATBOT_INTRO_ANSWER,
  uiActions: [],
  uiArtifacts: [],
  uiSummary: null,
};

export function useChatbot(options: { onUiAction?: (action: ChatbotUiAction) => void } = {}) {
  const messageSequenceRef = useRef(0);
  const executedActionIdsRef = useRef(new Set<string>());
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatbotMessage[]>(() => [introMessage()]);
  const [conversationMemory, setConversationMemory] = useState<ChatbotConversationMemory | null>(
    () => loadChatbotConversationMemory(),
  );
  const [requestState, setRequestState] = useState<ChatbotRequestState>(IDLE_REQUEST_STATE);

  async function submitQuestion() {
    const question = inputValue.trim();
    if (question.length === 0 || requestState.status === 'loading') {
      return;
    }

    setInputValue('');
    setRequestState({ status: 'loading', error: null });
    setMessages((current) => [
      ...current,
      {
        id: nextMessageId(),
        role: 'user',
        content: question,
      },
    ]);

    try {
      const response = await queryChatbot(
        question,
        toChatbotConversationContext(conversationMemory),
      );
      const assistantMessageId = nextMessageId();
      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: response.answer,
          response,
        },
      ]);
      const nextMemory = mergeChatbotConversationMemory(
        conversationMemory,
        response.conversationMemoryPatch,
      );
      setConversationMemory(nextMemory);
      saveChatbotConversationMemory(nextMemory);
      runAutoUiAction(assistantMessageId, response.uiActions);
      setRequestState(IDLE_REQUEST_STATE);
    } catch (error) {
      setRequestState({
        status: 'error',
        error: error instanceof Error ? error.message : 'AI 집찾기 응답을 불러오지 못했습니다.',
      });
    }
  }

  return {
    inputValue,
    messages,
    requestState,
    setInputValue,
    submitQuestion,
  };

  function nextMessageId(): string {
    messageSequenceRef.current += 1;
    return `chatbot-message-${messageSequenceRef.current}`;
  }

  function runAutoUiAction(messageId: string, actions: ChatbotUiAction[]) {
    const action = actions.find((candidate) => candidate.autoRun);
    if (action == null) {
      return;
    }

    const executionKey = `${messageId}:${action.id}`;
    if (executedActionIdsRef.current.has(executionKey)) {
      return;
    }
    executedActionIdsRef.current.add(executionKey);
    options.onUiAction?.(action);
  }
}

function introMessage(): ChatbotMessage {
  return {
    id: 'chatbot-intro-message',
    role: 'assistant',
    content: CHATBOT_INTRO_ANSWER,
    response: INTRO_RESPONSE,
  };
}
