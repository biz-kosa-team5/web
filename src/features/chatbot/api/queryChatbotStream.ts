import { readProblemDetail } from '../../map/api/readProblemDetail';
import { resolveApiUrl } from '../../map/api/resolveApiUrl';
import type { ChatbotResponse, ChatbotUiAction, ChatbotUiArtifact, ChatbotUiSummary } from '../chatbotTypes';
import { isChatbotResponse, normalizeChatbotResponse, queryChatbot } from './queryChatbot';

const CHATBOT_STREAM_QUERY_PATH = '/api/v1/chatbot/query/stream';

export type ChatbotStreamStatus = {
  label: string;
  step: number;
  total: number;
};

export type ChatbotStreamArtifacts = {
  uiActions: ChatbotUiAction[];
  uiArtifacts: ChatbotUiArtifact[];
  uiSummary: ChatbotUiSummary | null;
};

export type QueryChatbotStreamHandlers = {
  onAnswerDelta?: (text: string) => void;
  onArtifacts?: (artifacts: ChatbotStreamArtifacts) => void;
  onStatus?: (status: ChatbotStreamStatus) => void;
};

type SseEvent = {
  event: string;
  data: unknown;
};

export async function queryChatbotStream(
  question: string,
  handlers: QueryChatbotStreamHandlers = {},
  signal?: AbortSignal,
): Promise<ChatbotResponse> {
  try {
    return await readChatbotStream(question, handlers, signal);
  } catch (error) {
    if (isAbortFailure(error, signal)) {
      throw error;
    }
    return queryChatbot(question);
  }
}

async function readChatbotStream(
  question: string,
  handlers: QueryChatbotStreamHandlers,
  signal?: AbortSignal,
): Promise<ChatbotResponse> {
  const response = await fetch(resolveApiUrl(CHATBOT_STREAM_QUERY_PATH), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
    signal,
  });

  if (!response.ok) {
    const detail = await readProblemDetail(response);
    throw new Error(
      `Failed to stream chatbot: ${response.status}${detail ? ` ${detail}` : ''}`,
    );
  }

  if (response.body == null) {
    throw new Error('Failed to stream chatbot: response body is not readable');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResponse: ChatbotResponse | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const result = consumeSseBuffer(buffer, (event) => {
      const maybeFinal = handleStreamEvent(event, handlers);
      if (maybeFinal != null) {
        finalResponse = maybeFinal;
      }
    });
    buffer = result.buffer;

    if (done) {
      break;
    }
  }

  if (buffer.trim().length > 0) {
    const event = parseSseFrame(buffer);
    const maybeFinal = handleStreamEvent(event, handlers);
    if (maybeFinal != null) {
      finalResponse = maybeFinal;
    }
  }

  if (finalResponse == null) {
    throw new Error('Malformed chatbot stream: missing final event');
  }

  return finalResponse;
}

function consumeSseBuffer(
  buffer: string,
  onEvent: (event: SseEvent) => void,
): { buffer: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const frames = normalized.split('\n\n');
  const remainder = frames.pop() ?? '';
  for (const frame of frames) {
    if (frame.trim().length > 0) {
      onEvent(parseSseFrame(frame));
    }
  }
  return { buffer: remainder };
}

function parseSseFrame(frame: string): SseEvent {
  let event = '';
  const dataLines: string[] = [];

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }

  if (!event) {
    throw new Error('Malformed chatbot stream: missing event name');
  }

  return {
    event,
    data: JSON.parse(dataLines.join('\n')),
  };
}

function handleStreamEvent(
  event: SseEvent,
  handlers: QueryChatbotStreamHandlers,
): ChatbotResponse | null {
  switch (event.event) {
    case 'status':
      handlers.onStatus?.(normalizeStatusEvent(event.data));
      return null;
    case 'artifacts':
      handlers.onArtifacts?.(normalizeArtifactsEvent(event.data));
      return null;
    case 'answer_delta':
      handlers.onAnswerDelta?.(normalizeAnswerDeltaEvent(event.data));
      return null;
    case 'final':
      if (!isChatbotResponse(event.data)) {
        throw new Error('Malformed chatbot stream: invalid final event');
      }
      return normalizeChatbotResponse(event.data);
    case 'error':
      throw new Error(normalizeErrorEvent(event.data));
    default:
      return null;
  }
}

function normalizeStatusEvent(value: unknown): ChatbotStreamStatus {
  if (!isRecord(value)) {
    throw new Error('Malformed chatbot stream: invalid status event');
  }
  const label = typeof value.label === 'string' ? value.label : null;
  const step = finiteNumber(value.step);
  const total = finiteNumber(value.total);
  if (label == null || step == null || total == null) {
    throw new Error('Malformed chatbot stream: invalid status event');
  }
  return { label, step, total };
}

function normalizeArtifactsEvent(value: unknown): ChatbotStreamArtifacts {
  const normalized = normalizeChatbotResponse({
    answer: '',
    ...(isRecord(value) ? value : {}),
  } as ChatbotResponse);
  return {
    uiActions: normalized.uiActions,
    uiArtifacts: normalized.uiArtifacts,
    uiSummary: normalized.uiSummary,
  };
}

function normalizeAnswerDeltaEvent(value: unknown): string {
  if (!isRecord(value) || typeof value.text !== 'string') {
    throw new Error('Malformed chatbot stream: invalid answer delta event');
  }
  return value.text;
}

function normalizeErrorEvent(value: unknown): string {
  if (isRecord(value) && typeof value.message === 'string' && value.message.trim()) {
    return value.message;
  }
  return 'AI 집찾기 응답을 불러오지 못했습니다.';
}

function isAbortFailure(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted === true) {
    return true;
  }
  return error instanceof DOMException && error.name === 'AbortError';
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== 'number') {
    return null;
  }
  return Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
