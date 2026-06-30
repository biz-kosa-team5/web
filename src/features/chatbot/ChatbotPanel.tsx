import { useEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

import { ChatbotActionRow } from './ChatbotActionRow';
import { ChatbotArtifacts } from './ChatbotArtifacts';
import type {
  ChatbotMessage,
  ChatbotRequestState,
  ChatbotUiArtifact,
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

type ChatbotPanelSize = {
  height: number;
  width: number;
};

type ChatbotResizeDrag = {
  startHeight: number;
  startWidth: number;
  startX: number;
  startY: number;
};

const DEFAULT_CHATBOT_PANEL_SIZE: ChatbotPanelSize = {
  height: 560,
  width: 380,
};

const MIN_CHATBOT_PANEL_SIZE: ChatbotPanelSize = {
  height: 320,
  width: 320,
};

const PANEL_VIEWPORT_GUTTER = 32;

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
  const [panelSize, setPanelSize] = useState(DEFAULT_CHATBOT_PANEL_SIZE);
  const messageListEndRef = useRef<HTMLDivElement | null>(null);
  const resizeDragRef = useRef<ChatbotResizeDrag | null>(null);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const resizeDrag = resizeDragRef.current;

      if (resizeDrag == null) {
        return;
      }

      setPanelSize(
        clampChatbotPanelSize({
          height: resizeDrag.startHeight + resizeDrag.startY - event.clientY,
          width: resizeDrag.startWidth + resizeDrag.startX - event.clientX,
        }),
      );
    }

    function handlePointerUp() {
      resizeDragRef.current = null;
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      document.documentElement.style.removeProperty('--chatbot-panel-height');
      document.documentElement.style.removeProperty('--chatbot-panel-width');
      return undefined;
    }

    document.documentElement.style.setProperty('--chatbot-panel-height', `${panelSize.height}px`);
    document.documentElement.style.setProperty('--chatbot-panel-width', `${panelSize.width}px`);

    return () => {
      document.documentElement.style.removeProperty('--chatbot-panel-height');
      document.documentElement.style.removeProperty('--chatbot-panel-width');
    };
  }, [isOpen, panelSize.height, panelSize.width]);

  useEffect(() => {
    if (!isOpen || (messages.length === 0 && requestState.status !== 'loading')) {
      return;
    }

    if (typeof messageListEndRef.current?.scrollIntoView !== 'function') {
      return;
    }

    messageListEndRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [isOpen, messages.length, requestState.status]);

  function handleResizePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    resizeDragRef.current = {
      startHeight: panelSize.height,
      startWidth: panelSize.width,
      startX: event.clientX,
      startY: event.clientY,
    };
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        className="chatbot-launcher"
        aria-label="AI 집찾기 열기"
        onClick={onOpen}
      >
        AI 집찾기
      </button>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleQuestionKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    if (isLoading || inputValue.trim().length === 0) {
      return;
    }

    event.preventDefault();
    onSubmit();
  }

  const isLoading = requestState.status === 'loading';
  const panelStyle = {
    '--chatbot-panel-height': `${panelSize.height}px`,
    '--chatbot-panel-width': `${panelSize.width}px`,
    '--chatbot-message-bubble-max-width': `${clamp(Math.round(panelSize.width * 0.74), 280, 680)}px`,
    '--chatbot-assistant-message-width': `${clamp(Math.round(panelSize.width * 0.84), 320, 760)}px`,
  } as CSSProperties;

  return (
    <aside className="chatbot-panel" aria-label="AI 집찾기 패널" style={panelStyle}>
      <button
        type="button"
        className="chatbot-resize-handle"
        aria-label="AI 집찾기 패널 크기 조절"
        onPointerDown={handleResizePointerDown}
      />
      <header className="chatbot-panel-header">
        <div>
          <h2>AI 집찾기</h2>
          {isLoading ? <p>응답 생성 중</p> : null}
        </div>
        <button type="button" aria-label="AI 집찾기 닫기" onClick={onClose}>
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
                {hasLinkedArtifactActions(message.response.uiArtifacts) ? null : (
                  <ChatbotActionRow
                    actions={message.response.uiActions}
                    onUiAction={onUiAction}
                  />
                )}
              </>
            ) : null}
          </article>
        ))}

        {isLoading ? (
          <p className="chatbot-loading" role="status">
            응답 생성 중
          </p>
        ) : null}
        <div ref={messageListEndRef} aria-hidden="true" />
      </div>

      <form className="chatbot-form" onSubmit={handleSubmit}>
        {requestState.status === 'error' ? (
          <p className="chatbot-error" role="alert">
            {requestState.error}
          </p>
        ) : null}
        <label htmlFor="chatbot-question">집찾기 질문</label>
        <textarea
          id="chatbot-question"
          rows={3}
          value={inputValue}
          placeholder="원하는 아파트 조건을 입력하세요"
          onChange={(event) => onInputChange(event.currentTarget.value)}
          onKeyDown={handleQuestionKeyDown}
        />
        <button type="submit" disabled={isLoading || inputValue.trim().length === 0}>
          보내기
        </button>
      </form>
    </aside>
  );
}

function clampChatbotPanelSize(size: ChatbotPanelSize): ChatbotPanelSize {
  const maxWidth = Math.max(
    MIN_CHATBOT_PANEL_SIZE.width,
    window.innerWidth - PANEL_VIEWPORT_GUTTER,
  );
  const maxHeight = Math.max(
    MIN_CHATBOT_PANEL_SIZE.height,
    window.innerHeight - PANEL_VIEWPORT_GUTTER,
  );

  return {
    height: clamp(size.height, MIN_CHATBOT_PANEL_SIZE.height, maxHeight),
    width: clamp(size.width, MIN_CHATBOT_PANEL_SIZE.width, maxWidth),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hasLinkedArtifactActions(artifacts: ChatbotUiArtifact[]): boolean {
  return artifacts.some((artifact) => {
    switch (artifact.type) {
      case 'comparison_bar_chart':
      case 'ranking_list':
      case 'recommendation_list':
        return artifact.items.some((item) => item.actionId != null);
      case 'trend_line_chart':
        return false;
    }
  });
}
