import { Currency, ExchangeRate, ExchangeCache } from '../types/exchange';
import { STORAGE_KEYS, getFromStorage, saveToStorage } from './storage';
import { validateApiUrl } from './security/urlValidator';
import { validateCurrency } from './security/inputValidator';
import { checkRateLimit, RATE_LIMIT_PRESETS } from './security/rateLimiter';
import { logAudit } from './security/auditLog';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간 (밀리초)

// API Base URL (화이트리스트 검증됨)
const API_BASE_URL = 'https://api.frankfurter.app';

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
  // 1. 통화 코드 검증 (화이트리스트)
  const currencyValidation = validateCurrency(currency);
  if (!currencyValidation.valid) {
    logAudit({
      action: 'SECURITY_INPUT_INVALID',
      resource: 'exchange',
      details: `Invalid currency: ${currency}`,
    });
    throw new Error('유효하지 않은 통화 코드입니다');
  }

  // 2. Rate Limit 검사
  const rateResult = checkRateLimit('api:exchange', RATE_LIMIT_PRESETS.API_CALL);
  if (!rateResult.allowed) {
    logAudit({
      action: 'SECURITY_RATE_LIMIT_HIT',
      resource: 'exchange',
      details: `Rate limit exceeded for exchange API`,
    });
    throw new Error(rateResult.reason || '요청이 너무 많습니다');
  }

  // 강제 새로고침이 아니면 캐시 확인
  if (!forceRefresh) {
    const cached = getCachedRate(currency);
    if (cached) {
      return cached;
    }
  }

  // 3. URL 검증 (SSRF 방어)
  const apiUrl = `${API_BASE_URL}/latest?from=${encodeURIComponent(currency)}&to=KRW`;
  const urlValidation = validateApiUrl(apiUrl);
  if (!urlValidation.valid) {
    logAudit({
      action: 'SECURITY_URL_BLOCKED',
      resource: 'exchange',
      details: `URL blocked: ${urlValidation.reason}`,
    });
    throw new Error('API URL 검증 실패');
  }

  try {
    // AbortSignal.timeout이 지원되지 않는 환경 대응
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(urlValidation.sanitizedUrl!, {
      signal: controller.signal,
    });

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

    // Audit Log
    logAudit({
      action: 'API_CALL',
      resource: 'exchange',
      details: `환율 조회: ${currency} = ${rate} KRW`,
    });

    return exchangeRate;
  } catch (error) {
    // Audit Log
    logAudit({
      action: 'API_ERROR',
      resource: 'exchange',
      details: error instanceof Error ? error.message : 'Unknown error',
    });

    // 에러를 상위로 전달하여 store에서 처리
    throw error;
  }
};
