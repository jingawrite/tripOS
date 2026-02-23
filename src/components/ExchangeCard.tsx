import { useState, useEffect, useRef } from 'react';
import { useExchangeStore } from '../store/exchangeStore';
import { CURRENCIES } from '../types/exchange';
import { addOnlineStatusListener, isOnline } from '../lib/onlineStatus';
import './ExchangeCard.css';

const ExchangeCard = () => {
  const {
    selectedCurrency,
    exchangeRate,
    isLoading,
    error,
    setSelectedCurrency,
    loadExchangeRate,
  } = useExchangeStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!isOnline());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadExchangeRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 온라인 상태 감지
  useEffect(() => {
    const removeListener = addOnlineStatusListener((isOnline) => {
      setIsOffline(!isOnline);
      // 온라인 복귀 시 자동 재요청
      if (isOnline && !exchangeRate) {
        loadExchangeRate();
      }
    });

    return removeListener;
  }, [exchangeRate, loadExchangeRate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const selectedCurrencyInfo = CURRENCIES.find(
    (c) => c.code === selectedCurrency
  );

  const handleCurrencySelect = (currency: string) => {
    setSelectedCurrency(currency as typeof selectedCurrency);
    setIsDropdownOpen(false);
  };

  const handleRefresh = () => {
    if (!isOffline) {
      loadExchangeRate(true);
    }
  };

  const formatRate = () => {
    if (!exchangeRate) {
      // 오프라인이고 캐시가 없으면
      if (isOffline && !error) {
        return '네트워크 연결 필요';
      }
      return error || '데이터 없음';
    }

    return `1 ${exchangeRate.currency} = ${exchangeRate.rate.toLocaleString()}원`;
  };

  const displayError = () => {
    if (isOffline && !exchangeRate) {
      return '네트워크 연결 필요';
    }
    return error;
  };

  return (
    <div className="exchange-card" style={{ gridColumn: 'span 2' }}>
      <div className="exchange-card-header">
        <div
          className="currency-selector"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span className="currency-emoji">{selectedCurrencyInfo?.emoji}</span>
          <span className="currency-code">{selectedCurrency}</span>
          <span className="dropdown-arrow">▼</span>
        </div>
        <button 
          className="refresh-button" 
          onClick={handleRefresh} 
          type="button"
          disabled={isOffline}
          title={isOffline ? '오프라인 상태입니다' : '새로고침'}
        >
          ⟳
        </button>
      </div>

      {isDropdownOpen && (
        <div className="currency-dropdown" ref={dropdownRef}>
          {CURRENCIES.map((currency) => (
            <div
              key={currency.code}
              className={`dropdown-item ${
                selectedCurrency === currency.code ? 'selected' : ''
              }`}
              onClick={() => handleCurrencySelect(currency.code)}
            >
              <span className="currency-emoji">{currency.emoji}</span>
              <span className="currency-name">{currency.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="exchange-rate-content">
        {isLoading ? (
          <div className="loading">로딩 중...</div>
        ) : (
          <>
            <div className="exchange-rate-text">{formatRate()}</div>
            {displayError() && (
              <div className="error-message">{displayError()}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExchangeCard;
