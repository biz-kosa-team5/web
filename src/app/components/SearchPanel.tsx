import type { FormEvent } from 'react';

import type { ComplexSuggestion } from '../../features/search/api/fetchComplexSuggestions';
import type { ComplexSearchResult } from '../../features/search/api/fetchComplexSearchResults';
import type { PanelRequestState } from '../appTypes';
import { formatAddress, panelRequestLabel } from '../appUtils';
import { DataCountStrip } from './DataCountStrip';

export function SearchPanel({
  complexSuggestions,
  hidden,
  onSearchResultSelect,
  onSuggestionSelect,
  searchError,
  searchResults,
  searchState,
}: {
  complexSuggestions: ComplexSuggestion[];
  hidden: boolean;
  onSearchResultSelect: (result: ComplexSearchResult) => void;
  onSuggestionSelect: (suggestion: ComplexSuggestion) => void;
  searchError: string | null;
  searchResults: ComplexSearchResult[];
  searchState: PanelRequestState;
}) {
  const visibleSuggestions = searchResults.length > 0 ? [] : complexSuggestions;
  const searchStatusLabel = searchState === 'ready' ? null : panelRequestLabel(searchState);

  return (
    <section
      id="exploration-panel-search"
      aria-label="검색 결과 패널"
      className="panel-section"
      data-api-flow="search"
      hidden={hidden}
    >
      <div className="panel-section-header">
        <p>검색 결과</p>
        {searchStatusLabel ? <span>{searchStatusLabel}</span> : null}
      </div>

      <DataCountStrip
        items={[
          ['제안', visibleSuggestions.length],
          ['결과', searchResults.length],
        ]}
      />

      {searchState === 'loading' ? (
        <p className="panel-message" role="status" aria-live="polite">
          단지 검색 중
        </p>
      ) : null}

      {searchState === 'empty' ? (
        <p className="panel-message" role="status" aria-live="polite">
          검색 결과가 없습니다
        </p>
      ) : null}

      {searchState === 'error' ? (
        <p className="panel-message panel-message-error" role="alert">
          검색을 사용할 수 없습니다.
          {searchError ? ` ${searchError}` : null}
        </p>
      ) : null}

      {searchResults.length > 0 ? (
        <ul aria-label="검색 결과" className="panel-list panel-list-strong">
          {searchResults.map((result) => (
            <li key={result.complexId}>
              <button
                type="button"
                aria-label={`검색 결과 선택 ${result.complexName}`}
                onClick={() => {
                  onSearchResultSelect(result);
                }}
              >
                <span>{result.complexName}</span>
                <span>{formatAddress(result.address)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {visibleSuggestions.length > 0 ? (
        <ul aria-label="검색 제안" className="panel-list">
          {visibleSuggestions.map((suggestion) => (
            <li key={suggestion.complexId}>
              <button
                type="button"
                aria-label={`검색 제안 선택 ${suggestion.complexName}`}
                onClick={() => {
                  onSuggestionSelect(suggestion);
                }}
              >
                <span>{suggestion.complexName}</span>
                <span>{formatAddress(suggestion.address)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function SearchForm({
  hidden,
  onInputChange,
  onSubmit,
}: {
  hidden: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      aria-label="단지 검색"
      className="search-panel exploration-search-panel"
      hidden={hidden}
      onSubmit={onSubmit}
    >
      <label>
        <span className="sr-only">단지</span>
        <input
          aria-label="단지 검색"
          name="q"
          onInput={(event) => {
            onInputChange(event.currentTarget.value);
          }}
          placeholder="아파트명을 검색해보세요."
          type="search"
        />
      </label>
      <button type="submit" aria-label="단지 검색 실행">
        검색
      </button>
    </form>
  );
}
