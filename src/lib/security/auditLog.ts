/**
 * Audit Log 모듈
 *
 * - 로그인/로그아웃 기록
 * - 권한 변경 기록
 * - 주요 데이터 수정 기록 (CRUD)
 * - 보안 이벤트 기록 (XSS 시도, Rate Limit 초과 등)
 * - Production 환경에서 상세 에러 노출 방지
 */

// ── Audit 이벤트 타입 ──
export type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_PERMISSION_DENIED'
  | 'DATA_CREATE'
  | 'DATA_UPDATE'
  | 'DATA_DELETE'
  | 'DATA_REORDER'
  | 'SECURITY_XSS_DETECTED'
  | 'SECURITY_SQLI_DETECTED'
  | 'SECURITY_RATE_LIMIT_HIT'
  | 'SECURITY_CSRF_INVALID'
  | 'SECURITY_URL_BLOCKED'
  | 'SECURITY_INPUT_INVALID'
  | 'API_CALL'
  | 'API_ERROR'
  | 'SETTINGS_CHANGE';

// ── Audit 이벤트 심각도 ──
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

// ── Audit Log 엔트리 ──
export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: AuditAction;
  severity: AuditSeverity;
  userId: string;
  tenantId: string;
  resource?: string;
  resourceId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

// ── 설정 ──
const AUDIT_CONFIG = {
  /** 최대 로그 보관 수 */
  MAX_LOG_ENTRIES: 1000,
  /** 로그 보관 기간 (7일) */
  RETENTION_MS: 7 * 24 * 60 * 60 * 1000,
  /** 스토리지 키 */
  STORAGE_KEY: 'tripos.security.audit',
  /** Production 환경 여부 */
  IS_PRODUCTION: (import.meta as { env?: { MODE?: string } }).env?.MODE === 'production',
};

// ── 심각도 매핑 ──
const ACTION_SEVERITY: Record<AuditAction, AuditSeverity> = {
  AUTH_LOGIN: 'info',
  AUTH_LOGOUT: 'info',
  AUTH_SESSION_EXPIRED: 'warning',
  AUTH_PERMISSION_DENIED: 'warning',
  DATA_CREATE: 'info',
  DATA_UPDATE: 'info',
  DATA_DELETE: 'warning',
  DATA_REORDER: 'info',
  SECURITY_XSS_DETECTED: 'critical',
  SECURITY_SQLI_DETECTED: 'critical',
  SECURITY_RATE_LIMIT_HIT: 'warning',
  SECURITY_CSRF_INVALID: 'error',
  SECURITY_URL_BLOCKED: 'warning',
  SECURITY_INPUT_INVALID: 'warning',
  API_CALL: 'info',
  API_ERROR: 'error',
  SETTINGS_CHANGE: 'info',
};

// ── 인메모리 로그 버퍼 ──
let logBuffer: AuditLogEntry[] = [];

/**
 * 고유 ID 생성
 */
const generateLogId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `audit-${timestamp}-${random}`;
};

/**
 * Audit 로그 기록
 */
export const logAudit = (params: {
  action: AuditAction;
  userId?: string;
  tenantId?: string;
  resource?: string;
  resourceId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}): AuditLogEntry => {
  const entry: AuditLogEntry = {
    id: generateLogId(),
    timestamp: Date.now(),
    action: params.action,
    severity: ACTION_SEVERITY[params.action] || 'info',
    userId: params.userId || 'anonymous',
    tenantId: params.tenantId || 'default',
    resource: params.resource,
    resourceId: params.resourceId,
    // Production에서는 상세 정보 숨김
    details: AUDIT_CONFIG.IS_PRODUCTION
      ? sanitizeLogDetails(params.details)
      : params.details,
    metadata: AUDIT_CONFIG.IS_PRODUCTION
      ? undefined
      : params.metadata,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  // 버퍼에 추가
  logBuffer.push(entry);

  // 최대 보관 수 초과 시 오래된 것부터 제거
  if (logBuffer.length > AUDIT_CONFIG.MAX_LOG_ENTRIES) {
    logBuffer = logBuffer.slice(-AUDIT_CONFIG.MAX_LOG_ENTRIES);
  }

  // 스토리지에 비동기 저장
  persistLogs();

  // 보안 이벤트는 콘솔에도 출력 (dev 환경만)
  if (!AUDIT_CONFIG.IS_PRODUCTION) {
    const logLevel = entry.severity === 'critical' || entry.severity === 'error'
      ? 'error'
      : entry.severity === 'warning'
        ? 'warn'
        : 'info';
    console[logLevel](`[Audit] ${entry.action}`, entry);
  }

  return entry;
};

/**
 * Production 환경에서 로그 상세 정보를 안전하게 정제
 * (스택트레이스, 내부 경로 등 제거)
 */
const sanitizeLogDetails = (details?: string): string | undefined => {
  if (!details) return undefined;

  // 파일 경로 제거
  let sanitized = details.replace(/\/[\w/.-]+\.(ts|tsx|js|jsx)/g, '[path]');

  // 스택트레이스 제거
  sanitized = sanitized.replace(/at\s+[\w.]+\s+\(.*\)/g, '[stack]');

  // 환경변수 참조 제거
  sanitized = sanitized.replace(/process\.env\.\w+/g, '[env]');

  return sanitized;
};

/**
 * 로그를 localStorage에 저장
 */
const persistLogs = (): void => {
  try {
    // 만료된 로그 제거
    const cutoff = Date.now() - AUDIT_CONFIG.RETENTION_MS;
    const validLogs = logBuffer.filter((log) => log.timestamp > cutoff);

    localStorage.setItem(
      AUDIT_CONFIG.STORAGE_KEY,
      JSON.stringify(validLogs)
    );
  } catch {
    // 스토리지 용량 초과 시 오래된 로그 절반 삭제
    logBuffer = logBuffer.slice(Math.floor(logBuffer.length / 2));
    try {
      localStorage.setItem(
        AUDIT_CONFIG.STORAGE_KEY,
        JSON.stringify(logBuffer)
      );
    } catch {
      // 그래도 실패하면 포기
    }
  }
};

/**
 * 저장된 Audit 로그 로드
 */
export const loadAuditLogs = (): AuditLogEntry[] => {
  try {
    const stored = localStorage.getItem(AUDIT_CONFIG.STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AuditLogEntry[];
      logBuffer = parsed;
      return parsed;
    }
  } catch {
    // 무시
  }
  return [];
};

/**
 * Audit 로그 조회 (필터링)
 */
export const queryAuditLogs = (filters?: {
  action?: AuditAction;
  severity?: AuditSeverity;
  userId?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
}): AuditLogEntry[] => {
  let logs = logBuffer.length > 0 ? logBuffer : loadAuditLogs();

  if (filters) {
    if (filters.action) {
      logs = logs.filter((l) => l.action === filters.action);
    }
    if (filters.severity) {
      logs = logs.filter((l) => l.severity === filters.severity);
    }
    if (filters.userId) {
      logs = logs.filter((l) => l.userId === filters.userId);
    }
    if (filters.startTime) {
      logs = logs.filter((l) => l.timestamp >= filters.startTime!);
    }
    if (filters.endTime) {
      logs = logs.filter((l) => l.timestamp <= filters.endTime!);
    }
  }

  // 최신순 정렬
  logs.sort((a, b) => b.timestamp - a.timestamp);

  if (filters?.limit) {
    logs = logs.slice(0, filters.limit);
  }

  return logs;
};

/**
 * 보안 이벤트 통계
 */
export const getSecurityStats = (): {
  totalEvents: number;
  criticalCount: number;
  warningCount: number;
  last24hEvents: number;
} => {
  const logs = logBuffer.length > 0 ? logBuffer : loadAuditLogs();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  return {
    totalEvents: logs.length,
    criticalCount: logs.filter((l) => l.severity === 'critical').length,
    warningCount: logs.filter((l) => l.severity === 'warning').length,
    last24hEvents: logs.filter((l) => l.timestamp > dayAgo).length,
  };
};

/**
 * Audit 로그 초기화 (관리자 전용)
 */
export const clearAuditLogs = (): void => {
  logBuffer = [];
  try {
    localStorage.removeItem(AUDIT_CONFIG.STORAGE_KEY);
  } catch {
    // 무시
  }
};

/**
 * 에러를 안전하게 사용자에게 표시
 * Production에서는 상세 에러 숨김
 */
export const getSafeErrorMessage = (error: unknown): string => {
  if (AUDIT_CONFIG.IS_PRODUCTION) {
    return '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};
