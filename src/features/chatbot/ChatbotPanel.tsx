import type { FormEvent } from 'react';

import { ChatbotActionRow } from './ChatbotActionRow';
import { ChatbotArtifacts } from './ChatbotArtifacts';
import type {
  ChatbotMessage,
  ChatbotRequestState,
  ChatbotUiAction,
} from './chatbotTypes';

type ChatbotPanelProps = {
  inputValue: string;
  isOpen: boolean;
  messages: ChatbotMessage[];
  requestState: ChatbotRequestState;
  onClose: () => void;
  onInputChange: (value: string) => void;
  onOpen: () => void;
  onSubmit: () => void;
  onUiAction: (action: ChatbotUiAction) => void;
};

export function ChatbotPanel({
  inputValue,
  isOpen,
  messages,
  requestState,
  onClose,
  onInputChange,
  onOpen,
  onSubmit,
  onUiAction,
}: ChatbotPanelProps) {
  if (!isOpen) {
    return (
      <button
        type="button"
        className="chatbot-launcher"
        aria-label="챗봇 열기"
        onClick={onOpen}
      >
        챗봇
      </button>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  const isLoading = requestState.status === 'loading';

  return (
    <aside className="chatbot-panel" aria-label="챗봇 패널">
      <header className="chatbot-panel-header">
        <div>
          <h2>챗봇</h2>
          {isLoading ? <p>응답 생성 중</p> : null}
        </div>
        <button type="button" aria-label="챗봇 닫기" onClick={onClose}>
          닫기
        </button>
      </header>

      <div className="chatbot-message-list" aria-live="polite">
        {messages.map((message) => (
          <article
            key={message.id}
            className="chatbot-message"
            data-chatbot-message-role={message.role}
          >
            <p className="chatbot-message-bubble">{message.content}</p>
            {message.role === 'assistant' ? (
              <>
                <ChatbotArtifacts
                  actions={message.response.uiActions}
                  artifacts={message.response.uiArtifacts}
                  onUiAction={onUiAction}
                />
                <ChatbotActionRow
                  actions={message.response.uiActions}
                  onUiAction={onUiAction}
                />
              </>
            ) : null}
          </article>
        ))}

        {isLoading ? (
          <p className="chatbot-loading" role="status">
            응답 생성 중
          </p>
        ) : null}
      </div>

      <form className="chatbot-form" onSubmit={handleSubmit}>
        {requestState.status === 'error' ? (
          <p className="chatbot-error" role="alert">
            {requestState.error}
          </p>
        ) : null}
        <label htmlFor="chatbot-question">질문</label>
        <textarea
          id="chatbot-question"
          rows={3}
          value={inputValue}
          placeholder="질문을 입력하세요"
          onChange={(event) => onInputChange(event.currentTarget.value)}
        />
        <button type="submit" disabled={isLoading || inputValue.trim().length === 0}>
          전송
        </button>
      </form>
    </aside>
  );
}
