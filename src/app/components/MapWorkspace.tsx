import {
  KakaoMapSurface,
  type KakaoMapRuntimeState,
} from '../../features/map/KakaoMapSurface';
import type {
  ComplexMapMarker,
  MapFocusTarget,
  MapViewport,
  MarkerRequestState,
  RegionMapMarker,
} from '../appTypes';
import { mapRuntimeStatusLabel } from '../appUtils';
import { FallbackMarkerLayer, MarkerPreviewList } from './MarkerPreviewList';
import { MarkerFilterPanel } from './MarkerFilterPanel';
import type { MapMarkersResult } from '../../features/map/api/fetchMapMarkers';
import type { FormEvent } from 'react';

export function MapWorkspace({
  activeFilterCount,
  filterFormKey,
  initialMapLevel,
  kakaoMapAppKey,
  mapFocusTarget,
  mapRuntimeError,
  mapRuntimeState,
  markerError,
  markerState,
  markers,
  onComplexMarkerSelect,
  onFilterReset,
  onFilterSubmit,
  onRegionMarkerSelect,
  onRetryMarkers,
  onRuntimeErrorChange,
  onRuntimeStateChange,
  onViewportChange,
  onZoomIn,
  onZoomOut,
  viewport,
}: {
  activeFilterCount: number;
  filterFormKey: number;
  initialMapLevel: number;
  kakaoMapAppKey: string;
  mapFocusTarget: MapFocusTarget | null;
  mapRuntimeError: string | null;
  mapRuntimeState: KakaoMapRuntimeState;
  markerError: string | null;
  markerState: MarkerRequestState;
  markers: MapMarkersResult | null;
  onComplexMarkerSelect: (marker: ComplexMapMarker) => void;
  onFilterReset: () => void;
  onFilterSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRegionMarkerSelect: (marker: RegionMapMarker) => void;
  onRetryMarkers: () => void;
  onRuntimeErrorChange: (error: string | null) => void;
  onRuntimeStateChange: (state: KakaoMapRuntimeState) => void;
  onViewportChange: (viewport: MapViewport) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  viewport: MapViewport;
}) {
  return (
    <section aria-label="지도 화면" className="map-surface">
      <p className="map-status">{mapRuntimeStatusLabel(mapRuntimeState)}</p>
      <KakaoMapSurface
        appKey={kakaoMapAppKey}
        focusTarget={mapFocusTarget}
        initialLevel={initialMapLevel}
        level={viewport.level}
        markers={markers}
        onComplexMarkerSelect={onComplexMarkerSelect}
        onRegionMarkerSelect={onRegionMarkerSelect}
        onRuntimeErrorChange={onRuntimeErrorChange}
        onRuntimeStateChange={onRuntimeStateChange}
        onViewportChange={onViewportChange}
      />
      {mapRuntimeState === 'ready' || markers == null ? null : (
        <FallbackMarkerLayer
          bounds={viewport.bounds}
          markers={markers}
          onComplexMarkerSelect={onComplexMarkerSelect}
          onRegionMarkerSelect={onRegionMarkerSelect}
        />
      )}

      <MarkerFilterPanel
        activeFilterCount={activeFilterCount}
        filterFormKey={filterFormKey}
        onFilterReset={onFilterReset}
        onFilterSubmit={onFilterSubmit}
      />

      <div aria-label="지도 조작" className="map-controls">
        <button type="button" aria-label="지도 확대" onClick={onZoomIn}>
          +
        </button>
        <button type="button" aria-label="지도 축소" onClick={onZoomOut}>
          -
        </button>
      </div>

      {markerState === 'loading' ? (
        <p className="map-feedback" role="status" aria-live="polite">
          마커 불러오는 중
        </p>
      ) : null}

      {markerState === 'empty' ? (
        <p className="map-feedback" role="status" aria-live="polite">
          이 영역에는 마커가 없습니다
        </p>
      ) : null}

      {markerState === 'error' ? (
        <p className="map-feedback map-feedback-error" role="alert">
          마커 데이터를 불러오지 못했습니다. 지도는 계속 사용할 수 있습니다.
          {markerError ? <span className="map-feedback-detail">{markerError}</span> : null}
          {' '}
          <button type="button" aria-label="마커 다시 불러오기" onClick={onRetryMarkers}>
            다시 시도
          </button>
        </p>
      ) : null}

      {mapRuntimeError && markerState !== 'error' ? (
        <p className="map-feedback map-feedback-error" role="alert">
          {mapRuntimeError}
        </p>
      ) : null}

      <MarkerPreviewList
        level={viewport.level}
        markers={markers}
        onComplexMarkerSelect={onComplexMarkerSelect}
        onRegionMarkerSelect={onRegionMarkerSelect}
      />
    </section>
  );
}
