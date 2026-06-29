import { useRef, useState } from 'react';

import { queryChatbot } from './api/queryChatbot';
import type { ChatbotMessage, ChatbotRequestState, ChatbotUiAction } from './chatbotTypes';

const IDLE_REQUEST_STATE: ChatbotRequestState = {
  status: 'idle',
  error: null,
};

export function useChatbot(options: { onUiAction?: (action: ChatbotUiAction) => void } = {}) {
  const messageSequenceRef = useRef(0);
  const executedActionIdsRef = useRef(new Set<string>());
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
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
      const response = await queryChatbot(question);
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
      runAutoUiAction(assistantMessageId, response.uiActions);
      setRequestState(IDLE_REQUEST_STATE);
    } catch (error) {
      setRequestState({
        status: 'error',
        error: error instanceof Error ? error.message : '챗봇 응답을 불러오지 못했습니다.',
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
