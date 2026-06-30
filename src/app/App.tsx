import { useCallback, useState } from 'react';

import type { ComplexMarkerFilters } from '../features/map/api/fetchMapMarkers';
import type { KakaoMapRuntimeState } from '../features/map/KakaoMapSurface';
import { ChatbotPanel } from '../features/chatbot/ChatbotPanel';
import type { ChatbotUiAction } from '../features/chatbot/chatbotTypes';
import { useChatbot } from '../features/chatbot/useChatbot';
import { EMPTY_COMPLEX_MARKER_FILTERS, SEARCH_FOCUS_DELTA } from './appConstants';
import type {
  AppProps,
  ComplexMapMarker,
  ComplexSelection,
  ComplexSummarySelection,
  RegionMapMarker,
  SidebarMode,
} from './appTypes';
import {
  countActiveFilters,
  initialComplexSelectionFromUrl,
  mapFocusDeltaForLevel,
  nextRegionMarkerLevel,
} from './appUtils';
import { ExplorationPanel } from './components/ExplorationPanel';
import { MapWorkspace } from './components/MapWorkspace';
import { useComplexDetail } from './hooks/useComplexDetail';
import { useComplexSearch } from './hooks/useComplexSearch';
import { useMapMarkers } from './hooks/useMapMarkers';
import { useMapViewport } from './hooks/useMapViewport';
import { useRegionExplorer } from './hooks/useRegionExplorer';
import './App.css';

export function App({
  initialMapLevel,
  initialRegionLoad = true,
  kakaoMapAppKey,
}: AppProps) {
  return (
    <MapApp
      initialMapLevel={initialMapLevel}
      initialRegionLoad={initialRegionLoad}
      kakaoMapAppKey={kakaoMapAppKey}
    />
  );
}

function MapApp({
  initialMapLevel = 8,
  initialRegionLoad = true,
  kakaoMapAppKey = getConfiguredKakaoMapAppKey(),
}: AppProps) {
  const [markerFilters, setMarkerFilters] = useState<ComplexMarkerFilters>(
    EMPTY_COMPLEX_MARKER_FILTERS,
  );
  const [mapRuntimeState, setMapRuntimeState] = useState<KakaoMapRuntimeState>('loading');
  const [, setMapRuntimeError] = useState<string | null>(null);
  const [selectedComplex, setSelectedComplex] = useState<ComplexSelection | null>(
    initialComplexSelectionFromUrl,
  );
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const {
    focusMap,
    handleViewportChange,
    handleZoomIn,
    handleZoomOut,
    mapFocusTarget,
    viewport,
  } = useMapViewport(initialMapLevel);
  const handleChatbotUiAction = useCallback((action: ChatbotUiAction) => {
    if (action.type !== 'focus_map') {
      return;
    }

    const { target } = action;
    focusMap(target.latitude, target.longitude, target.level, SEARCH_FOCUS_DELTA);
    if (
      target.kind === 'complex'
      && target.openDetail
      && (target.complexId != null || target.parcelId != null)
    ) {
      setSelectedComplex({
        parcelId: target.parcelId,
        complexId: target.complexId,
      });
    }
  }, [focusMap]);
  const chatbot = useChatbot({ onUiAction: handleChatbotUiAction });
  const {
    markers,
  } = useMapMarkers({ markerFilters, viewport });
  const {
    complexDetail,
    detailError,
    detailState,
    handleLoadMoreTrades,
    handleRetryDetail,
    parcelComplexes,
    parcelTrades,
    tradeRows,
    tradeTrend,
  } = useComplexDetail(selectedComplex);
  const {
    complexSuggestions,
    handleSearchInputChange,
    handleSearchResultSelect,
    handleSearchSubmit,
    handleSuggestionSelect,
    isSearchPanelActive,
    searchError,
    searchResults,
    searchState,
  } = useComplexSearch({
    focusMap,
    onSelectComplex: setSelectedComplex,
  });
  const {
    handleLoadRootRegions,
    handleRegionComplexSelect,
    handleRegionSelect,
    regionComplexes,
    regionDetail,
    regionError,
    regionState,
    regionTrail,
    rootRegions,
  } = useRegionExplorer({
    focusMap,
    initialRegionLoad,
    onSelectComplex: setSelectedComplex,
  });

  const activeFilterCount = countActiveFilters(markerFilters);
  const sidebarMode: SidebarMode = selectedComplex == null
    ? isSearchPanelActive ? 'search' : 'region'
    : 'detail';

  const handleComplexMarkerSelect = useCallback((marker: ComplexMapMarker) => {
    setSelectedComplex({
      parcelId: marker.parcelId,
      complexId: marker.complexId,
    });
  }, []);

  const handleRegionMarkerSelect = useCallback((marker: RegionMapMarker) => {
    const nextLevel = nextRegionMarkerLevel(viewport.level);

    focusMap(marker.lat, marker.lng, nextLevel, mapFocusDeltaForLevel(nextLevel));
  }, [focusMap, viewport.level]);

  function handleCloseDetailDrawer() {
    setSelectedComplex(null);
  }

  function handleComplexSummarySelect(complex: ComplexSummarySelection) {
    setSelectedComplex({
      parcelId: complex.parcelId,
      complexId: complex.complexId,
    });
  }

  function handleFilterReset() {
    setMarkerFilters(EMPTY_COMPLEX_MARKER_FILTERS);
  }

  return (
    <main
      className="app-shell"
      data-chatbot-open={isChatbotOpen ? 'true' : 'false'}
      data-detail-open={selectedComplex == null ? 'false' : 'true'}
      data-exploration-open="true"
      data-ui-surface="map-first"
    >
      <header aria-label="상단 앱 바" className="app-bar">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">
            <span className="app-brand-mark-roof" />
            <span className="app-brand-mark-lens" />
          </span>
          <span className="app-brand-copy">
            <h1>홈서치</h1>
            <span>HomeSearch · 실거래가 인사이트</span>
          </span>
        </div>
      </header>

      <div className="map-workspace" data-layout-region="map-workspace">
        <MapWorkspace
          activeFilterCount={activeFilterCount}
          initialMapLevel={initialMapLevel}
          kakaoMapAppKey={kakaoMapAppKey}
          mapFocusTarget={mapFocusTarget}
          mapRuntimeState={mapRuntimeState}
          markers={markers}
          markerFilters={markerFilters}
          onComplexMarkerSelect={handleComplexMarkerSelect}
          onFilterReset={handleFilterReset}
          onFiltersChange={setMarkerFilters}
          onRegionMarkerSelect={handleRegionMarkerSelect}
          onRuntimeErrorChange={setMapRuntimeError}
          onRuntimeStateChange={setMapRuntimeState}
          onViewportChange={handleViewportChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          viewport={viewport}
        />

        <ExplorationPanel
          complexDetail={complexDetail}
          complexSuggestions={complexSuggestions}
          detailError={detailError}
          detailState={detailState}
          isExplorationOpen
          onCloseDetail={handleCloseDetailDrawer}
          onComplexSelect={handleComplexSummarySelect}
          onLoadMoreTrades={handleLoadMoreTrades}
          onLoadRootRegions={handleLoadRootRegions}
          onRetryDetail={handleRetryDetail}
          onSearchInputChange={handleSearchInputChange}
          onSearchResultSelect={handleSearchResultSelect}
          onSearchSubmit={handleSearchSubmit}
          onSuggestionSelect={handleSuggestionSelect}
          onRegionComplexSelect={handleRegionComplexSelect}
          onRegionSelect={handleRegionSelect}
          parcelComplexes={parcelComplexes}
          parcelTrades={parcelTrades}
          regionComplexes={regionComplexes}
          regionDetail={regionDetail}
          regionError={regionError}
          regionState={regionState}
          regionTrail={regionTrail}
          rootRegions={rootRegions}
          searchError={searchError}
          searchResults={searchResults}
          searchState={searchState}
          selectedComplex={selectedComplex}
          sidebarMode={sidebarMode}
          tradeRows={tradeRows}
          tradeTrend={tradeTrend}
        />

        <ChatbotPanel
          inputValue={chatbot.inputValue}
          isOpen={isChatbotOpen}
          messages={chatbot.messages}
          requestState={chatbot.requestState}
          onClose={() => setIsChatbotOpen(false)}
          onInputChange={chatbot.setInputValue}
          onOpen={() => setIsChatbotOpen(true)}
          onSubmit={chatbot.submitQuestion}
          onUiAction={handleChatbotUiAction}
        />
      </div>
    </main>
  );
}

function getConfiguredKakaoMapAppKey(): string {
  return import.meta.env.VITE_KAKAO_MAP_APP_KEY ?? '';
}
