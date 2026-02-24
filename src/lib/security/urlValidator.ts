/**
 * SSRF (Server-Side Request Forgery) 방어 모듈
 *
 * - 내부 IP 주소 접근 차단 (127.0.0.1, 10.x.x.x, 172.16-31.x.x, 192.168.x.x)
 * - 클라우드 메타데이터 서버 접근 차단 (169.254.169.254)
 * - 허용된 도메인/프로토콜만 통과
 * - localhost, 0.0.0.0 차단
 */

// 내부 IP 범위 패턴
const PRIVATE_IP_PATTERNS = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,       // 127.0.0.0/8 (loopback)
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,         // 10.0.0.0/8 (private)
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12 (private)
  /^192\.168\.\d{1,3}\.\d{1,3}$/,             // 192.168.0.0/16 (private)
  /^169\.254\.\d{1,3}\.\d{1,3}$/,             // 169.254.0.0/16 (link-local / cloud metadata)
  /^0\.0\.0\.0$/,                              // all interfaces
  /^::1$/,                                     // IPv6 loopback
  /^fc00:/i,                                   // IPv6 ULA
  /^fe80:/i,                                   // IPv6 link-local
];

// 차단 호스트네임
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '[::1]',
  'metadata.google.internal',     // GCP metadata
  'metadata.google.com',
  'instance-data',                 // AWS instance metadata alias
];

// 허용 프로토콜
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// 허용 API 도메인 (화이트리스트)
const ALLOWED_API_DOMAINS = [
  'api.frankfurter.app',
];

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
  sanitizedUrl?: string;
}

/**
 * 호스트네임이 내부 IP인지 검사
 */
const isPrivateIp = (hostname: string): boolean => {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname));
};

/**
 * 호스트네임이 차단 목록에 있는지 검사
 */
const isBlockedHostname = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();
  return BLOCKED_HOSTNAMES.includes(lower);
};

/**
 * URL의 안전성을 검증 (SSRF 방어)
 *
 * @param url - 검증할 URL 문자열
 * @param options - 추가 옵션
 * @returns 검증 결과
 */
export const validateUrl = (
  url: string,
  options: {
    allowedDomains?: string[];
    requireHttps?: boolean;
  } = {}
): UrlValidationResult => {
  if (typeof url !== 'string' || !url.trim()) {
    return { valid: false, reason: 'URL이 비어있습니다' };
  }

  const trimmed = url.trim();

  // URL 파싱
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: '유효하지 않은 URL 형식입니다' };
  }

  // 1. 프로토콜 검사
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return { valid: false, reason: `허용되지 않은 프로토콜: ${parsed.protocol}` };
  }

  // 2. HTTPS 필수 옵션
  if (options.requireHttps && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'HTTPS만 허용됩니다' };
  }

  // 3. 호스트네임 검사
  const hostname = parsed.hostname;

  if (!hostname) {
    return { valid: false, reason: '호스트네임이 없습니다' };
  }

  // 4. 차단 호스트 검사
  if (isBlockedHostname(hostname)) {
    return { valid: false, reason: '내부 호스트 접근이 차단되었습니다' };
  }

  // 5. 내부 IP 검사
  if (isPrivateIp(hostname)) {
    return { valid: false, reason: '내부 IP 접근이 차단되었습니다' };
  }

  // 6. 도메인 화이트리스트 검사 (API 호출 시)
  if (options.allowedDomains && options.allowedDomains.length > 0) {
    const isAllowed = options.allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
    if (!isAllowed) {
      return { valid: false, reason: `허용되지 않은 도메인: ${hostname}` };
    }
  }

  return { valid: true, sanitizedUrl: parsed.href };
};

/**
 * API 호출 전 URL 검증 (화이트리스트 기반)
 */
export const validateApiUrl = (url: string): UrlValidationResult => {
  return validateUrl(url, {
    allowedDomains: ALLOWED_API_DOMAINS,
    requireHttps: true,
  });
};

/**
 * 사용자가 입력한 URL 검증 (SSRF + XSS 방어)
 */
export const validateUserUrl = (url: string): UrlValidationResult => {
  if (!url || !url.trim()) {
    return { valid: true, sanitizedUrl: '' }; // 빈 URL은 허용 (선택사항)
  }

  const result = validateUrl(url);

  if (!result.valid) {
    return result;
  }

  // 추가: javascript: 프로토콜 등은 이미 차단됨 (ALLOWED_PROTOCOLS)
  return result;
};

/**
 * 외부 URL 열기 (안전하게)
 */
export const openUrlSafely = (url: string): boolean => {
  const result = validateUserUrl(url);
  if (!result.valid || !result.sanitizedUrl) {
    console.warn(`[Security] URL 접근 차단: ${result.reason}`);
    return false;
  }

  // noopener, noreferrer로 열기 (탭내빙 방지)
  window.open(result.sanitizedUrl, '_blank', 'noopener,noreferrer');
  return true;
};
