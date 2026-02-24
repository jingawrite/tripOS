/**
 * XSS (Cross-Site Scripting) 방어 모듈
 *
 * - HTML 엔티티 이스케이프
 * - 위험한 HTML 태그/속성 제거
 * - JavaScript URI 차단
 * - dangerouslySetInnerHTML 사용 금지 (React 기본 보호)
 */

// HTML 특수문자 이스케이프 맵
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const HTML_ESCAPE_REGEX = /[&<>"'`/]/g;

/**
 * HTML 특수문자를 엔티티로 이스케이프
 * XSS 공격에 사용되는 모든 특수문자를 안전한 HTML 엔티티로 변환
 */
export const escapeHtml = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] || char);
};

/**
 * HTML 태그를 모두 제거 (텍스트만 추출)
 */
export const stripHtmlTags = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '');
};

// 위험한 프로토콜 패턴
const DANGEROUS_PROTOCOLS = /^(javascript|vbscript|data|mhtml):/i;

// 이벤트 핸들러 패턴 (onclick, onerror 등)
const EVENT_HANDLER_REGEX = /\bon\w+\s*=/gi;

// script 태그 패턴
const SCRIPT_TAG_REGEX = /<\s*\/?\s*script[\s>]/gi;

// eval/Function 패턴
const EVAL_REGEX = /\b(eval|Function|setTimeout|setInterval)\s*\(/gi;

/**
 * 문자열에서 XSS 위험 요소 감지
 * @returns true if XSS patterns detected
 */
export const detectXss = (input: string): boolean => {
  if (typeof input !== 'string') return false;

  return (
    DANGEROUS_PROTOCOLS.test(input) ||
    EVENT_HANDLER_REGEX.test(input) ||
    SCRIPT_TAG_REGEX.test(input) ||
    EVAL_REGEX.test(input) ||
    input.includes('&#') || // HTML 엔티티 인코딩 공격
    input.includes('\\u00') // 유니코드 이스케이프 공격
  );
};

/**
 * 문자열에서 위험한 XSS 패턴을 제거하여 안전한 텍스트로 변환
 */
export const sanitizeText = (input: string): string => {
  if (typeof input !== 'string') return '';

  let sanitized = input;

  // 1. HTML 태그 제거
  sanitized = stripHtmlTags(sanitized);

  // 2. 이벤트 핸들러 속성 제거
  sanitized = sanitized.replace(EVENT_HANDLER_REGEX, '');

  // 3. 위험한 프로토콜 제거
  sanitized = sanitized.replace(DANGEROUS_PROTOCOLS, '');

  // 4. eval/Function 등 제거
  sanitized = sanitized.replace(EVAL_REGEX, '');

  // 5. null bytes 제거
  sanitized = sanitized.replace(/\0/g, '');

  // 6. 트림
  return sanitized.trim();
};

/**
 * URL에서 XSS 위험 요소 제거
 * javascript:, data:, vbscript: 프로토콜 차단
 */
export const sanitizeUrl = (url: string): string => {
  if (typeof url !== 'string') return '';

  const trimmed = url.trim();

  // 빈 문자열
  if (!trimmed) return '';

  // 위험한 프로토콜 차단
  if (DANGEROUS_PROTOCOLS.test(trimmed)) {
    return '';
  }

  // http:// 또는 https://만 허용
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return '';
  }

  return trimmed;
};

/**
 * 이모지만 허용하는 sanitizer (HTML/스크립트 주입 방지)
 */
export const sanitizeEmoji = (input: string): string => {
  if (typeof input !== 'string') return '';

  // HTML 태그 제거
  const stripped = stripHtmlTags(input);

  // ASCII 제어문자 제거 (이모지와 일반 텍스트만 허용)
  // eslint-disable-next-line no-control-regex
  return stripped.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
};
