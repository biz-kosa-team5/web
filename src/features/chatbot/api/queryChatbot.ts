import { readProblemDetail } from '../../map/api/readProblemDetail';
import { resolveApiUrl } from '../../map/api/resolveApiUrl';
import { normalizeChatbotConversationMemoryPatch } from '../chatbotMemory';
import type {
  ChatbotConversationContext,
  ChatbotResponse,
  ChatbotUiAction,
  ChatbotUiArtifact,
  ChatbotUiSummary,
  ComparisonBarChartArtifact,
  ComparisonChartMetric,
  RankingListArtifact,
  RecommendationListArtifact,
  TrendLineChartArtifact,
} from '../chatbotTypes';

const CHATBOT_QUERY_PATH = '/api/v1/chatbot/query';

export async function queryChatbot(
  question: string,
  conversationContext?: ChatbotConversationContext | null,
): Promise<ChatbotResponse> {
  const response = await fetch(resolveApiUrl(CHATBOT_QUERY_PATH), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      ...(conversationContext == null ? {} : { conversationContext }),
    }),
  });

  if (!response.ok) {
    const detail = await readProblemDetail(response);
    throw new Error(
      `Failed to query chatbot: ${response.status}${detail ? ` ${detail}` : ''}`,
    );
  }

  const payload: unknown = await response.json();
  if (!isChatbotResponse(payload)) {
    throw new Error('Invalid chatbot response: expected a JSON object with string answer');
  }

  return normalizeChatbotResponse(payload);
}

export function isChatbotResponse(value: unknown): value is ChatbotResponse {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && typeof (value as Record<string, unknown>).answer === 'string'
  );
}

export function normalizeChatbotResponse(payload: ChatbotResponse): ChatbotResponse {
  const normalized: ChatbotResponse = {
    ...payload,
    uiActions: normalizeUiActions(payload.uiActions),
    uiArtifacts: normalizeUiArtifacts(payload.uiArtifacts),
    uiSummary: normalizeUiSummary(payload.uiSummary),
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'conversationMemoryPatch')) {
    normalized.conversationMemoryPatch = normalizeChatbotConversationMemoryPatch(
      payload.conversationMemoryPatch,
    );
  }

  return normalized;
}

function normalizeUiActions(value: unknown): ChatbotUiAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const action = normalizeUiAction(item);
    return action == null ? [] : [action];
  });
}

function normalizeUiAction(value: unknown): ChatbotUiAction | null {
  if (!isRecord(value) || value.type !== 'focus_map') {
    return null;
  }
  const target = value.target;
  if (!isRecord(target) || (target.kind !== 'complex' && target.kind !== 'region')) {
    return null;
  }

  const latitude = finiteNumber(target.latitude);
  const longitude = finiteNumber(target.longitude);
  const level = finiteNumber(target.level);
  if (latitude == null || longitude == null || level == null || level <= 0) {
    return null;
  }

  const label = toStringValue(value.label);
  const id = toStringValue(value.id);
  if (label == null || id == null) {
    return null;
  }

  return {
    id,
    type: 'focus_map',
    label,
    autoRun: value.autoRun === true,
    priority: value.priority === 'primary' ? 'primary' : 'secondary',
    source: toStringValue(value.source) ?? '',
    target: {
      kind: target.kind,
      name: toStringValue(target.name) ?? '',
      complexId: nullableNumber(target.complexId),
      parcelId: nullableNumber(target.parcelId),
      latitude,
      longitude,
      level,
      openDetail: target.openDetail === true,
    },
  };
}

function normalizeUiArtifacts(value: unknown): ChatbotUiArtifact[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const artifact = normalizeUiArtifact(item);
    return artifact == null ? [] : [artifact];
  });
}

function normalizeUiArtifact(value: unknown): ChatbotUiArtifact | null {
  if (!isRecord(value)) {
    return null;
  }

  switch (value.type) {
    case 'comparison_bar_chart':
      return normalizeComparisonArtifact(value);
    case 'trend_line_chart':
      return normalizeTrendArtifact(value);
    case 'ranking_list':
      return normalizeRankingArtifact(value);
    case 'recommendation_list':
      return normalizeRecommendationArtifact(value);
    default:
      return null;
  }
}

function normalizeComparisonArtifact(value: Record<string, unknown>): ComparisonBarChartArtifact | null {
  const metrics = Array.isArray(value.metrics)
    ? value.metrics.flatMap((metric) => {
        const normalized = normalizeComparisonMetric(metric);
        return normalized == null ? [] : [normalized];
      })
    : [];
  const items = Array.isArray(value.items)
    ? value.items.flatMap((item) => {
        const normalized = normalizeComparisonItem(item);
        return normalized == null ? [] : [normalized];
      })
    : [];

  if (metrics.length === 0 || items.length < 2) {
    return null;
  }

  return {
    id: toStringValue(value.id) ?? 'comparison_bar_chart',
    type: 'comparison_bar_chart',
    title: toStringValue(value.title) ?? '단지 비교',
    source: toStringValue(value.source) ?? '',
    defaultMetric: toStringValue(value.defaultMetric) ?? metrics[0].key,
    metrics,
    items,
  };
}

function normalizeComparisonMetric(value: unknown): ComparisonChartMetric | null {
  if (!isRecord(value)) {
    return null;
  }
  const key = toStringValue(value.key);
  const label = toStringValue(value.label);
  if (key == null || label == null) {
    return null;
  }
  return {
    key,
    label,
    unit: toStringValue(value.unit) ?? '',
    direction: toStringValue(value.direction) ?? '',
  };
}

function normalizeComparisonItem(value: unknown): ComparisonBarChartArtifact['items'][number] | null {
  if (!isRecord(value) || !isRecord(value.values)) {
    return null;
  }
  const values: Record<string, number> = {};
  for (const [key, rawValue] of Object.entries(value.values)) {
    const numberValue = finiteNumber(rawValue);
    if (numberValue != null) {
      values[key] = numberValue;
    }
  }
  if (Object.keys(values).length === 0) {
    return null;
  }
  return {
    name: toStringValue(value.name) ?? '이름 없음',
    complexId: nullableNumber(value.complexId),
    parcelId: nullableNumber(value.parcelId),
    actionId: toStringValue(value.actionId),
    values,
  };
}

function normalizeTrendArtifact(value: Record<string, unknown>): TrendLineChartArtifact | null {
  const points = Array.isArray(value.points)
    ? value.points.flatMap((point) => {
        const normalized = normalizeTrendPoint(point);
        return normalized == null ? [] : [normalized];
      })
    : [];
  if (points.length < 2) {
    return null;
  }
  return {
    id: toStringValue(value.id) ?? 'trend_line_chart',
    type: 'trend_line_chart',
    title: toStringValue(value.title) ?? '시세 흐름',
    source: toStringValue(value.source) ?? '',
    unit: toStringValue(value.unit) ?? '',
    points,
  };
}

function normalizeTrendPoint(value: unknown): TrendLineChartArtifact['points'][number] | null {
  if (!isRecord(value)) {
    return null;
  }
  const period = toStringValue(value.period);
  const pointValue = finiteNumber(value.value);
  if (period == null || pointValue == null) {
    return null;
  }
  return {
    period,
    value: pointValue,
    count: nullableNumber(value.count),
  };
}

function normalizeRankingArtifact(value: Record<string, unknown>): RankingListArtifact | null {
  const items = Array.isArray(value.items)
    ? value.items.flatMap((item) => {
        const normalized = normalizeRankingItem(item);
        return normalized == null ? [] : [normalized];
      })
    : [];
  if (items.length === 0) {
    return null;
  }
  return {
    id: toStringValue(value.id) ?? 'ranking_list',
    type: 'ranking_list',
    title: toStringValue(value.title) ?? '순위',
    source: toStringValue(value.source) ?? '',
    items,
  };
}

function normalizeRankingItem(value: unknown): RankingListArtifact['items'][number] | null {
  if (!isRecord(value)) {
    return null;
  }
  const rank = finiteNumber(value.rank);
  const name = toStringValue(value.name);
  if (rank == null || name == null) {
    return null;
  }
  return {
    rank,
    name,
    metricLabel: toStringValue(value.metricLabel) ?? '',
    metricValue: toStringValue(value.metricValue) ?? '',
    actionId: toStringValue(value.actionId),
  };
}

function normalizeRecommendationArtifact(value: Record<string, unknown>): RecommendationListArtifact | null {
  const items = Array.isArray(value.items)
    ? value.items.flatMap((item) => {
        const normalized = normalizeRecommendationItem(item);
        return normalized == null ? [] : [normalized];
      })
    : [];
  if (items.length === 0) {
    return null;
  }
  return {
    id: toStringValue(value.id) ?? 'recommendation_list',
    type: 'recommendation_list',
    title: toStringValue(value.title) ?? '추천 후보',
    source: toStringValue(value.source) ?? '',
    items,
  };
}

function normalizeRecommendationItem(value: unknown): RecommendationListArtifact['items'][number] | null {
  if (!isRecord(value)) {
    return null;
  }
  const name = toStringValue(value.name);
  if (name == null) {
    return null;
  }
  return {
    name,
    priceText: toStringValue(value.priceText) ?? '',
    meta: Array.isArray(value.meta) ? value.meta.flatMap((item) => toStringValue(item) ?? []) : [],
    actionId: toStringValue(value.actionId),
  };
}

function normalizeUiSummary(value: unknown): ChatbotUiSummary | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    hasMapFocus: value.hasMapFocus === true,
    primaryTargetName: toStringValue(value.primaryTargetName),
    primaryActionLabel: toStringValue(value.primaryActionLabel),
    artifactTypes: Array.isArray(value.artifactTypes)
      ? value.artifactTypes.flatMap((item) => toStringValue(item) ?? [])
      : [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim().length === 0)) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function nullableNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  return finiteNumber(value);
}
