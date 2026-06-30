import type {
  RegionComplexSummary,
  RegionDetail,
  RegionSummary,
} from '../../features/region/api/fetchRegions';
import type { PanelRequestState, RegionTrailItem } from '../appTypes';
import { formatAddress, regionStepLabel } from '../appUtils';

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
  const breadcrumbLabels = [
    regionTrail[0]?.name ?? '시군구 선택',
    regionTrail[1]?.name ?? '읍면동 선택',
    regionTrail[2]?.name ?? '단지 선택',
  ];
  const shouldShowComplexes = regionDetail != null && regionDetail.children.length === 0;

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
          {breadcrumbLabels[0]}
        </button>
        <span aria-hidden="true" className="region-breadcrumb-separator">&gt;</span>
        <span data-region-step-state={regionTrail.length >= 2 ? 'selected' : 'idle'}>
          {breadcrumbLabels[1]}
        </span>
        <span aria-hidden="true" className="region-breadcrumb-separator">&gt;</span>
        <span data-region-step-state={regionTrail.length >= 3 ? 'selected' : 'idle'}>
          {breadcrumbLabels[2]}
        </span>
      </nav>
      <div className="region-step-summary">
        <p>{regionStepLabel(regionTrail.length)}</p>
        <button type="button" aria-label="상위 지역 불러오기" onClick={onLoadRootRegions}>
          처음부터
        </button>
      </div>
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

      {shouldShowComplexes ? (
        <section aria-label="선택한 읍면동 단지" className="region-complex-section">
          <div className="panel-section-header">
            <p>단지</p>
            <span>{regionComplexes.length.toLocaleString()}개</span>
          </div>

          {regionComplexes.length > 0 ? (
            <ul aria-label="지역 단지 목록" className="panel-list region-complex-list">
              {regionComplexes.map((complex) => {
                const meta = complexMeta(complex);

                return (
                  <li key={complex.complexId}>
                    <button
                      type="button"
                      className="region-complex-card"
                      aria-label={`지역 단지 선택 ${complex.complexName}`}
                      onClick={() => {
                        onRegionComplexSelect(complex);
                      }}
                    >
                      <span className="region-complex-copy">
                        <span className="region-complex-name">{complex.complexName}</span>
                        <span className="region-complex-address">
                          {formatAddress(complex.address)}
                        </span>
                        {meta.length > 0 ? (
                          <span className="region-complex-meta" aria-label="단지 요약">
                            {meta.map((item) => (
                              <span key={item}>{item}</span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="panel-message" role="status">
              선택한 읍면동의 단지 정보가 없습니다
            </p>
          )}
        </section>
      ) : null}
    </section>
  );
}

function complexMeta(complex: RegionComplexSummary): string[] {
  const meta: string[] = [];

  if (complex.unitCnt != null) {
    meta.push(`${complex.unitCnt.toLocaleString()}세대`);
  }
  if (complex.dongCnt != null) {
    meta.push(`${complex.dongCnt.toLocaleString()}동`);
  }

  const approvalYear = complex.useDate?.match(/^\d{4}/)?.[0];
  if (approvalYear != null) {
    meta.push(`${approvalYear}년 승인`);
  }

  return meta;
}
