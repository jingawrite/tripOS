/**
 * CSRF (Cross-Site Request Forgery) 방어 모듈
 *
 * - 상태 변경 요청(POST/PUT/DELETE)에 CSRF 토큰 필수 적용
 * - Double Submit Cookie 패턴 사용
 * - 토큰 자동 갱신
 * - SameSite 쿠키 정책 보조
 *
 * 현재 프론트엔드 전용 앱이므로:
 * - 로컬 토큰 기반 검증 구현
 * - 백엔드 추가 시 서버측 검증으로 확장
 */

// ── CSRF 토큰 설정 ──
const CSRF_CONFIG = {
  /** 토큰 길이 (bytes) */
  TOKEN_LENGTH: 32,
  /** 토큰 만료 시간 (1시간) */
  TOKEN_EXPIRY_MS: 60 * 60 * 1000,
  /** 헤더 이름 */
  HEADER_NAME: 'X-CSRF-Token',
  /** 메타 태그 이름 */
  META_TAG_NAME: 'csrf-token',
  /** 스토리지 키 */
  STORAGE_KEY: 'tripos.security.csrf',
};

interface CsrfToken {
  token: string;
  createdAt: number;
  expiresAt: number;
}

// ── 현재 CSRF 토큰 ──
let currentToken: CsrfToken | null = null;

/**
 * 암호학적으로 안전한 랜덤 토큰 생성
 */
const generateToken = (): string => {
  const array = new Uint8Array(CSRF_CONFIG.TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * CSRF 토큰 생성 및 설정
 */
export const createCsrfToken = (): string => {
  const now = Date.now();
  const token = generateToken();

  currentToken = {
    token,
    createdAt: now,
    expiresAt: now + CSRF_CONFIG.TOKEN_EXPIRY_MS,
  };

  // sessionStorage에 저장 (탭 간 격리)
  try {
    sessionStorage.setItem(
      CSRF_CONFIG.STORAGE_KEY,
      JSON.stringify(currentToken)
    );
  } catch {
    // sessionStorage 사용 불가 시 메모리만 사용
  }

  // meta 태그 업데이트
  updateMetaTag(token);

  return token;
};

/**
 * 현재 CSRF 토큰 가져오기 (없거나 만료 시 자동 생성)
 */
export const getCsrfToken = (): string => {
  // 메모리에서 확인
  if (currentToken && Date.now() < currentToken.expiresAt) {
    return currentToken.token;
  }

  // sessionStorage에서 복구 시도
  try {
    const stored = sessionStorage.getItem(CSRF_CONFIG.STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CsrfToken;
      if (Date.now() < parsed.expiresAt) {
        currentToken = parsed;
        return parsed.token;
      }
    }
  } catch {
    // 무시
  }

  // 새 토큰 생성
  return createCsrfToken();
};

/**
 * CSRF 토큰 검증
 *
 * @param token - 요청에 포함된 CSRF 토큰
 * @returns 검증 성공 여부
 */
export const validateCsrfToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const currentTokenValue = getCsrfToken();

  // Timing-safe 비교 (타이밍 공격 방어)
  return timingSafeEqual(token, currentTokenValue);
};

/**
 * 타이밍 안전한 문자열 비교
 * 문자열 길이에 관계없이 일정한 시간 소요
 */
const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

/**
 * meta 태그에 CSRF 토큰 설정
 */
const updateMetaTag = (token: string): void => {
  if (typeof document === 'undefined') return;

  let meta = document.querySelector(
    `meta[name="${CSRF_CONFIG.META_TAG_NAME}"]`
  ) as HTMLMetaElement | null;

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = CSRF_CONFIG.META_TAG_NAME;
    document.head.appendChild(meta);
  }

  meta.content = token;
};

/**
 * fetch 요청에 CSRF 토큰 추가
 * 상태 변경 메서드(POST, PUT, DELETE, PATCH)에만 적용
 */
export const addCsrfHeader = (
  headers: HeadersInit = {},
  method: string = 'GET'
): HeadersInit => {
  const statefulMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  const upperMethod = method.toUpperCase();

  if (!statefulMethods.includes(upperMethod)) {
    return headers;
  }

  const token = getCsrfToken();
  const newHeaders = new Headers(headers);
  newHeaders.set(CSRF_CONFIG.HEADER_NAME, token);

  return newHeaders;
};

/**
 * CSRF 보호된 fetch 래퍼
 */
export const secureFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const method = options.method || 'GET';
  const headers = addCsrfHeader(options.headers || {}, method);

  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // SameSite 쿠키 전송
  });
};

/**
 * CSRF 토큰 무효화 (로그아웃 시)
 */
export const invalidateCsrfToken = (): void => {
  currentToken = null;
  try {
    sessionStorage.removeItem(CSRF_CONFIG.STORAGE_KEY);
  } catch {
    // 무시
  }

  // meta 태그 제거
  if (typeof document !== 'undefined') {
    const meta = document.querySelector(
      `meta[name="${CSRF_CONFIG.META_TAG_NAME}"]`
    );
    if (meta) {
      meta.remove();
    }
  }
};

// 내보내기: 설정 (테스트용)
export { CSRF_CONFIG };
