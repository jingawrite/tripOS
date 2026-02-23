export type Currency = 'JPY' | 'USD' | 'THB' | 'VND';

export interface CurrencyInfo {
  code: Currency;
  emoji: string;
  name: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'JPY', emoji: '🇯🇵', name: 'JPY' },
  { code: 'USD', emoji: '🇺🇸', name: 'USD' },
  { code: 'THB', emoji: '🇹🇭', name: 'THB' },
  { code: 'VND', emoji: '🇻🇳', name: 'VND' },
];

export interface ExchangeRate {
  currency: Currency;
  rate: number; // KRW 기준 환율
  timestamp: number; // 캐시 시간
}

export interface ExchangeCache {
  [key: string]: ExchangeRate;
}
