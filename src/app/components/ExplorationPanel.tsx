import type { ParcelComplexSummary } from '../../features/complex-detail/api/fetchParcelComplexes';
import type { ParcelTrades, TradeItem } from '../../features/complex-detail/api/fetchParcelTrades';
import type { TradeTrendPoint } from '../../features/complex-detail/api/fetchTradeTrend';
import type { ComplexDetail } from '../../features/complex-detail/api/fetchComplexDetail';
import { DetailSidebar } from '../../features/complex-detail/DetailSidebar';
import type {
  RegionComplexSummary,
  RegionDetail,
  RegionSummary,
} from '../../features/region/api/fetchRegions';
import type { ComplexSuggestion } from '../../features/search/api/fetchComplexSuggestions';
import type { ComplexSearchResult } from '../../features/search/api/fetchComplexSearchResults';
import type {
  ComplexSelection,
  ComplexSummarySelection,
  DetailRequestState,
  PanelRequestState,
  RegionTrailItem,
  SidebarMode,
} from '../appTypes';
import { explorationSummaryLabel } from '../appUtils';
import { RegionPanel } from './RegionPanel';
import { SearchForm, SearchPanel } from './SearchPanel';
import type { FormEvent } from 'react';

export function ExplorationPanel({
  complexDetail,
  complexSuggestions,
  detailError,
  detailState,
  isExplorationOpen,
  onCloseDetail,
  onComplexSelect,
  onLoadMoreTrades,
  onLoadRootRegions,
  onRetryDetail,
  onSearchInputChange,
  onSearchResultSelect,
  onSearchSubmit,
  onSuggestionSelect,
  onRegionComplexSelect,
  onRegionSelect,
  parcelComplexes,
  parcelTrades,
  regionComplexes,
  regionDetail,
  regionError,
  regionState,
  regionTrail,
  rootRegions,
  searchError,
  searchResults,
  searchState,
  selectedComplex,
  sidebarMode,
  tradeRows,
  tradeTrend,
}: {
  complexDetail: ComplexDetail | null;
  complexSuggestions: ComplexSuggestion[];
  detailError: string | null;
  detailState: DetailRequestState;
  isExplorationOpen: boolean;
  onCloseDetail: () => void;
  onComplexSelect: (complex: ComplexSummarySelection) => void;
  onLoadMoreTrades: () => void;
  onLoadRootRegions: () => void;
  onRetryDetail: () => void;
  onSearchInputChange: (value: string) => void;
  onSearchResultSelect: (result: ComplexSearchResult) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSuggestionSelect: (suggestion: ComplexSuggestion) => void;
  onRegionComplexSelect: (complex: RegionComplexSummary) => void;
  onRegionSelect: (region: RegionTrailItem) => void;
  parcelComplexes: ParcelComplexSummary[];
  parcelTrades: ParcelTrades | null;
  regionComplexes: RegionComplexSummary[];
  regionDetail: RegionDetail | null;
  regionError: string | null;
  regionState: PanelRequestState;
  regionTrail: RegionTrailItem[];
  rootRegions: RegionSummary[];
  searchError: string | null;
  searchResults: ComplexSearchResult[];
  searchState: PanelRequestState;
  selectedComplex: ComplexSelection | null;
  sidebarMode: SidebarMode;
  tradeRows: TradeItem[];
  tradeTrend: TradeTrendPoint[];
}) {
  return (
    <section
      id="exploration-panel"
      aria-label="탐색 패널"
      aria-hidden={!isExplorationOpen}
      className="exploration-panel"
      data-collapsed={isExplorationOpen ? 'false' : 'true'}
      data-sidebar-mode={sidebarMode}
      data-ui-layer="exploration-panel"
      hidden={!isExplorationOpen}
    >
      <div className="exploration-panel-header" hidden={sidebarMode === 'detail'}>
        <p>탐색</p>
        <span>{explorationSummaryLabel(searchResults.length, 0)}</span>
      </div>

      <SearchForm
        hidden={sidebarMode === 'detail'}
        onInputChange={onSearchInputChange}
        onSubmit={onSearchSubmit}
      />

      {selectedComplex == null ? null : (
        <DetailSidebar
          complexDetail={complexDetail}
          detailError={detailError}
          detailState={detailState}
          onBack={onCloseDetail}
          onComplexSelect={onComplexSelect}
          onRetryDetail={onRetryDetail}
          onLoadMoreTrades={onLoadMoreTrades}
          parcelComplexes={parcelComplexes}
          parcelTrades={parcelTrades}
          tradeTrend={tradeTrend}
          tradeRows={tradeRows}
          selection={selectedComplex}
        />
      )}

      <SearchPanel
        complexSuggestions={complexSuggestions}
        hidden={sidebarMode !== 'search'}
        onSearchResultSelect={onSearchResultSelect}
        onSuggestionSelect={onSuggestionSelect}
        searchError={searchError}
        searchResults={searchResults}
        searchState={searchState}
      />

      <RegionPanel
        hidden={sidebarMode !== 'region'}
        onLoadRootRegions={onLoadRootRegions}
        onRegionComplexSelect={onRegionComplexSelect}
        onRegionSelect={onRegionSelect}
        regionComplexes={regionComplexes}
        regionDetail={regionDetail}
        regionError={regionError}
        regionState={regionState}
        regionTrail={regionTrail}
        rootRegions={rootRegions}
      />
    </section>
  );
}
