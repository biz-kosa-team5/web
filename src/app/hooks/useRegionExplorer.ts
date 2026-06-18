import { useEffect, useRef, useState } from 'react';

import {
  fetchRegionComplexes,
  fetchRegionDetail,
  fetchRootRegions,
  type RegionComplexSummary,
  type RegionDetail,
  type RegionSummary,
} from '../../features/region/api/fetchRegions';
import { SEARCH_FOCUS_DELTA } from '../appConstants';
import type { ComplexSelection, PanelRequestState, RegionTrailItem } from '../appTypes';
import {
  hasDisplayCoordinate,
  mapFocusDeltaForLevel,
  regionFocusLevel,
} from '../appUtils';

export function useRegionExplorer({
  focusMap,
  initialRegionLoad,
  onSelectComplex,
}: {
  focusMap: (lat: number, lng: number, level: number, delta: number) => void;
  initialRegionLoad: boolean;
  onSelectComplex: (selection: ComplexSelection) => void;
}) {
  const [rootRegions, setRootRegions] = useState<RegionSummary[]>([]);
  const [regionDetail, setRegionDetail] = useState<RegionDetail | null>(null);
  const [regionComplexes, setRegionComplexes] = useState<RegionComplexSummary[]>([]);
  const [regionState, setRegionState] = useState<PanelRequestState>('idle');
  const [regionError, setRegionError] = useState<string | null>(null);
  const [regionTrail, setRegionTrail] = useState<RegionTrailItem[]>([]);
  const regionRequestSeq = useRef(0);
  const initialRegionLoadStarted = useRef(false);

  useEffect(() => {
    if (!initialRegionLoad || initialRegionLoadStarted.current) {
      return;
    }

    initialRegionLoadStarted.current = true;
    loadRootRegions();
  }, [initialRegionLoad]);

  function loadRootRegions() {
    const requestSeq = regionRequestSeq.current + 1;
    regionRequestSeq.current = requestSeq;

    setRegionState('loading');
    setRegionError(null);
    setRegionDetail(null);
    setRegionComplexes([]);
    setRegionTrail([]);

    fetchRootRegions()
      .then((nextRegions) => {
        if (requestSeq !== regionRequestSeq.current) {
          return;
        }

        setRootRegions(nextRegions);
        setRegionComplexes([]);
        setRegionState(nextRegions.length === 0 ? 'empty' : 'ready');
      })
      .catch((error: unknown) => {
        if (requestSeq !== regionRequestSeq.current) {
          return;
        }

        setRootRegions([]);
        setRegionDetail(null);
        setRegionComplexes([]);
        setRegionTrail([]);
        setRegionState('error');
        setRegionError(error instanceof Error ? error.message : '알 수 없는 지역 오류');
      });
  }

  function handleRegionSelect(region: RegionTrailItem) {
    const requestSeq = regionRequestSeq.current + 1;
    regionRequestSeq.current = requestSeq;
    const nextTrail = [...regionTrail, region];
    const nextMapLevel = regionFocusLevel(nextTrail.length);

    setRegionState('loading');
    setRegionError(null);

    Promise.all([
      fetchRegionDetail(region.id),
      fetchRegionComplexes(region.id, { limit: 20, offset: 0 }),
    ])
      .then(([nextDetail, nextComplexes]) => {
        if (requestSeq !== regionRequestSeq.current) {
          return;
        }

        setRegionDetail(nextDetail);
        setRegionComplexes(nextComplexes);
        setRootRegions(nextDetail.children);
        setRegionTrail([
          ...regionTrail,
          {
            id: nextDetail.id,
            name: nextDetail.name,
          },
        ]);
        setRegionState('ready');
        focusMap(
          nextDetail.latitude,
          nextDetail.longitude,
          nextMapLevel,
          mapFocusDeltaForLevel(nextMapLevel),
        );
      })
      .catch((error: unknown) => {
        if (requestSeq !== regionRequestSeq.current) {
          return;
        }

        setRegionDetail(null);
        setRegionComplexes([]);
        setRegionState('error');
        setRegionError(error instanceof Error ? error.message : '알 수 없는 지역 상세 오류');
      });
  }

  function handleRegionComplexSelect(complex: RegionComplexSummary) {
    onSelectComplex({
      parcelId: complex.parcelId,
      complexId: complex.complexId,
    });
    if (hasDisplayCoordinate(complex)) {
      focusMap(complex.latitude, complex.longitude, 4, SEARCH_FOCUS_DELTA);
    }
  }

  return {
    handleLoadRootRegions: loadRootRegions,
    handleRegionComplexSelect,
    handleRegionSelect,
    regionComplexes,
    regionDetail,
    regionError,
    regionState,
    regionTrail,
    rootRegions,
  };
}
