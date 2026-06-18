import type { MapBoundsRequest, MapMarkersResult } from '../../features/map/api/fetchMapMarkers';
import type { ComplexMapMarker, RegionMapMarker } from '../appTypes';
import {
  complexMarkerAriaLabel,
  complexMarkerKey,
  formatMarkerAmount,
  mapMarkerPointStyle,
  markerSubtitle,
  regionMarkerUnitOrActionLabel,
} from '../appUtils';

export function FallbackMarkerLayer({
  bounds,
  markers,
  onComplexMarkerSelect,
  onRegionMarkerSelect,
}: {
  bounds: MapBoundsRequest;
  markers: MapMarkersResult;
  onComplexMarkerSelect: (marker: ComplexMapMarker) => void;
  onRegionMarkerSelect: (marker: RegionMapMarker) => void;
}) {
  if (markers.markers.length === 0) {
    return null;
  }

  return (
    <ul aria-label="대체 지도 마커" className="fallback-marker-layer">
      {markers.kind === 'complex'
        ? markers.markers.map((marker) => (
            <li
              key={complexMarkerKey(marker)}
              style={mapMarkerPointStyle(marker.lat, marker.lng, bounds)}
            >
              <button
                type="button"
                aria-label={complexMarkerAriaLabel(marker)}
                className="fallback-map-marker fallback-map-marker-complex"
                data-fallback-marker-id={`complex-${complexMarkerKey(marker)}`}
                onClick={() => {
                  onComplexMarkerSelect(marker);
                }}
              >
                <span className="fallback-map-marker-kicker">
                  {marker.latestDealAmount == null ? '거래 없음' : '최근 실거래'}
                </span>
                <strong>{formatMarkerAmount(marker.latestDealAmount)}</strong>
                {markerSubtitle(marker) ? <span>{markerSubtitle(marker)}</span> : null}
              </button>
            </li>
          ))
        : markers.markers.map((marker) => (
            <li key={marker.id} style={mapMarkerPointStyle(marker.lat, marker.lng, bounds)}>
              <button
                type="button"
                aria-label={`지역 이동 ${marker.name}`}
                className="fallback-map-marker fallback-map-marker-region"
                data-fallback-marker-id={`region-${marker.id}`}
                onClick={() => {
                  onRegionMarkerSelect(marker);
                }}
              >
                <strong>{marker.name}</strong>
                <span>{regionMarkerUnitOrActionLabel(marker)}</span>
              </button>
            </li>
          ))}
    </ul>
  );
}

export function MarkerPreviewList({
  level,
  markers,
  onComplexMarkerSelect,
  onRegionMarkerSelect,
}: {
  level: number;
  markers: MapMarkersResult | null;
  onComplexMarkerSelect: (marker: ComplexMapMarker) => void;
  onRegionMarkerSelect: (marker: RegionMapMarker) => void;
}) {
  if (markers?.kind === 'complex' && markers.markers.length > 0) {
    return (
      <ul aria-label="단지 마커" className="marker-preview-list">
        {markers.markers.map((marker) => (
          <li key={complexMarkerKey(marker)}>
            <button
              type="button"
              aria-label={complexMarkerAriaLabel(marker)}
              className="marker-list-button"
              data-marker-id={complexMarkerKey(marker)}
              onClick={() => {
                onComplexMarkerSelect(marker);
              }}
            >
              <span className="marker-list-price">
                최근 실거래 {formatMarkerAmount(marker.latestDealAmount)}
              </span>
              {markerSubtitle(marker) ? (
                <span className="marker-list-subtitle">{markerSubtitle(marker)}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (markers?.kind === 'region' && markers.markers.length > 0) {
    return (
      <ul aria-label="지역 마커" className="marker-preview-list">
        {markers.markers.map((marker) => (
          <li key={marker.id} data-marker-id={marker.id}>
            <button
              type="button"
              aria-label={`지역 이동 ${marker.name}`}
              className="marker-list-button marker-list-button-region"
              onClick={() => {
                onRegionMarkerSelect(marker);
              }}
            >
              <span className="marker-list-price">{marker.name}</span>
              <span className="marker-list-subtitle">
                {regionMarkerUnitOrActionLabel(marker, level)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return null;
}
