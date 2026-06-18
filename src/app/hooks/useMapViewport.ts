import { useCallback, useEffect, useState } from 'react';

import { INITIAL_MARKER_BOUNDS } from '../appConstants';
import type { MapFocusTarget, MapViewport } from '../appTypes';
import { sameViewport, viewportAroundPoint } from '../appUtils';

export function useMapViewport(initialMapLevel: number) {
  const [viewport, setViewport] = useState<MapViewport>(() => ({
    bounds: INITIAL_MARKER_BOUNDS,
    level: initialMapLevel,
  }));
  const [mapFocusTarget, setMapFocusTarget] = useState<MapFocusTarget | null>(null);

  useEffect(() => {
    setViewport((current) => {
      if (current.level === initialMapLevel) {
        return current;
      }

      return { ...current, level: initialMapLevel };
    });
  }, [initialMapLevel]);

  const handleViewportChange = useCallback((nextViewport: MapViewport) => {
    setViewport((current) => {
      if (sameViewport(current, nextViewport)) {
        return current;
      }

      return nextViewport;
    });
  }, []);

  function handleZoomIn() {
    setViewport((current) => ({
      ...current,
      level: Math.max(1, current.level - 1),
    }));
  }

  function handleZoomOut() {
    setViewport((current) => ({
      ...current,
      level: current.level + 1,
    }));
  }

  function focusMap(lat: number, lng: number, level: number, delta: number) {
    setViewport(viewportAroundPoint(lat, lng, level, delta));
    setMapFocusTarget((current) => ({
      lat,
      lng,
      level,
      seq: (current?.seq ?? 0) + 1,
    }));
  }

  return {
    viewport,
    mapFocusTarget,
    focusMap,
    handleViewportChange,
    handleZoomIn,
    handleZoomOut,
  };
}
