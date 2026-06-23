export type ChatbotJsonResponse = Record<string, unknown>;

export type ChatbotMessage =
  | {
      id: string;
      role: 'user';
      content: string;
    }
  | {
      id: string;
      role: 'assistant';
      json: ChatbotJsonResponse;
    };

export type ChatbotRequestState =
  | {
      status: 'idle';
      error: null;
    }
  | {
      status: 'loading';
      error: null;
    }
  | {
      status: 'error';
      error: string;
    };
