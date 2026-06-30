import type { ChatbotMessage, ChatbotResponse } from './chatbotTypes';

export const CHATBOT_HISTORY_STORAGE_KEY = 'home-search.chatbot.history.v1';

const CHATBOT_HISTORY_VERSION = 1;
const CHATBOT_HISTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CHATBOT_HISTORY_MESSAGE_LIMIT = 100;

type ChatbotHistoryPayload = {
  version: 1;
  savedAt: string;
  expiresAt: string;
  messages: ChatbotMessage[];
};

export function loadChatbotHistory(): ChatbotMessage[] {
  clearExpiredChatbotHistory();
  const storage = getLocalStorage();
  if (storage == null) {
    return [];
  }

  try {
    const raw = storage.getItem(CHATBOT_HISTORY_STORAGE_KEY);
    if (raw == null) {
      return [];
    }
    const payload = JSON.parse(raw);
    if (!isHistoryPayload(payload)) {
      storage.removeItem(CHATBOT_HISTORY_STORAGE_KEY);
      return [];
    }
    return payload.messages.filter(isPersistableMessage).slice(-CHATBOT_HISTORY_MESSAGE_LIMIT);
  } catch {
    storage.removeItem(CHATBOT_HISTORY_STORAGE_KEY);
    return [];
  }
}

export function saveChatbotHistory(messages: ChatbotMessage[]): void {
  const storage = getLocalStorage();
  if (storage == null) {
    return;
  }

  const persistedMessages = messages
    .filter(isPersistableMessage)
    .slice(-CHATBOT_HISTORY_MESSAGE_LIMIT);
  const now = new Date();
  const payload: ChatbotHistoryPayload = {
    version: CHATBOT_HISTORY_VERSION,
    savedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CHATBOT_HISTORY_TTL_MS).toISOString(),
    messages: persistedMessages,
  };

  try {
    storage.setItem(CHATBOT_HISTORY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or private-mode storage failures should not block chat usage.
  }
}

export function clearExpiredChatbotHistory(): void {
  const storage = getLocalStorage();
  if (storage == null) {
    return;
  }

  try {
    const raw = storage.getItem(CHATBOT_HISTORY_STORAGE_KEY);
    if (raw == null) {
      return;
    }
    const payload = JSON.parse(raw);
    if (!isRecord(payload) || payload.version !== CHATBOT_HISTORY_VERSION) {
      storage.removeItem(CHATBOT_HISTORY_STORAGE_KEY);
      return;
    }
    const expiresAt = Date.parse(String(payload.expiresAt ?? ''));
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      storage.removeItem(CHATBOT_HISTORY_STORAGE_KEY);
    }
  } catch {
    storage.removeItem(CHATBOT_HISTORY_STORAGE_KEY);
  }
}

export function getRecentChatbotMessages(): ChatbotMessage[] {
  return loadChatbotHistory();
}

function isHistoryPayload(value: unknown): value is ChatbotHistoryPayload {
  return (
    isRecord(value)
    && value.version === CHATBOT_HISTORY_VERSION
    && typeof value.savedAt === 'string'
    && typeof value.expiresAt === 'string'
    && Number.isFinite(Date.parse(value.expiresAt))
    && Date.parse(value.expiresAt) > Date.now()
    && Array.isArray(value.messages)
  );
}

function isPersistableMessage(message: ChatbotMessage): boolean {
  if (message.role === 'user') {
    return typeof message.content === 'string' && message.content.trim().length > 0;
  }
  return (
    typeof message.content === 'string'
    && message.content.trim().length > 0
    && message.response != null
    && isPersistableResponse(message.response)
  );
}

function isPersistableResponse(response: ChatbotResponse): boolean {
  return (
    typeof response.answer === 'string'
    && Array.isArray(response.uiActions)
    && Array.isArray(response.uiArtifacts)
    && (
      response.uiSummary == null
      || isRecord(response.uiSummary)
    )
  );
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
