import type { ComplexMarkerFilters, MapBoundsRequest } from '../features/map/api/fetchMapMarkers';

export const INITIAL_MAP_CENTER = {
  lat: 37.505,
  lng: 127.06,
};

export const INITIAL_MAP_LEVEL = 7;

export const INITIAL_MARKER_BOUNDS: MapBoundsRequest = {
  swLat: 37.428,
  swLng: 126.958,
  neLat: 37.568,
  neLng: 127.178,
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
