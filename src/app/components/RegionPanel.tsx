import type { RegionComplexSummary, RegionDetail, RegionSummary } from '../../features/region/api/fetchRegions';
import type { PanelRequestState, RegionTrailItem } from '../appTypes';
import { formatAddress, regionStepLabel } from '../appUtils';
import { DataCountStrip } from './DataCountStrip';

export function RegionPanel({
  hidden,
  onLoadRootRegions,
  onRegionComplexSelect,
  onRegionSelect,
  regionComplexes,
  regionDetail,
  regionError,
  regionState,
  regionTrail,
  rootRegions,
}: {
  hidden: boolean;
  onLoadRootRegions: () => void;
  onRegionComplexSelect: (complex: RegionComplexSummary) => void;
  onRegionSelect: (region: RegionTrailItem) => void;
  regionComplexes: RegionComplexSummary[];
  regionDetail: RegionDetail | null;
  regionError: string | null;
  regionState: PanelRequestState;
  regionTrail: RegionTrailItem[];
  rootRegions: RegionSummary[];
}) {
  return (
    <section
      id="exploration-panel-region"
      aria-label="지역 탐색 패널"
      className="panel-section region-panel"
      data-api-flow="region"
      hidden={hidden}
    >
      <div className="panel-section-header">
        <p>지역</p>
        {regionDetail ? <span>{regionDetail.name}</span> : <span>전체</span>}
      </div>
      <nav aria-label="지역 단계" className="region-breadcrumb">
        <button type="button" aria-label="지역 처음으로" onClick={onLoadRootRegions}>
          시도 선택
        </button>
        {regionTrail.map((region) => (
          <span key={region.id}>{region.name}</span>
        ))}
      </nav>
      <div className="region-step-summary">
        <p>{regionStepLabel(regionTrail.length)}</p>
        <button type="button" aria-label="상위 지역 불러오기" onClick={onLoadRootRegions}>
          처음부터
        </button>
      </div>
      <DataCountStrip
        items={[
          ['하위 지역', rootRegions.length],
          ['단지', regionComplexes.length],
        ]}
      />

      {regionState === 'loading' ? (
        <p className="panel-message" role="status" aria-live="polite">
          지역 불러오는 중
        </p>
      ) : null}

      {regionState === 'empty' ? (
        <p className="panel-message" role="status" aria-live="polite">
          지역이 없습니다
        </p>
      ) : null}

      {regionState === 'error' ? (
        <p className="panel-message panel-message-error" role="alert">
          지역 탐색을 사용할 수 없습니다.
          {regionError ? ` ${regionError}` : null}
        </p>
      ) : null}

      {rootRegions.length > 0 ? (
        <ul aria-label="지역 탐색" className="panel-list region-grid-list">
          {rootRegions.map((region) => (
            <li key={region.id}>
              <button
                type="button"
                aria-label={`지역 이동 ${region.name}`}
                onClick={() => {
                  onRegionSelect(region);
                }}
              >
                {region.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {regionComplexes.length > 0 ? (
        <ul aria-label="지역 단지 목록" className="panel-list">
          {regionComplexes.map((complex) => (
            <li key={complex.complexId}>
              <button
                type="button"
                aria-label={`지역 단지 선택 ${complex.complexName}`}
                onClick={() => {
                  onRegionComplexSelect(complex);
                }}
              >
                <span>{complex.complexName}</span>
                <span>{formatAddress(complex.address)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
