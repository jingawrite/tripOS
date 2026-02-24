/**
 * tripOS Security Module - 통합 보안 모듈
 *
 * 모든 보안 기능을 통합하여 단일 진입점으로 제공
 */

// XSS 방어
export {
  escapeHtml,
  stripHtmlTags,
  detectXss,
  sanitizeText,
  sanitizeUrl,
  sanitizeEmoji,
} from './xss';

// SSRF 방어 / URL 검증
export {
  validateUrl,
  validateApiUrl,
  validateUserUrl,
  openUrlSafely,
} from './urlValidator';
export type { UrlValidationResult } from './urlValidator';

// Input Validation
export {
  detectSqlInjection,
  validateString,
  validateDate,
  validateCategory,
  validateCurrency,
  validateScheduleInput,
  validateId,
} from './inputValidator';
export type { ValidationResult } from './inputValidator';

// Rate Limiter
export {
  checkRateLimit,
  resetRateLimit,
  resetAllRateLimits,
  getRateLimitStatus,
  RATE_LIMIT_PRESETS,
} from './rateLimiter';
export type { RateLimitResult } from './rateLimiter';

// Auth / AuthZ
export {
  createSession,
  validateSession,
  destroySession,
  getCurrentSession,
  hasPermission,
  checkPermission,
  requirePermission,
  registerAbacPolicy,
  evaluateAbacPolicy,
  validateTenantAccess,
  initializeDefaultSession,
  getPermissionsForRole,
  SecurityError,
} from './auth';
export type {
  Role,
  Permission,
  AbacContext,
  UserSession,
  JwtPayload,
} from './auth';

// CSRF 방어
export {
  createCsrfToken,
  getCsrfToken,
  validateCsrfToken,
  addCsrfHeader,
  secureFetch,
  invalidateCsrfToken,
} from './csrf';

// Audit Log
export {
  logAudit,
  loadAuditLogs,
  queryAuditLogs,
  getSecurityStats,
  clearAuditLogs,
  getSafeErrorMessage,
} from './auditLog';
export type {
  AuditAction,
  AuditSeverity,
  AuditLogEntry,
} from './auditLog';

// Security Headers 검증
export {
  checkSecurityHeaders,
  validateCsp,
  validateCorsConfig,
  validateCookieSecurity,
  validateVercelHeaders,
  REQUIRED_SECURITY_HEADERS,
} from './headers';

// ── 내부 import (initializeSecurity에서 사용) ──
import { getCsrfToken as _getCsrfToken } from './csrf';
import { initializeDefaultSession as _initializeDefaultSession } from './auth';
import { loadAuditLogs as _loadAuditLogs, logAudit as _logAudit } from './auditLog';

/**
 * 보안 모듈 초기화
 * 앱 시작 시 호출하여 기본 보안 설정을 적용
 */
export const initializeSecurity = (): void => {
  // 1. CSRF 토큰 초기화
  _getCsrfToken();

  // 2. 기본 세션 생성 (프론트엔드 전용)
  _initializeDefaultSession();

  // 3. Audit 로그 로드
  _loadAuditLogs();

  // 4. 보안 이벤트 리스너 등록
  if (typeof window !== 'undefined') {
    // CSP 위반 이벤트 감지
    window.addEventListener('securitypolicyviolation', (event) => {
      _logAudit({
        action: 'SECURITY_XSS_DETECTED',
        details: `CSP Violation: ${event.violatedDirective} - ${event.blockedURI}`,
      });
    });
  }
};
