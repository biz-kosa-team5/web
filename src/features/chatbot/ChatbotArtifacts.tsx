import {
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
    <div className="chatbot-artifacts" aria-label="AI 집찾기 시각 자료">
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
  return (
    <section className="chatbot-artifact" data-chatbot-artifact-type={artifact.type}>
      <ArtifactHeader title={artifact.title} />
      <div className="chatbot-comparison-table-wrap">
        <table>
          <caption className="sr-only">단지별 비교 수치</caption>
          <thead>
            <tr>
              <th scope="col">항목</th>
              {artifact.items.map((item) => (
                <th scope="col" key={item.name}>
                  {item.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {artifact.metrics.map((metric) => (
              <tr key={metric.key}>
                <th scope="row">{compactMetricLabel(metric)}</th>
                {artifact.items.map((item) => (
                  <td key={item.name} data-comparison-cell="value">
                    {formatOptionalMetricValue(item.values[metric.key], metric.unit)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {artifact.metrics.some((metric) => metric.direction === 'lower_is_closer') ? (
        <p className="chatbot-artifact-note">거리 항목은 낮을수록 가까움</p>
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

function formatOptionalMetricValue(value: number | undefined, unit: string): string {
  return value == null ? '-' : formatMetricValue(value, unit);
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

