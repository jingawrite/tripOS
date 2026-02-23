import React, { createContext, useContext, useCallback } from 'react';
import { Category } from '../types/schedule';
import { AdPlacement } from '../components/AdSlot';

interface AdProviderContextValue {
  loadAd: (category: Category, placement: AdPlacement) => void;
  // 향후 확장 가능한 메서드들:
  // - showAd: (category: Category, placement: AdPlacement) => Promise<void>;
  // - hideAd: (placement: AdPlacement) => void;
  // - trackAdClick: (category: Category, placement: AdPlacement) => void;
}

const AdProviderContext = createContext<AdProviderContextValue | null>(null);

interface AdProviderProps {
  children: React.ReactNode;
}

export const AdProvider = ({ children }: AdProviderProps) => {
  const loadAd = useCallback((category: Category, placement: AdPlacement) => {
    // 현재는 콘솔 로그만 출력
    // 향후 Google Ads / 제휴 API / 내부 배너 로직 연결 가능
    console.log(`[AdProvider] Loading ad for category: ${category}, placement: ${placement}`);
    
    // 예시: 향후 구현 가능한 구조
    // if (adConfig.provider === 'google-ads') {
    //   loadGoogleAd(category, placement);
    // } else if (adConfig.provider === 'partnership') {
    //   loadPartnershipAd(category, placement);
    // } else if (adConfig.provider === 'internal') {
    //   loadInternalBanner(category, placement);
    // }
  }, []);

  const value: AdProviderContextValue = {
    loadAd,
  };

  return (
    <AdProviderContext.Provider value={value}>
      {children}
    </AdProviderContext.Provider>
  );
};

export const useAdProvider = (): AdProviderContextValue => {
  const context = useContext(AdProviderContext);
  if (!context) {
    throw new Error('useAdProvider must be used within AdProvider');
  }
  return context;
};
