import { useCallback, useState, type FormEvent } from 'react';

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
  detailHeaderStatusLabel,
  initialComplexSelectionFromUrl,
  mapFocusDeltaForLevel,
  mapModeLabel,
  markerSummaryLabel,
  nextRegionMarkerLevel,
  numberFormValue,
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
  initialMapLevel = 10,
  initialRegionLoad = true,
  kakaoMapAppKey = getConfiguredKakaoMapAppKey(),
}: AppProps) {
  const [markerFilters, setMarkerFilters] = useState<ComplexMarkerFilters>(
    EMPTY_COMPLEX_MARKER_FILTERS,
  );
  const [mapRuntimeState, setMapRuntimeState] = useState<KakaoMapRuntimeState>('loading');
  const [mapRuntimeError, setMapRuntimeError] = useState<string | null>(null);
  const [selectedComplex, setSelectedComplex] = useState<ComplexSelection | null>(
    initialComplexSelectionFromUrl,
  );
  const [isExplorationOpen, setIsExplorationOpen] = useState(true);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [filterFormKey, setFilterFormKey] = useState(0);

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
    handleRetryMarkers,
    markerError,
    markerState,
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

    setIsExplorationOpen(true);
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

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setMarkerFilters({
      pyeongMin: numberFormValue(formData, 'pyeongMin'),
      pyeongMax: numberFormValue(formData, 'pyeongMax'),
      priceEokMin: numberFormValue(formData, 'priceEokMin'),
      priceEokMax: numberFormValue(formData, 'priceEokMax'),
      ageMin: numberFormValue(formData, 'ageMin'),
      ageMax: numberFormValue(formData, 'ageMax'),
      unitMin: numberFormValue(formData, 'unitMin'),
      unitMax: numberFormValue(formData, 'unitMax'),
    });
  }

  function handleFilterReset() {
    setMarkerFilters(EMPTY_COMPLEX_MARKER_FILTERS);
    setFilterFormKey((current) => current + 1);
  }

  return (
    <main
      className="app-shell"
      data-chatbot-open={isChatbotOpen ? 'true' : 'false'}
      data-detail-open={selectedComplex == null ? 'false' : 'true'}
      data-ui-surface="map-first"
    >
      <header aria-label="상단 앱 바" className="app-bar">
        <div className="app-brand">
          <h1>Home Search</h1>
          <span>{selectedComplex == null ? '지도 탐색' : '단지 상세'}</span>
        </div>
        <div className="app-status" aria-label="실데이터 상태 요약">
          <span>{mapModeLabel(viewport.level)}</span>
          <span>{markerSummaryLabel(markerState, markers)}</span>
          <span>{detailHeaderStatusLabel(selectedComplex, detailState, parcelTrades)}</span>
        </div>
        <button
          type="button"
          aria-controls="exploration-panel"
          aria-expanded={isExplorationOpen}
          aria-label={isExplorationOpen ? '탐색 패널 접기' : '탐색 패널 열기'}
          className="exploration-toggle"
          onClick={() => {
            setIsExplorationOpen((current) => !current);
          }}
        >
          {isExplorationOpen ? '접기' : '탐색'}
        </button>
      </header>

      <div className="map-workspace" data-layout-region="map-workspace">
        <MapWorkspace
          activeFilterCount={activeFilterCount}
          filterFormKey={filterFormKey}
          initialMapLevel={initialMapLevel}
          kakaoMapAppKey={kakaoMapAppKey}
          mapFocusTarget={mapFocusTarget}
          mapRuntimeError={mapRuntimeError}
          mapRuntimeState={mapRuntimeState}
          markerError={markerError}
          markerState={markerState}
          markers={markers}
          onComplexMarkerSelect={handleComplexMarkerSelect}
          onFilterReset={handleFilterReset}
          onFilterSubmit={handleFilterSubmit}
          onRegionMarkerSelect={handleRegionMarkerSelect}
          onRetryMarkers={handleRetryMarkers}
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
          isExplorationOpen={isExplorationOpen}
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
