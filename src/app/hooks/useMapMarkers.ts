import { useEffect, useRef, useState } from 'react';

import {
  fetchMapMarkers,
  type ComplexMarkerFilters,
  type MapMarkersResult,
} from '../../features/map/api/fetchMapMarkers';
import type { MapViewport, MarkerRequestState } from '../appTypes';

export function useMapMarkers({
  markerFilters,
  viewport,
}: {
  markerFilters: ComplexMarkerFilters;
  viewport: MapViewport;
}) {
  const [markers, setMarkers] = useState<MapMarkersResult | null>(null);
  const [markerState, setMarkerState] = useState<MarkerRequestState>('loading');
  const [markerError, setMarkerError] = useState<string | null>(null);
  const [markerRetrySeq, setMarkerRetrySeq] = useState(0);
  const markerRequestSeq = useRef(0);

  useEffect(() => {
    const requestSeq = markerRequestSeq.current + 1;
    markerRequestSeq.current = requestSeq;
    let ignore = false;

    setMarkerState('loading');
    setMarkerError(null);

    fetchMapMarkers({
      bounds: viewport.bounds,
      filters: markerFilters,
      level: viewport.level,
    })
      .then((nextMarkers) => {
        if (ignore || requestSeq !== markerRequestSeq.current) {
          return;
        }

        setMarkers(nextMarkers);
        setMarkerState(nextMarkers.markers.length === 0 ? 'empty' : 'ready');
      })
      .catch((error: unknown) => {
        if (ignore || requestSeq !== markerRequestSeq.current) {
          return;
        }

        setMarkers(null);
        setMarkerState('error');
        setMarkerError(error instanceof Error ? error.message : '알 수 없는 마커 오류');
      });

    return () => {
      ignore = true;
    };
  }, [markerFilters, markerRetrySeq, viewport]);

  function handleRetryMarkers() {
    setMarkerRetrySeq((current) => current + 1);
  }

  return {
    markers,
    markerState,
    markerError,
    handleRetryMarkers,
  };
}
