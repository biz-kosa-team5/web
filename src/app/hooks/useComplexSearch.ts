import { useEffect, useRef, useState, type FormEvent } from 'react';

import {
  fetchComplexSuggestions,
  type ComplexSuggestion,
} from '../../features/search/api/fetchComplexSuggestions';
import {
  fetchComplexSearchResults,
  type ComplexSearchResult,
} from '../../features/search/api/fetchComplexSearchResults';
import { SEARCH_DEBOUNCE_MILLIS, SEARCH_FOCUS_DELTA } from '../appConstants';
import type { ComplexSelection, PanelRequestState } from '../appTypes';
import { hasDisplayCoordinate, stringFormValue } from '../appUtils';

export function useComplexSearch({
  focusMap,
  onSelectComplex,
}: {
  focusMap: (lat: number, lng: number, level: number, delta: number) => void;
  onSelectComplex: (selection: ComplexSelection) => void;
}) {
  const [searchResults, setSearchResults] = useState<ComplexSearchResult[]>([]);
  const [complexSuggestions, setComplexSuggestions] = useState<ComplexSuggestion[]>([]);
  const [searchState, setSearchState] = useState<PanelRequestState>('idle');
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRequestSeq = useRef(0);
  const suggestionRequestSeq = useRef(0);
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    clearSearchDebounceTimer();
  }, []);

  const isSearchPanelActive =
    searchState !== 'idle' || searchResults.length > 0 || complexSuggestions.length > 0;

  function clearSearchDebounceTimer() {
    if (searchDebounceTimer.current == null) {
      return;
    }

    clearTimeout(searchDebounceTimer.current);
    searchDebounceTimer.current = null;
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = stringFormValue(new FormData(event.currentTarget), 'q').trim();
    clearSearchDebounceTimer();
    runComplexSearch(query);
  }

  function runComplexSearch(query: string) {
    const requestSeq = searchRequestSeq.current + 1;
    searchRequestSeq.current = requestSeq;
    setSearchError(null);

    if (query.length === 0) {
      setSearchResults([]);
      setSearchState('idle');
      return;
    }

    setSearchState('loading');
    fetchComplexSearchResults(query)
      .then((nextResults) => {
        if (requestSeq !== searchRequestSeq.current) {
          return;
        }

        setSearchResults(nextResults);
        setSearchState(nextResults.length === 0 ? 'empty' : 'ready');
      })
      .catch((error: unknown) => {
        if (requestSeq !== searchRequestSeq.current) {
          return;
        }

        setSearchResults([]);
        setSearchState('error');
        setSearchError(error instanceof Error ? error.message : '알 수 없는 검색 오류');
      });
  }

  function handleSearchInputChange(value: string) {
    clearSearchDebounceTimer();

    const requestSeq = suggestionRequestSeq.current + 1;
    suggestionRequestSeq.current = requestSeq;
    const query = value.trim();

    if (query.length === 0) {
      setComplexSuggestions([]);
      setSearchResults([]);
      setSearchState('idle');
      setSearchError(null);
      searchRequestSeq.current += 1;
      return;
    }

    setSearchState('loading');
    setSearchError(null);

    fetchComplexSuggestions(query)
      .then((nextSuggestions) => {
        if (requestSeq !== suggestionRequestSeq.current) {
          return;
        }
        setComplexSuggestions(nextSuggestions);
      })
      .catch(() => {
        if (requestSeq !== suggestionRequestSeq.current) {
          return;
        }
        setComplexSuggestions([]);
      });

    searchDebounceTimer.current = setTimeout(() => {
      searchDebounceTimer.current = null;
      runComplexSearch(query);
    }, SEARCH_DEBOUNCE_MILLIS);
  }

  function handleSearchResultSelect(result: ComplexSearchResult) {
    clearSearchDebounceTimer();
    onSelectComplex({
      parcelId: result.parcelId,
      complexId: result.complexId,
    });
    if (hasDisplayCoordinate(result)) {
      focusMap(result.latitude, result.longitude, 4, SEARCH_FOCUS_DELTA);
    }
  }

  function handleSuggestionSelect(suggestion: ComplexSuggestion) {
    clearSearchDebounceTimer();
    onSelectComplex({
      parcelId: suggestion.parcelId,
      complexId: suggestion.complexId,
    });
    setComplexSuggestions([]);
  }

  return {
    complexSuggestions,
    handleSearchInputChange,
    handleSearchResultSelect,
    handleSearchSubmit,
    handleSuggestionSelect,
    isSearchPanelActive,
    searchError,
    searchResults,
    searchState,
  };
}
