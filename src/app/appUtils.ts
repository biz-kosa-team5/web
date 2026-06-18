import type { CSSProperties } from 'react';

import type { ParcelTrades } from '../features/complex-detail/api/fetchParcelTrades';
import type { MapBoundsRequest, MapMarkersResult } from '../features/map/api/fetchMapMarkers';
import type { KakaoMapRuntimeState } from '../features/map/KakaoMapSurface';
import { SEARCH_FOCUS_DELTA } from './appConstants';
import type {
  ComplexMapMarker,
  ComplexSelection,
  DetailRequestState,
  MapViewport,
  MarkerRequestState,
  PanelRequestState,
  RegionMapMarker,
} from './appTypes';

export type DisplayCoordinateCandidate = {
  latitude: number | null;
  longitude: number | null;
};

export function formatAddress(address: string | null): string {
  return address ?? '주소 정보 없음';
}

export function formatMarkerAmount(amount: number | null): string {
  if (amount == null) {
    return '최근 거래 없음';
  }

  if (amount >= 10000) {
    const eok = amount / 10000;
    const formatted = Number.isInteger(eok) ? eok.toLocaleString() : eok.toFixed(1);
    return `${formatted}억`;
  }

  return `${amount.toLocaleString()}만`;
}

export function markerSubtitle(marker: ComplexMapMarker): string | null {
  if (marker.name) {
    return marker.name;
  }

  if (marker.unitCntSum != null && marker.unitCntSum > 0) {
    return `${marker.unitCntSum.toLocaleString()}세대`;
  }

  return null;
}

export function complexMarkerKey(marker: ComplexMapMarker): string {
  return marker.complexId == null
    ? `${marker.parcelId}`
    : `${marker.parcelId}-${marker.complexId}`;
}

export function complexMarkerAriaLabel(marker: ComplexMapMarker): string {
  return marker.complexId == null
    ? `필지 ${marker.parcelId} 상세 열기`
    : `필지 ${marker.parcelId} 단지 ${marker.complexId} 상세 열기`;
}

export function detailHeaderStatusLabel(
  selection: ComplexSelection | null,
  state: DetailRequestState,
  trades: ParcelTrades | null,
): string {
  if (selection == null) {
    return '상세 미선택';
  }

  if (state !== 'ready' || trades == null) {
    return `상세 ${detailRequestLabel(state)}`;
  }

  return `거래 ${trades.totalElements.toLocaleString()}건`;
}

export function detailRequestLabel(state: DetailRequestState): string {
  switch (state) {
    case 'idle':
      return '대기';
    case 'loading':
      return '불러오는 중';
    case 'ready':
      return '완료';
    case 'error':
      return '오류';
  }
}

export function panelRequestLabel(state: PanelRequestState): string {
  switch (state) {
    case 'idle':
      return '대기';
    case 'loading':
      return '불러오는 중';
    case 'ready':
      return '완료';
    case 'empty':
      return '결과 없음';
    case 'error':
      return '오류';
  }
}

export function explorationSummaryLabel(searchCount: number, regionComplexCount: number): string {
  if (searchCount > 0 && regionComplexCount > 0) {
    return `검색 ${searchCount.toLocaleString()} / 지역 ${regionComplexCount.toLocaleString()}`;
  }

  if (searchCount > 0) {
    return `검색 ${searchCount.toLocaleString()}`;
  }

  if (regionComplexCount > 0) {
    return `지역 ${regionComplexCount.toLocaleString()}`;
  }

  return '지역 탐색';
}

export function viewportAroundPoint(
  lat: number,
  lng: number,
  level: number,
  delta: number,
): MapViewport {
  return {
    bounds: {
      swLat: lat - delta,
      swLng: lng - delta,
      neLat: lat + delta,
      neLng: lng + delta,
    },
    level,
  };
}

export function mapMarkerPointStyle(
  lat: number,
  lng: number,
  bounds: MapBoundsRequest,
): CSSProperties {
  const lngRange = bounds.neLng - bounds.swLng;
  const latRange = bounds.neLat - bounds.swLat;
  const x = lngRange === 0 ? 50 : ((lng - bounds.swLng) / lngRange) * 100;
  const y = latRange === 0 ? 50 : 100 - ((lat - bounds.swLat) / latRange) * 100;

  return {
    left: `${clampPercent(x, 8, 92)}%`,
    top: `${clampPercent(y, 14, 88)}%`,
  };
}

export function regionFocusLevel(depth: number): number {
  if (depth <= 1) {
    return 9;
  }

  if (depth === 2) {
    return 6;
  }

  return 4;
}

export function nextRegionMarkerLevel(level: number): number {
  return Math.max(1, level - 2);
}

export function mapFocusDeltaForLevel(level: number): number {
  if (level >= 8) {
    return 0.2;
  }

  if (level >= 6) {
    return 0.08;
  }

  return SEARCH_FOCUS_DELTA;
}

export function regionStepLabel(depth: number): string {
  if (depth === 0) {
    return '시도 선택';
  }

  if (depth === 1) {
    return '시군구 선택';
  }

  if (depth === 2) {
    return '읍면동 선택';
  }

  return '단지 선택';
}

export function regionMarkerActionLabel(level: number): string {
  return level <= 4 ? '단지 보기' : '지도 이동';
}

export function regionMarkerUnitOrActionLabel(marker: RegionMapMarker, level?: number): string {
  if (marker.unitCntSum != null && marker.unitCntSum > 0) {
    return `${marker.unitCntSum.toLocaleString()}세대`;
  }

  return level == null ? '세대수 없음' : regionMarkerActionLabel(level);
}

export function hasDisplayCoordinate<T extends DisplayCoordinateCandidate>(
  result: T,
): result is T & { latitude: number; longitude: number } {
  return result.latitude != null && result.longitude != null;
}

export function requiredParcelId(selection: ComplexSelection): number {
  if (selection.parcelId == null) {
    throw new Error('parcelId is required for parcel-scoped detail request');
  }
  return selection.parcelId;
}

export function initialComplexSelectionFromUrl(): ComplexSelection | null {
  const complexId = Number(new URLSearchParams(window.location.search).get('complexId'));
  if (!Number.isSafeInteger(complexId) || complexId <= 0) {
    return null;
  }
  return {
    parcelId: null,
    complexId,
  };
}

export function stringFormValue(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value : '';
}

export function numberFormValue(formData: FormData, field: string): number | null {
  const value = stringFormValue(formData, field).trim();
  if (value.length === 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function countActiveFilters(filters: Record<string, number | null | undefined>): number {
  return Object.values(filters).filter((value) => value != null).length;
}

export function mapRuntimeStatusLabel(state: KakaoMapRuntimeState): string {
  switch (state) {
    case 'loading':
      return '지도 준비 중';
    case 'ready':
      return '지도 준비 완료';
    case 'error':
      return '지도 대체 화면';
  }
}

export function mapModeLabel(level: number): string {
  return level <= 4 ? '단지 보기' : '지역 보기';
}

export function markerSummaryLabel(
  state: MarkerRequestState,
  markers: MapMarkersResult | null,
): string {
  if (state === 'loading') {
    return '불러오는 중';
  }

  if (state === 'error') {
    return '마커 오류';
  }

  if (state === 'empty' || !markers) {
    return '마커 0개';
  }

  return `마커 ${markers.markers.length.toLocaleString()}개`;
}

export function sameViewport(first: MapViewport, second: MapViewport): boolean {
  return (
    first.level === second.level &&
    first.bounds.swLat === second.bounds.swLat &&
    first.bounds.swLng === second.bounds.swLng &&
    first.bounds.neLat === second.bounds.neLat &&
    first.bounds.neLng === second.bounds.neLng
  );
}

function clampPercent(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.min(max, Math.max(min, value));
}
