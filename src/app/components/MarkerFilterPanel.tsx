import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputEventHandler,
} from 'react';

import type { ComplexMarkerFilters } from '../../features/map/api/fetchMapMarkers';

type FilterKey = 'unit' | 'pyeong' | 'priceEok' | 'age';
type RangeValue = [number, number];
type FilterField = keyof ComplexMarkerFilters;

type FilterDefinition = {
  key: FilterKey;
  label: string;
  unit: string;
  defaultRange: RangeValue;
  minField: FilterField;
  maxField: FilterField;
  minAriaLabel: string;
  maxAriaLabel: string;
};

const FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    key: 'unit',
    label: '세대수',
    unit: '세대',
    defaultRange: [0, 5000],
    minField: 'unitMin',
    maxField: 'unitMax',
    minAriaLabel: '세대수 최소',
    maxAriaLabel: '세대수 최대',
  },
  {
    key: 'pyeong',
    label: '평형',
    unit: '평',
    defaultRange: [0, 120],
    minField: 'pyeongMin',
    maxField: 'pyeongMax',
    minAriaLabel: '평형 최소',
    maxAriaLabel: '평형 최대',
  },
  {
    key: 'priceEok',
    label: '가격',
    unit: '억',
    defaultRange: [0, 80],
    minField: 'priceEokMin',
    maxField: 'priceEokMax',
    minAriaLabel: '가격 최소',
    maxAriaLabel: '가격 최대',
  },
  {
    key: 'age',
    label: '입주년차',
    unit: '년',
    defaultRange: [0, 40],
    minField: 'ageMin',
    maxField: 'ageMax',
    minAriaLabel: '입주년차 최소',
    maxAriaLabel: '입주년차 최대',
  },
];

export function MarkerFilterPanel({
  activeFilterCount,
  filters,
  onFilterReset,
  onFiltersChange,
}: {
  activeFilterCount: number;
  filters: ComplexMarkerFilters;
  onFilterReset: () => void;
  onFiltersChange: (filters: ComplexMarkerFilters) => void;
}) {
  const [openFilterKey, setOpenFilterKey] = useState<FilterKey | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const rangeByKey = useMemo(() => {
    const ranges = new Map<FilterKey, RangeValue>();
    FILTER_DEFINITIONS.forEach((definition) => {
      ranges.set(definition.key, rangeFromFilters(filters, definition));
    });
    return ranges;
  }, [filters]);

  useEffect(() => {
    if (openFilterKey == null) {
      return undefined;
    }

    function handleOutsidePointer(event: MouseEvent | TouchEvent) {
      const root = rootRef.current;
      if (root != null && !root.contains(event.target as Node)) {
        setOpenFilterKey(null);
      }
    }

    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('touchstart', handleOutsidePointer);
    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('touchstart', handleOutsidePointer);
    };
  }, [openFilterKey]);

  function handleCommitRange(definition: FilterDefinition, range: RangeValue) {
    onFiltersChange(filtersWithRange(filters, definition, range));
  }

  return (
    <div
      ref={rootRef}
      aria-label="마커 필터"
      className="filter-panel"
      data-filter-state={activeFilterCount > 0 ? 'active' : 'idle'}
      data-map-overlay="filters"
      data-ui-layer="filter-controls"
    >
      <div className="filter-chip-row" role="group" aria-label="마커 필터 조건">
        {FILTER_DEFINITIONS.map((definition) => {
          const range = rangeByKey.get(definition.key) ?? definition.defaultRange;
          const isOpen = openFilterKey === definition.key;
          const applied = isAppliedRange(range, definition.defaultRange);
          const panelId = `marker-filter-${definition.key}`;

          return (
            <div className="filter-chip-wrap" key={definition.key}>
              <button
                type="button"
                aria-controls={panelId}
                aria-expanded={isOpen}
                className="filter-chip"
                data-filter-chip-state={isOpen || applied ? 'active' : 'idle'}
                onClick={() => {
                  setOpenFilterKey((current) =>
                    current === definition.key ? null : definition.key,
                  );
                }}
              >
                <span className="filter-chip-label">{definition.label}</span>
                {applied ? (
                  <span className="filter-chip-sub-label">
                    {formatRangeLabel(range, definition.unit)}
                  </span>
                ) : null}
              </button>

              {isOpen ? (
                <FilterRangeDropdown
                  definition={definition}
                  id={panelId}
                  onCommit={(nextRange) => handleCommitRange(definition, nextRange)}
                  value={range}
                />
              ) : null}
            </div>
          );
        })}

        <button
          type="button"
          aria-label="마커 필터 초기화"
          className="filter-reset-button"
          onClick={() => {
            setOpenFilterKey(null);
            onFilterReset();
          }}
        >
          <span aria-hidden="true" className="filter-reset-icon" />
          <span>초기화</span>
        </button>
      </div>

      <p className="filter-status" aria-live="polite">
        {activeFilterCount > 0 ? `필터 ${activeFilterCount}개 적용` : '필터 없음'}
      </p>
    </div>
  );
}

function FilterRangeDropdown({
  definition,
  id,
  onCommit,
  value,
}: {
  definition: FilterDefinition;
  id: string;
  onCommit: (range: RangeValue) => void;
  value: RangeValue;
}) {
  const [draftRange, setDraftRange] = useState<RangeValue>(value);
  const dirtyRef = useRef(false);
  const draftRef = useRef<RangeValue>(value);
  const onCommitRef = useRef(onCommit);
  const titleId = `${id}-title`;
  const [defaultMin, defaultMax] = definition.defaultRange;
  const [min, max] = draftRange;
  const leftPct = ((min - defaultMin) / (defaultMax - defaultMin)) * 100;
  const rightPct = (1 - (max - defaultMin) / (defaultMax - defaultMin)) * 100;

  useEffect(() => {
    setDraftRange(value);
    draftRef.current = value;
    dirtyRef.current = false;
  }, [value]);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    function commitIfDirty() {
      if (!dirtyRef.current) {
        return;
      }
      dirtyRef.current = false;
      const [draftMin, draftMax] = draftRef.current;
      onCommitRef.current([Math.min(draftMin, draftMax), Math.max(draftMin, draftMax)]);
    }

    window.addEventListener('pointerup', commitIfDirty);
    window.addEventListener('touchend', commitIfDirty);
    window.addEventListener('mouseup', commitIfDirty);
    return () => {
      window.removeEventListener('pointerup', commitIfDirty);
      window.removeEventListener('touchend', commitIfDirty);
      window.removeEventListener('mouseup', commitIfDirty);
    };
  }, []);

  const handleMinInput: InputEventHandler<HTMLInputElement> = (event) => {
    const nextMin = Number(event.currentTarget.value);
    const nextRange: RangeValue = [Math.min(nextMin, draftRef.current[1]), draftRef.current[1]];
    dirtyRef.current = true;
    draftRef.current = nextRange;
    setDraftRange(nextRange);
  };

  const handleMaxInput: InputEventHandler<HTMLInputElement> = (event) => {
    const nextMax = Number(event.currentTarget.value);
    const nextRange: RangeValue = [draftRef.current[0], Math.max(nextMax, draftRef.current[0])];
    dirtyRef.current = true;
    draftRef.current = nextRange;
    setDraftRange(nextRange);
  };

  function handleResetOne() {
    const nextRange = definition.defaultRange;
    dirtyRef.current = false;
    draftRef.current = nextRange;
    setDraftRange(nextRange);
    onCommit(nextRange);
  }

  return (
    <div
      id={id}
      aria-labelledby={titleId}
      className="filter-dropdown"
      role="dialog"
    >
      <div className="filter-dropdown-header">
        <h2 id={titleId}>{definition.label}</h2>
        <button type="button" onClick={handleResetOne}>
          초기화
        </button>
      </div>

      <p className="filter-dropdown-range">
        <strong>{min.toLocaleString()}{definition.unit}</strong>
        <span>~</span>
        <strong>{max.toLocaleString()}{definition.unit}</strong>
      </p>

      <div className="filter-slider">
        <span className="filter-slider-track" />
        <span
          className="filter-slider-active"
          style={{
            left: `${leftPct}%`,
            right: `${rightPct}%`,
          }}
        />
        <input
          aria-label={definition.minAriaLabel}
          max={defaultMax}
          min={defaultMin}
          onInput={handleMinInput}
          type="range"
          value={min}
        />
        <input
          aria-label={definition.maxAriaLabel}
          max={defaultMax}
          min={defaultMin}
          onInput={handleMaxInput}
          type="range"
          value={max}
        />
      </div>

      <div className="filter-slider-limits" aria-hidden="true">
        <span>최소 {defaultMin.toLocaleString()}{definition.unit}</span>
        <span>최대 {defaultMax.toLocaleString()}{definition.unit}</span>
      </div>
    </div>
  );
}

function rangeFromFilters(
  filters: ComplexMarkerFilters,
  definition: FilterDefinition,
): RangeValue {
  return [
    filters[definition.minField] ?? definition.defaultRange[0],
    filters[definition.maxField] ?? definition.defaultRange[1],
  ];
}

function filtersWithRange(
  filters: ComplexMarkerFilters,
  definition: FilterDefinition,
  range: RangeValue,
): ComplexMarkerFilters {
  const [min, max] = [Math.min(range[0], range[1]), Math.max(range[0], range[1])];
  const nextFilters = { ...filters };

  if (min === definition.defaultRange[0] && max === definition.defaultRange[1]) {
    nextFilters[definition.minField] = null;
    nextFilters[definition.maxField] = null;
  } else {
    nextFilters[definition.minField] = min;
    nextFilters[definition.maxField] = max;
  }

  return nextFilters;
}

function isAppliedRange(range: RangeValue, defaultRange: RangeValue): boolean {
  return range[0] !== defaultRange[0] || range[1] !== defaultRange[1];
}

function formatRangeLabel(range: RangeValue, unit: string): string {
  return `${range[0].toLocaleString()}~${range[1].toLocaleString()}${unit}`;
}
