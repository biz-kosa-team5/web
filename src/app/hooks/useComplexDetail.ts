import { useEffect, useRef, useState } from 'react';

import {
  fetchComplexDetail,
  fetchComplexDetailByComplexId,
  type ComplexDetail,
} from '../../features/complex-detail/api/fetchComplexDetail';
import {
  fetchParcelComplexes,
  type ParcelComplexSummary,
} from '../../features/complex-detail/api/fetchParcelComplexes';
import {
  fetchComplexTrades,
  fetchParcelTrades,
  type ParcelTrades,
  type TradeItem,
} from '../../features/complex-detail/api/fetchParcelTrades';
import {
  fetchComplexTradeTrend,
  fetchParcelTradeTrend,
  type TradeTrendPoint,
} from '../../features/complex-detail/api/fetchTradeTrend';
import { TRADE_PAGE_SIZE } from '../appConstants';
import type { ComplexSelection, DetailRequestState } from '../appTypes';
import { requiredParcelId } from '../appUtils';

export function useComplexDetail(selectedComplex: ComplexSelection | null) {
  const [complexDetail, setComplexDetail] = useState<ComplexDetail | null>(null);
  const [parcelTrades, setParcelTrades] = useState<ParcelTrades | null>(null);
  const [tradeTrend, setTradeTrend] = useState<TradeTrendPoint[]>([]);
  const [tradePage, setTradePage] = useState(0);
  const [tradeRows, setTradeRows] = useState<TradeItem[]>([]);
  const [parcelComplexes, setParcelComplexes] = useState<ParcelComplexSummary[]>([]);
  const [detailState, setDetailState] = useState<DetailRequestState>('idle');
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRetrySeq, setDetailRetrySeq] = useState(0);
  const detailRequestSeq = useRef(0);
  const tradePageRequestSeq = useRef(0);
  const parcelComplexRequestSeq = useRef(0);

  useEffect(() => {
    if (selectedComplex == null) {
      setComplexDetail(null);
      setParcelTrades(null);
      setTradeTrend([]);
      setTradePage(0);
      setTradeRows([]);
      setParcelComplexes([]);
      setDetailState('idle');
      setDetailError(null);
      return undefined;
    }

    const requestSeq = detailRequestSeq.current + 1;
    detailRequestSeq.current = requestSeq;
    tradePageRequestSeq.current += 1;
    let ignore = false;

    setDetailState('loading');
    setDetailError(null);

    const isComplexScoped = selectedComplex.parcelId == null && selectedComplex.complexId != null;
    const detailRequest = isComplexScoped
      ? fetchComplexDetailByComplexId(selectedComplex.complexId as number)
      : fetchComplexDetail(requiredParcelId(selectedComplex), selectedComplex.complexId);
    const tradeRequest = isComplexScoped
      ? fetchComplexTrades(selectedComplex.complexId as number)
      : fetchParcelTrades(requiredParcelId(selectedComplex), selectedComplex.complexId);
    const trendRequest = (isComplexScoped
      ? fetchComplexTradeTrend(selectedComplex.complexId as number)
      : fetchParcelTradeTrend(requiredParcelId(selectedComplex), selectedComplex.complexId)
    ).catch((): TradeTrendPoint[] => []);

    Promise.all([detailRequest, tradeRequest, trendRequest])
      .then(([nextDetail, nextTrades, nextTrend]) => {
        if (ignore || requestSeq !== detailRequestSeq.current) {
          return;
        }

        setComplexDetail(nextDetail);
        setParcelTrades(nextTrades);
        setTradeTrend(nextTrend);
        setTradePage(nextTrades.page);
        setTradeRows(nextTrades.trades);
        setDetailState('ready');
      })
      .catch((error: unknown) => {
        if (ignore || requestSeq !== detailRequestSeq.current) {
          return;
        }

        setComplexDetail(null);
        setParcelTrades(null);
        setTradeTrend([]);
        setTradePage(0);
        setTradeRows([]);
        setDetailState('error');
        setDetailError(error instanceof Error ? error.message : '알 수 없는 상세 정보 오류');
      });

    return () => {
      ignore = true;
    };
  }, [selectedComplex, detailRetrySeq]);

  useEffect(() => {
    if (complexDetail == null || detailState !== 'ready') {
      setParcelComplexes([]);
      return undefined;
    }

    const requestSeq = parcelComplexRequestSeq.current + 1;
    parcelComplexRequestSeq.current = requestSeq;
    let ignore = false;

    fetchParcelComplexes(complexDetail.parcelId)
      .then((nextComplexes) => {
        if (ignore || requestSeq !== parcelComplexRequestSeq.current) {
          return;
        }
        setParcelComplexes(nextComplexes);
      })
      .catch(() => {
        if (ignore || requestSeq !== parcelComplexRequestSeq.current) {
          return;
        }
        setParcelComplexes([]);
      });

    return () => {
      ignore = true;
    };
  }, [complexDetail, detailState]);

  function handleRetryDetail() {
    setDetailRetrySeq((current) => current + 1);
  }

  function handleLoadMoreTrades() {
    if (selectedComplex == null) {
      return;
    }

    const nextPage = tradePage + 1;
    const requestSeq = tradePageRequestSeq.current + 1;
    tradePageRequestSeq.current = requestSeq;

    const request = selectedComplex.parcelId == null && selectedComplex.complexId != null
      ? fetchComplexTrades(selectedComplex.complexId, { page: nextPage, size: TRADE_PAGE_SIZE })
      : fetchParcelTrades(
        requiredParcelId(selectedComplex),
        selectedComplex.complexId,
        { page: nextPage, size: TRADE_PAGE_SIZE },
      );

    request
      .then((next) => {
        if (requestSeq !== tradePageRequestSeq.current) {
          return;
        }

        setTradePage(next.page);
        setTradeRows((current) => [...current, ...next.trades]);
      })
      .catch(() => {
        // Keep the loaded rows rendered when a page fetch fails.
      });
  }

  return {
    complexDetail,
    detailError,
    detailState,
    handleLoadMoreTrades,
    handleRetryDetail,
    parcelComplexes,
    parcelTrades,
    tradeRows,
    tradeTrend,
  };
}
