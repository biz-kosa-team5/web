export type ChatbotResponse = Record<string, unknown> & {
  answer: string;
  resolvedQuestion?: string;
  conversationResolution?: ChatbotConversationResolution | null;
  conversationMemoryPatch?: ChatbotConversationMemoryPatch | null;
  uiActions: ChatbotUiAction[];
  uiArtifacts: ChatbotUiArtifact[];
  uiSummary: ChatbotUiSummary | null;
};

export type ChatbotConversationVersion = 'v1';

export type ChatbotConversationRegion = {
  name: string;
  code?: string;
  type?: string;
};

export type ChatbotConversationTarget = {
  complexId?: number;
  complexName: string;
  address?: string;
};

export type ChatbotConversationItem = ChatbotConversationTarget & {
  index: number;
  kind: 'complex';
  tradeId?: number;
  dealDate?: string;
  dealAmount?: number;
};

export type ChatbotConversationMemory = {
  version: ChatbotConversationVersion;
  activeRegion?: ChatbotConversationRegion;
  activeComplex?: ChatbotConversationTarget;
  items: ChatbotConversationItem[];
  lastHandler?: string;
  lastQueryType?: string;
  updatedAt: string;
  expiresAt: string;
};

export type ChatbotConversationContext = ChatbotConversationMemory;

export type ChatbotConversationMemoryPatch = {
  version: ChatbotConversationVersion;
  activeRegion?: ChatbotConversationRegion;
  activeComplex?: ChatbotConversationTarget;
  items?: ChatbotConversationItem[];
  lastHandler?: string;
  lastQueryType?: string;
  updatedAt?: string;
  expiresAt?: string;
};

export type ChatbotConversationResolution = {
  applied: boolean;
  source?: string;
  matchedText?: string;
  resolvedTarget?: string;
  reason?: string;
};

export type ChatbotUiAction = {
  id: string;
  type: 'focus_map';
  label: string;
  autoRun: boolean;
  priority: 'primary' | 'secondary';
  source: string;
  target: {
    kind: 'complex' | 'region';
    name: string;
    complexId: number | null;
    parcelId: number | null;
    latitude: number;
    longitude: number;
    level: number;
    openDetail: boolean;
  };
};

export type ChatbotUiSummary = {
  hasMapFocus: boolean;
  primaryTargetName: string | null;
  primaryActionLabel: string | null;
  artifactTypes: string[];
};

export type ChatbotUiArtifact =
  | ComparisonBarChartArtifact
  | TrendLineChartArtifact
  | RankingListArtifact
  | RecommendationListArtifact;

export type ComparisonBarChartArtifact = {
  id: string;
  type: 'comparison_bar_chart';
  title: string;
  source: string;
  defaultMetric: string;
  metrics: ComparisonChartMetric[];
  items: ComparisonChartItem[];
};

export type ComparisonChartMetric = {
  key: string;
  label: string;
  unit: string;
  direction: string;
};

export type ComparisonChartItem = {
  name: string;
  complexId: number | null;
  parcelId: number | null;
  actionId: string | null;
  values: Record<string, number>;
};

export type TrendLineChartArtifact = {
  id: string;
  type: 'trend_line_chart';
  title: string;
  source: string;
  unit: string;
  points: TrendLineChartPoint[];
};

export type TrendLineChartPoint = {
  period: string;
  value: number;
  count: number | null;
};

export type RankingListArtifact = {
  id: string;
  type: 'ranking_list';
  title: string;
  source: string;
  items: RankingListItem[];
};

export type RankingListItem = {
  rank: number;
  name: string;
  metricLabel: string;
  metricValue: string;
  actionId: string | null;
};

export type RecommendationListArtifact = {
  id: string;
  type: 'recommendation_list';
  title: string;
  source: string;
  items: RecommendationListItem[];
};

export type RecommendationListItem = {
  name: string;
  priceText: string;
  meta: string[];
  actionId: string | null;
};

export type ChatbotMessage =
  | {
      id: string;
      role: 'user';
      content: string;
    }
  | {
      id: string;
      role: 'assistant';
      content: string;
      response: ChatbotResponse;
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
