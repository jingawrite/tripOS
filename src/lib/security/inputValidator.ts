/**
 * Input Validation 모듈
 *
 * - 모든 사용자 입력값에 대한 서버측 패턴 검증
 * - Prepared Statement / ORM 패턴 대응 (SQLi 방어)
 * - 타입 안전성 보장
 */

import { Category } from '../../types/schedule';
import { Currency } from '../../types/exchange';
import { sanitizeText, sanitizeEmoji, sanitizeUrl } from './xss';

// ── 유효한 값 목록 (화이트리스트) ──
const VALID_CATEGORIES: Category[] = ['boarding_pass', 'accommodation', 'sim', 'custom'];
const VALID_CURRENCIES: Currency[] = ['JPY', 'USD', 'THB', 'VND'];

// ── SQL Injection 패턴 감지 ──
const SQL_INJECTION_PATTERNS = [
  /('\s*(OR|AND)\s+')/i,
  /(;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC)\s)/i,
  /(UNION\s+(ALL\s+)?SELECT)/i,
  /(-{2}|\/\*|\*\/)/,              // SQL 주석
  /(xp_|sp_|0x[0-9a-f]+)/i,       // SQL Server 특수
  /(\bSLEEP\s*\()/i,              // Time-based injection
  /(\bBENCHMARK\s*\()/i,          // MySQL benchmark
  /(\bWAITFOR\s+DELAY)/i,         // SQL Server waitfor
];

/**
 * SQL Injection 패턴 감지
 */
export const detectSqlInjection = (input: string): boolean => {
  if (typeof input !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
};

// ── 검증 결과 타입 ──
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedValue?: unknown;
}

/**
 * 문자열 입력 검증
 */
export const validateString = (
  input: unknown,
  options: {
    fieldName: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  }
): ValidationResult => {
  const errors: string[] = [];

  if (input === undefined || input === null || input === '') {
    if (options.required) {
      errors.push(`${options.fieldName}은(는) 필수 입력 항목입니다`);
    }
    return { valid: errors.length === 0, errors, sanitizedValue: '' };
  }

  if (typeof input !== 'string') {
    return { valid: false, errors: [`${options.fieldName}은(는) 문자열이어야 합니다`] };
  }

  // SQLi 감지
  if (detectSqlInjection(input)) {
    return { valid: false, errors: [`${options.fieldName}에 허용되지 않은 패턴이 포함되어 있습니다`] };
  }

  const sanitized = sanitizeText(input);

  if (options.minLength && sanitized.length < options.minLength) {
    errors.push(`${options.fieldName}은(는) 최소 ${options.minLength}자 이상이어야 합니다`);
  }

  if (options.maxLength && sanitized.length > options.maxLength) {
    errors.push(`${options.fieldName}은(는) 최대 ${options.maxLength}자까지 입력 가능합니다`);
  }

  if (options.pattern && !options.pattern.test(sanitized)) {
    errors.push(`${options.fieldName}의 형식이 올바르지 않습니다`);
  }

  return { valid: errors.length === 0, errors, sanitizedValue: sanitized };
};

/**
 * 날짜 입력 검증 (YYYY-MM-DD 형식)
 */
export const validateDate = (input: unknown, fieldName = '날짜'): ValidationResult => {
  const errors: string[] = [];

  if (typeof input !== 'string' || !input.trim()) {
    return { valid: false, errors: [`${fieldName}을(를) 입력해주세요`] };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(input)) {
    return { valid: false, errors: [`${fieldName} 형식이 올바르지 않습니다 (YYYY-MM-DD)`] };
  }

  // 실제 유효한 날짜인지 검증
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    return { valid: false, errors: [`${fieldName}이(가) 유효하지 않습니다`] };
  }

  return { valid: true, errors, sanitizedValue: input };
};

/**
 * 카테고리 검증 (화이트리스트)
 */
export const validateCategory = (input: unknown): ValidationResult => {
  if (typeof input !== 'string') {
    return { valid: false, errors: ['카테고리가 올바르지 않습니다'] };
  }

  if (!VALID_CATEGORIES.includes(input as Category)) {
    return { valid: false, errors: [`허용되지 않은 카테고리: ${input}`] };
  }

  return { valid: true, errors: [], sanitizedValue: input };
};

/**
 * 통화 검증 (화이트리스트)
 */
export const validateCurrency = (input: unknown): ValidationResult => {
  if (typeof input !== 'string') {
    return { valid: false, errors: ['통화 코드가 올바르지 않습니다'] };
  }

  if (!VALID_CURRENCIES.includes(input as Currency)) {
    return { valid: false, errors: [`허용되지 않은 통화: ${input}`] };
  }

  return { valid: true, errors: [], sanitizedValue: input };
};

/**
 * Schedule 입력 종합 검증
 */
export const validateScheduleInput = (input: {
  category?: unknown;
  emoji?: unknown;
  topText?: unknown;
  bottomText?: unknown;
  date?: unknown;
  url?: unknown;
}): ValidationResult => {
  const errors: string[] = [];
  const sanitized: Record<string, unknown> = {};

  // 카테고리 검증
  const categoryResult = validateCategory(input.category);
  if (!categoryResult.valid) errors.push(...categoryResult.errors);
  else sanitized.category = categoryResult.sanitizedValue;

  // 이모지 검증
  if (!input.emoji || typeof input.emoji !== 'string' || !input.emoji.trim()) {
    errors.push('이모지를 입력해주세요');
  } else {
    sanitized.emoji = sanitizeEmoji(input.emoji as string);
  }

  // 상단 텍스트 검증
  const topTextResult = validateString(input.topText, {
    fieldName: '상단 텍스트',
    required: true,
    maxLength: 8,
  });
  if (!topTextResult.valid) errors.push(...topTextResult.errors);
  else sanitized.topText = topTextResult.sanitizedValue;

  // 하단 텍스트 검증 (선택)
  if (input.bottomText) {
    const bottomResult = validateString(input.bottomText, {
      fieldName: '하단 텍스트',
      maxLength: 8,
    });
    if (!bottomResult.valid) errors.push(...bottomResult.errors);
    else sanitized.bottomText = bottomResult.sanitizedValue;
  }

  // 날짜 검증
  const dateResult = validateDate(input.date);
  if (!dateResult.valid) errors.push(...dateResult.errors);
  else sanitized.date = dateResult.sanitizedValue;

  // URL 검증 (선택)
  if (input.url && typeof input.url === 'string' && input.url.trim()) {
    const sanitizedUrl = sanitizeUrl(input.url);
    if (!sanitizedUrl && input.url.trim()) {
      errors.push('URL 형식이 올바르지 않습니다 (http:// 또는 https://만 허용)');
    } else {
      sanitized.url = sanitizedUrl;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedValue: sanitized,
  };
};

/**
 * ID 검증 (안전한 문자만 허용)
 */
export const validateId = (id: unknown): ValidationResult => {
  if (typeof id !== 'string' || !id.trim()) {
    return { valid: false, errors: ['ID가 유효하지 않습니다'] };
  }

  // 알파벳, 숫자, 하이픈, 언더스코어만 허용
  const safeIdRegex = /^[a-zA-Z0-9_-]+$/;
  if (!safeIdRegex.test(id)) {
    return { valid: false, errors: ['ID에 허용되지 않은 문자가 포함되어 있습니다'] };
  }

  if (id.length > 100) {
    return { valid: false, errors: ['ID가 너무 깁니다'] };
  }

  return { valid: true, errors: [], sanitizedValue: id };
};
