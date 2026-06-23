import { readProblemDetail } from '../../map/api/readProblemDetail';
import { resolveApiUrl } from '../../map/api/resolveApiUrl';
import type { ChatbotJsonResponse } from '../chatbotTypes';

const CHATBOT_QUERY_PATH = '/api/v1/chatbot/query';

export async function queryChatbot(question: string): Promise<ChatbotJsonResponse> {
  const response = await fetch(resolveApiUrl(CHATBOT_QUERY_PATH), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const detail = await readProblemDetail(response);
    throw new Error(
      `Failed to query chatbot: ${response.status}${detail ? ` ${detail}` : ''}`,
    );
  }

  const payload: unknown = await response.json();
  if (!isJsonObject(payload)) {
    throw new Error('Invalid chatbot response: expected a JSON object');
  }

  return payload;
}

function isJsonObject(value: unknown): value is ChatbotJsonResponse {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
