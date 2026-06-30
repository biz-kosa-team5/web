import { useEffect, useRef, useState } from 'react';

import { queryChatbotStream } from './api/queryChatbotStream';
import { loadChatbotHistory, saveChatbotHistory } from './chatbotHistory';
import {
  loadChatbotConversationMemory,
  mergeChatbotConversationMemory,
  saveChatbotConversationMemory,
  toChatbotConversationContext,
} from './chatbotMemory';
import type {
  ChatbotConversationMemory,
  ChatbotMessage,
  ChatbotProgressStep,
  ChatbotRequestState,
  ChatbotUiAction,
} from './chatbotTypes';

const IDLE_REQUEST_STATE: ChatbotRequestState = {
  status: 'idle',
  error: null,
};
const INITIAL_LOADING_LABEL = '질문 분석 중';
const CHATBOT_INTRO_ANSWER = '단지 실거래, 동/구 단위 최신 거래, 추천, 비교, 시세 흐름, 계약 법령을 이어서 물어볼 수 있어요.';

export function useChatbot(options: { onUiAction?: (action: ChatbotUiAction) => void } = {}) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageSequenceRef = useRef(0);
  const executedActionIdsRef = useRef(new Set<string>());
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatbotMessage[]>(() => {
    const initialMessages = initialChatbotMessages();
    messageSequenceRef.current = maxMessageSequence(initialMessages);
    return initialMessages;
  });
  const [conversationMemory, setConversationMemory] = useState<ChatbotConversationMemory | null>(
    () => loadChatbotConversationMemory(),
  );
  const [requestState, setRequestState] = useState<ChatbotRequestState>(IDLE_REQUEST_STATE);

  useEffect(() => {
    saveChatbotHistory(messages);
  }, [messages]);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
  }, []);

  async function submitQuestion() {
    const question = inputValue.trim();
    if (question.length === 0) {
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const userMessageId = nextMessageId();
    const assistantMessageId = nextMessageId();
    const conversationContext = toChatbotConversationContext(conversationMemory);
    setInputValue('');
    setRequestState({
      status: 'loading',
      error: null,
      phaseLabel: INITIAL_LOADING_LABEL,
      steps: [],
    });
    setMessages((current) => [
      ...current,
      {
        id: userMessageId,
        role: 'user',
        content: question,
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        response: null,
      },
    ]);

    try {
      const response = await queryChatbotStream(
        question,
        {
          onAnswerDelta: (text) => {
            setMessages((current) => updateAssistantMessage(
              current,
              assistantMessageId,
              (message) => ({
                ...message,
                content: `${message.content}${text}`,
              }),
            ));
          },
          onStatus: (status) => {
            setRequestState((current) => {
              if (current.status !== 'loading') {
                return current;
              }
              return {
                status: 'loading',
                error: null,
                phaseLabel: formatChatbotProgressLabel(status.label),
                steps: appendProgressStep(current.steps, status),
              };
            });
          },
        },
        abortController.signal,
        conversationContext,
      );
      if (abortController.signal.aborted) {
        return;
      }

      setMessages((current) => updateAssistantMessage(
        current,
        assistantMessageId,
        (message) => ({
          ...message,
          content: response.answer,
          response,
        }),
      ));
      const nextMemory = mergeChatbotConversationMemory(
        conversationMemory,
        response.conversationMemoryPatch,
      );
      setConversationMemory(nextMemory);
      saveChatbotConversationMemory(nextMemory);
      runAutoUiAction(assistantMessageId, response.uiActions);
      setRequestState(IDLE_REQUEST_STATE);
    } catch (error) {
      if (isAbortError(error, abortController.signal)) {
        return;
      }
      setRequestState({
        status: 'error',
        error: error instanceof Error ? error.message : 'AI 집찾기 응답을 불러오지 못했습니다.',
      });
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
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

function initialChatbotMessages(): ChatbotMessage[] {
  const history = loadChatbotHistory();
  return history.length > 0 ? history : [introMessage()];
}

function introMessage(): ChatbotMessage {
  return {
    id: 'chatbot-intro-message',
    role: 'assistant',
    content: CHATBOT_INTRO_ANSWER,
    response: null,
  };
}

function maxMessageSequence(messages: ChatbotMessage[]): number {
  return messages.reduce((maxSequence, message) => {
    const match = /^chatbot-message-(\d+)$/.exec(message.id);
    if (match == null) {
      return maxSequence;
    }
    return Math.max(maxSequence, Number(match[1]));
  }, 0);
}

function updateAssistantMessage(
  messages: ChatbotMessage[],
  messageId: string,
  update: (message: Extract<ChatbotMessage, { role: 'assistant' }>) => ChatbotMessage,
): ChatbotMessage[] {
  return messages.map((message) => {
    if (message.role !== 'assistant' || message.id !== messageId) {
      return message;
    }
    return update(message);
  });
}

function appendProgressStep(
  steps: ChatbotProgressStep[],
  nextStep: ChatbotProgressStep,
): ChatbotProgressStep[] {
  const existingIndex = steps.findIndex((step) => step.step === nextStep.step);
  if (existingIndex === -1) {
    return [...steps, nextStep];
  }
  return steps.map((step, index) => (index === existingIndex ? nextStep : step));
}

function formatChatbotProgressLabel(label: string): string {
  return label.replace(/^작업\s+\d+\/\d+\s+처리 중$/, '작업 처리 중');
}

function isAbortError(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (error instanceof DOMException && error.name === 'AbortError');
}
