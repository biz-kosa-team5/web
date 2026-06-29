import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type {
  ChatbotUiAction,
  ChatbotUiArtifact,
  ComparisonBarChartArtifact,
  ComparisonChartMetric,
  RankingListArtifact,
  RecommendationListArtifact,
  TrendLineChartArtifact,
  TrendLineChartPoint,
} from './chatbotTypes';

type ChatbotArtifactsProps = {
  actions: ChatbotUiAction[];
  artifacts: ChatbotUiArtifact[];
  onUiAction: (action: ChatbotUiAction) => void;
};

export function ChatbotArtifacts({ actions, artifacts, onUiAction }: ChatbotArtifactsProps) {
  if (artifacts.length === 0) {
    return null;
  }

  const actionById = new Map(actions.map((action) => [action.id, action]));

  function runAction(actionId: string | null) {
    if (actionId == null) {
      return;
    }
    const action = actionById.get(actionId);
    if (action != null) {
      onUiAction(action);
    }
  }

  return (
    <div className="chatbot-artifacts" aria-label="챗봇 시각 자료">
      {artifacts.map((artifact) => {
        switch (artifact.type) {
          case 'comparison_bar_chart':
            return (
              <ComparisonArtifact
                artifact={artifact}
                key={artifact.id}
                onAction={runAction}
              />
            );
          case 'trend_line_chart':
            return <TrendArtifact artifact={artifact} key={artifact.id} />;
          case 'ranking_list':
            return (
              <RankingArtifact
                artifact={artifact}
                key={artifact.id}
                onAction={runAction}
              />
            );
          case 'recommendation_list':
            return (
              <RecommendationArtifact
                artifact={artifact}
                key={artifact.id}
                onAction={runAction}
              />
            );
        }
      })}
    </div>
  );
}

function ComparisonArtifact({
  artifact,
  onAction,
}: {
  artifact: ComparisonBarChartArtifact;
  onAction: (actionId: string | null) => void;
}) {
  const initialMetric = artifact.metrics.some((metric) => metric.key === artifact.defaultMetric)
    ? artifact.defaultMetric
    : artifact.metrics[0].key;
  const [selectedMetricKey, setSelectedMetricKey] = useState(initialMetric);
  const selectedMetric = artifact.metrics.find((metric) => metric.key === selectedMetricKey) ?? artifact.metrics[0];
  const data = useMemo(
    () => artifact.items.map((item) => ({
      name: item.name,
      value: item.values[selectedMetric.key] ?? 0,
      actionId: item.actionId,
    })),
    [artifact.items, selectedMetric.key],
  );

  return (
    <section className="chatbot-artifact" data-chatbot-artifact-type={artifact.type}>
      <ArtifactHeader title={artifact.title} />
      {artifact.metrics.length > 1 ? (
        <div className="chatbot-metric-toggle" role="group" aria-label="비교 기준 선택">
          {artifact.metrics.map((metric) => (
            <button
              type="button"
              aria-pressed={metric.key === selectedMetric.key}
              key={metric.key}
              onClick={() => setSelectedMetricKey(metric.key)}
            >
              {compactMetricLabel(metric)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="chatbot-chart-canvas chatbot-chart-canvas-bar">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} tickMargin={6} />
            <YAxis hide />
            <Tooltip content={<ComparisonTooltip metric={selectedMetric} />} />
            <Bar
              dataKey="value"
              fill="var(--hs-color-primary)"
              radius={[3, 3, 0, 0]}
              onClick={(entry: unknown) => {
                if (isChartPayload(entry)) {
                  onAction(entry.actionId);
                }
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {selectedMetric.direction === 'lower_is_closer' ? (
        <p className="chatbot-artifact-note">낮을수록 가까움</p>
      ) : null}
      <div className="chatbot-chart-action-list" aria-label="비교 대상 지도 보기">
        {artifact.items.map((item) => (
          item.actionId == null ? null : (
            <button type="button" key={item.name} onClick={() => onAction(item.actionId)}>
              {item.name}
            </button>
          )
        ))}
      </div>
    </section>
  );
}

function ComparisonTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ payload: { name: string; value: number } }>;
  metric: ComparisonChartMetric;
}) {
  if (!active || payload == null || payload.length === 0) {
    return null;
  }
  const point = payload[0].payload;
  return (
    <div className="chatbot-chart-tooltip">
      <span>{point.name}</span>
      <strong>{formatMetricValue(point.value, metric.unit)}</strong>
    </div>
  );
}

function TrendArtifact({ artifact }: { artifact: TrendLineChartArtifact }) {
  if (artifact.points.length < 2) {
    return (
      <section className="chatbot-artifact" data-chatbot-artifact-type={artifact.type}>
        <ArtifactHeader title={artifact.title} />
        <p className="chatbot-artifact-empty">표시할 시세 흐름이 없습니다</p>
      </section>
    );
  }

  return (
    <section className="chatbot-artifact" data-chatbot-artifact-type={artifact.type}>
      <ArtifactHeader title={artifact.title} />
      <div className="chatbot-chart-canvas chatbot-chart-canvas-line">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={artifact.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10 }}
              tickFormatter={formatPeriodTick}
              minTickGap={18}
              tickMargin={6}
            />
            <YAxis tickFormatter={(value) => formatAxisValue(Number(value), artifact.unit)} tick={{ fontSize: 10 }} width={42} />
            <Tooltip content={<TrendTooltip unit={artifact.unit} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--hs-color-primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function TrendTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrendLineChartPoint }>;
  unit: string;
}) {
  if (!active || payload == null || payload.length === 0) {
    return null;
  }
  const point = payload[0].payload;
  return (
    <div className="chatbot-chart-tooltip">
      <span>{point.period}</span>
      <strong>{formatMetricValue(point.value, unit)}</strong>
      {point.count == null ? null : <span>{point.count.toLocaleString()}건</span>}
    </div>
  );
}

function RankingArtifact({
  artifact,
  onAction,
}: {
  artifact: RankingListArtifact;
  onAction: (actionId: string | null) => void;
}) {
  return (
    <section className="chatbot-artifact" data-chatbot-artifact-type={artifact.type}>
      <ArtifactHeader title={artifact.title} />
      <ol className="chatbot-ranked-list">
        {artifact.items.map((item) => (
          <li key={`${item.rank}-${item.name}`}>
            <span className="chatbot-rank-number">{item.rank}</span>
            <span className="chatbot-list-main">{item.name}</span>
            <span className="chatbot-list-metric">
              {item.metricLabel}
              {' '}
              {item.metricValue}
            </span>
            {item.actionId == null ? null : (
              <button type="button" onClick={() => onAction(item.actionId)}>
                지도 보기
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function RecommendationArtifact({
  artifact,
  onAction,
}: {
  artifact: RecommendationListArtifact;
  onAction: (actionId: string | null) => void;
}) {
  return (
    <section className="chatbot-artifact" data-chatbot-artifact-type={artifact.type}>
      <ArtifactHeader title={artifact.title} />
      <ul className="chatbot-recommendation-list">
        {artifact.items.map((item) => (
          <li key={item.name}>
            <button
              type="button"
              disabled={item.actionId == null}
              onClick={() => onAction(item.actionId)}
            >
              <span className="chatbot-list-main">{item.name}</span>
              {item.priceText ? <strong>{item.priceText}</strong> : null}
              {item.meta.length > 0 ? <span>{item.meta.slice(0, 3).join(' · ')}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArtifactHeader({ title }: { title: string }) {
  return (
    <div className="chatbot-artifact-header">
      <h3>{title}</h3>
    </div>
  );
}

function compactMetricLabel(metric: ComparisonChartMetric): string {
  const labels: Record<string, string> = {
    latestDealAmount: '최근가',
    pricePerPyeong: '평당가',
    unitCnt: '세대수',
    nearestStationDistanceM: '역거리',
    nearestSchoolDistanceM: '학교거리',
  };
  return labels[metric.key] ?? metric.label;
}

function formatMetricValue(value: number, unit: string): string {
  if (unit === '만원') {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}억원`;
    }
    return `${Math.round(value).toLocaleString()}만원`;
  }
  if (unit === 'm') {
    return `${Math.round(value).toLocaleString()}m`;
  }
  return unit ? `${Math.round(value).toLocaleString()}${unit}` : value.toLocaleString();
}

function formatAxisValue(value: number, unit: string): string {
  if (unit === '만원') {
    return `${(value / 10000).toFixed(1)}억`;
  }
  return value >= 1000 ? `${Math.round(value / 1000).toLocaleString()}천` : `${Math.round(value)}`;
}

function formatPeriodTick(value: string): string {
  const [year, month] = value.split('-');
  return year && month ? `${year.slice(2)}-${month}` : value;
}

function isChartPayload(value: unknown): value is { actionId: string | null } {
  return typeof value === 'object' && value !== null && 'actionId' in value;
}
