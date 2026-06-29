import type { ChatbotUiAction } from './chatbotTypes';

type ChatbotActionRowProps = {
  actions: ChatbotUiAction[];
  onUiAction: (action: ChatbotUiAction) => void;
};

export function ChatbotActionRow({ actions, onUiAction }: ChatbotActionRowProps) {
  if (actions.length === 0) {
    return null;
  }

  const primaryAction = actions.find((action) => action.autoRun) ?? actions[0];
  const secondaryActions = actions.filter((action) => action.id !== primaryAction.id);

  return (
    <div className="chatbot-action-row" aria-label="챗봇 지도 동작">
      {primaryAction.autoRun ? (
        <span className="chatbot-action-status">지도에 표시했어요</span>
      ) : null}
      <button
        type="button"
        className="chatbot-action-button"
        onClick={() => onUiAction(primaryAction)}
      >
        {primaryAction.autoRun ? '지도에서 다시 보기' : primaryAction.label}
      </button>
      {secondaryActions.map((action) => (
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
