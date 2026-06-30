import {
  KakaoMapSurface,
  type KakaoMapRuntimeState,
} from '../../features/map/KakaoMapSurface';
import type {
  ComplexMapMarker,
  MapFocusTarget,
  MapViewport,
  RegionMapMarker,
} from '../appTypes';
import { FallbackMarkerLayer } from './MarkerPreviewList';
import { MarkerFilterPanel } from './MarkerFilterPanel';
import type {
  ComplexMarkerFilters,
  MapMarkersResult,
} from '../../features/map/api/fetchMapMarkers';

export function MapWorkspace({
  activeFilterCount,
  initialMapLevel,
  kakaoMapAppKey,
  mapFocusTarget,
  mapRuntimeState,
  markerFilters,
  markers,
  onComplexMarkerSelect,
  onFilterReset,
  onFiltersChange,
  onRegionMarkerSelect,
  onRuntimeErrorChange,
  onRuntimeStateChange,
  onViewportChange,
  onZoomIn,
  onZoomOut,
  viewport,
}: {
  activeFilterCount: number;
  initialMapLevel: number;
  kakaoMapAppKey: string;
  mapFocusTarget: MapFocusTarget | null;
  mapRuntimeState: KakaoMapRuntimeState;
  markerFilters: ComplexMarkerFilters;
  markers: MapMarkersResult | null;
  onComplexMarkerSelect: (marker: ComplexMapMarker) => void;
  onFilterReset: () => void;
  onFiltersChange: (filters: ComplexMarkerFilters) => void;
  onRegionMarkerSelect: (marker: RegionMapMarker) => void;
  onRuntimeErrorChange: (error: string | null) => void;
  onRuntimeStateChange: (state: KakaoMapRuntimeState) => void;
  onViewportChange: (viewport: MapViewport) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  viewport: MapViewport;
}) {
  return (
    <section aria-label="지도 화면" className="map-surface">
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
        filters={markerFilters}
        onFilterReset={onFilterReset}
        onFiltersChange={onFiltersChange}
      />

      <div aria-label="지도 조작" className="map-controls">
        <button type="button" aria-label="지도 확대" onClick={onZoomIn}>
          +
        </button>
        <button type="button" aria-label="지도 축소" onClick={onZoomOut}>
          -
        </button>
      </div>
    </section>
  );
}
