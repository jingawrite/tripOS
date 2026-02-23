import { Currency, ExchangeRate, ExchangeCache } from '../types/exchange';
import { STORAGE_KEYS, getFromStorage, saveToStorage } from './storage';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간 (밀리초)

// 캐시에서 환율 가져오기 (유효한 것만)
export const getCachedRate = (currency: Currency): ExchangeRate | null => {
  const cache = getFromStorage<ExchangeCache>(STORAGE_KEYS.EXCHANGE_CACHE, {});
  const cached = cache[currency];

  if (!cached) return null;

  // TTL 체크
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    return null; // 만료된 캐시
  }

  return cached;
};

// 캐시에서 환율 가져오기 (만료된 것도 허용)
export const getCachedRateIncludingExpired = (currency: Currency): ExchangeRate | null => {
  const cache = getFromStorage<ExchangeCache>(STORAGE_KEYS.EXCHANGE_CACHE, {});
  return cache[currency] || null;
};

// 캐시에 환율 저장
export const saveCachedRate = (currency: Currency, rate: number): void => {
  const cache = getFromStorage<ExchangeCache>(STORAGE_KEYS.EXCHANGE_CACHE, {});
  cache[currency] = {
    currency,
    rate,
    timestamp: Date.now(),
  };
  saveToStorage(STORAGE_KEYS.EXCHANGE_CACHE, cache);
};

// Frankfurter API에서 환율 가져오기
export const fetchExchangeRate = async (
  currency: Currency,
  forceRefresh: boolean = false
): Promise<ExchangeRate | null> => {
  // 강제 새로고침이 아니면 캐시 확인
  if (!forceRefresh) {
    const cached = getCachedRate(currency);
    if (cached) {
      return cached;
    }
  }

  try {
    // AbortSignal.timeout이 지원되지 않는 환경 대응
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${currency}&to=KRW`,
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('API 요청 실패');
    }

    const data = await response.json();
    
    if (!data.rates || typeof data.rates.KRW !== 'number') {
      throw new Error('잘못된 응답 형식');
    }

    const rate = Math.floor(data.rates.KRW); // 소수점 절삭

    const exchangeRate: ExchangeRate = {
      currency,
      rate,
      timestamp: Date.now(),
    };

    // 캐시에 저장
    saveCachedRate(currency, rate);

    return exchangeRate;
  } catch (error) {
    // 에러를 상위로 전달하여 store에서 처리
    throw error;
  }
};
