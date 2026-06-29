import type { ChatbotUiAction } from './chatbotTypes';

type ChatbotActionRowProps = {
  actions: ChatbotUiAction[];
  onUiAction: (action: ChatbotUiAction) => void;
};

export function ChatbotActionRow({ actions, onUiAction }: ChatbotActionRowProps) {
  if (actions.length === 0) {
    return null;
  }

  const hasAutoRunAction = actions.some((action) => action.autoRun);

  return (
    <div className="chatbot-action-row" aria-label="챗봇 지도 동작">
      {hasAutoRunAction ? (
        <span className="chatbot-action-status">지도에 표시했어요</span>
      ) : null}
      {actions.map((action) => (
        <button
          type="button"
          className="chatbot-action-button"
          key={action.id}
          onClick={() => onUiAction(action)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
