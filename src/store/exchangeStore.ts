import { create } from 'zustand';
import { Currency, ExchangeRate } from '../types/exchange';
import { fetchExchangeRate, getCachedRate, getCachedRateIncludingExpired } from '../lib/exchangeApi';

interface ExchangeStore {
  selectedCurrency: Currency;
  exchangeRate: ExchangeRate | null;
  isLoading: boolean;
  error: string | null;
  setSelectedCurrency: (currency: Currency) => void;
  loadExchangeRate: (forceRefresh?: boolean) => Promise<void>;
}

export const useExchangeStore = create<ExchangeStore>((set, get) => ({
  selectedCurrency: 'USD',
  exchangeRate: null,
  isLoading: false,
  error: null,

  setSelectedCurrency: (currency: Currency) => {
    set({ selectedCurrency: currency });
    // 통화 변경 시 환율 로드
    get().loadExchangeRate();
  },

  loadExchangeRate: async (forceRefresh: boolean = false) => {
    const { selectedCurrency } = get();
    
    set({ isLoading: true, error: null });

    // 강제 새로고침이 아니면 캐시 먼저 확인
    if (!forceRefresh) {
      const cached = getCachedRate(selectedCurrency);
      if (cached) {
        set({ exchangeRate: cached, isLoading: false });
        return; // 유효한 캐시가 있으면 API 호출 안 함
      }
    }

    try {
      // API 호출
      const rate = await fetchExchangeRate(selectedCurrency, forceRefresh);

      if (rate) {
        set({ exchangeRate: rate, isLoading: false, error: null });
      } else {
        // API 호출은 성공했지만 rate가 null인 경우 (거의 없음)
        const expiredCache = getCachedRateIncludingExpired(selectedCurrency);
        if (expiredCache) {
          set({ 
            exchangeRate: expiredCache, 
            isLoading: false, 
            error: '네트워크 연결 필요' 
          });
        } else {
          set({ 
            exchangeRate: null, 
            isLoading: false, 
            error: '데이터 없음' 
          });
        }
      }
    } catch (error) {
      // API 호출 실패 시 만료된 캐시라도 표시
      const expiredCache = getCachedRateIncludingExpired(selectedCurrency);
      if (expiredCache) {
        set({ 
          exchangeRate: expiredCache, 
          isLoading: false, 
          error: '네트워크 연결 필요' 
        });
      } else {
        set({ 
          exchangeRate: null, 
          isLoading: false, 
          error: '데이터 없음' 
        });
      }
    }
  },
}));
