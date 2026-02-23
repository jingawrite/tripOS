// 온라인 상태 감지 유틸리티

let onlineStatusListeners: Array<(isOnline: boolean) => void> = [];

// 온라인 상태 변경 리스너 등록
export const addOnlineStatusListener = (callback: (isOnline: boolean) => void): (() => void) => {
  onlineStatusListeners.push(callback);
  
  // 초기 상태 전달
  callback(navigator.onLine);

  // 리스너 제거 함수 반환
  return () => {
    onlineStatusListeners = onlineStatusListeners.filter((cb) => cb !== callback);
  };
};

// 온라인 상태 확인
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// 초기화 (이벤트 리스너 등록)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    onlineStatusListeners.forEach((callback) => callback(true));
  });

  window.addEventListener('offline', () => {
    onlineStatusListeners.forEach((callback) => callback(false));
  });
}
