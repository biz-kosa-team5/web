import type { ComplexMarkerFilters, MapBoundsRequest } from '../features/map/api/fetchMapMarkers';

export const INITIAL_MARKER_BOUNDS: MapBoundsRequest = {
  swLat: 37.45,
  swLng: 126.85,
  neLat: 37.7,
  neLng: 127.2,
};

export const EMPTY_COMPLEX_MARKER_FILTERS: Required<ComplexMarkerFilters> = {
  pyeongMin: null,
  pyeongMax: null,
  priceEokMin: null,
  priceEokMax: null,
  ageMin: null,
  ageMax: null,
  unitMin: null,
  unitMax: null,
};

export const SEARCH_FOCUS_DELTA = 0.01;
export const SEARCH_DEBOUNCE_MILLIS = 300;
export const TRADE_PAGE_SIZE = 25;
