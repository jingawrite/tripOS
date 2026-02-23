// localStorage 유틸리티 함수 (안정화 버전)
// Safari 프라이빗 모드 등에서도 안전하게 동작하도록 try/catch 강화

export const STORAGE_KEYS = {
  SCHEDULES: "tripos.v1.schedules",
  SETTINGS: "tripos.v1.settings",
  EXCHANGE_CACHE: "tripos.v1.exchangeCache",
} as const;

// localStorage 읽기 (안전)
export const getFromStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    
    const parsed = JSON.parse(item);
    return parsed as T;
  } catch (error) {
    // JSON 파싱 실패 또는 스토리지 접근 불가 시 기본값 반환
    return defaultValue;
  }
};

// localStorage 저장 (안전)
export const saveToStorage = <T>(key: string, value: T): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    // 스토리지 용량 초과 또는 접근 불가 시 실패
    return false;
  }
};

// localStorage 삭제 (안전)
export const removeFromStorage = (key: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch (error) {
    // 무시
  }
};
