import type { ParcelComplexSummary } from '../features/complex-detail/api/fetchParcelComplexes';
import type { MapBoundsRequest, MapMarkersResult } from '../features/map/api/fetchMapMarkers';
import type { RegionComplexSummary } from '../features/region/api/fetchRegions';

export type MarkerRequestState = 'loading' | 'ready' | 'empty' | 'error';
export type DetailRequestState = 'idle' | 'loading' | 'ready' | 'error';
export type PanelRequestState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
export type SidebarMode = 'region' | 'search' | 'detail';

export type MapViewport = {
  bounds: MapBoundsRequest;
  level: number;
};

export type MapFocusTarget = {
  lat: number;
  lng: number;
  level: number;
  seq: number;
};

export type ComplexSelection = {
  parcelId: number | null;
  complexId: number | null;
};

export type ComplexSummarySelection = ParcelComplexSummary | RegionComplexSummary;
export type ComplexMapMarker = Extract<MapMarkersResult, { kind: 'complex' }>['markers'][number];
export type RegionMapMarker = Extract<MapMarkersResult, { kind: 'region' }>['markers'][number];

export type RegionTrailItem = {
  id: number;
  name: string;
};

export type AppProps = {
  initialMapLevel?: number;
  initialRegionLoad?: boolean;
  kakaoMapAppKey?: string;
};
