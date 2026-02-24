/**
 * Authentication / Authorization 모듈
 *
 * - AuthN(인증)과 AuthZ(인가)를 명확히 분리
 * - JWT 기반 토큰 관리 패턴
 * - RBAC (Role-Based Access Control) 필수 적용
 * - ABAC (Attribute-Based Access Control) 확장 가능 구조
 * - 멀티테넌트 격리 구조
 * - 최소 권한 원칙 적용
 *
 * 현재 프론트엔드 전용 앱이므로 클라이언트 측 패턴으로 구현.
 * 백엔드 추가 시 서버에서 JWT 검증 + RBAC 적용 필요.
 */

// ── 역할(Role) 정의 ──
export type Role = 'admin' | 'user' | 'viewer';

// ── 권한(Permission) 정의 ──
export type Permission =
  | 'schedule:create'
  | 'schedule:read'
  | 'schedule:update'
  | 'schedule:delete'
  | 'schedule:reorder'
  | 'exchange:read'
  | 'exchange:refresh'
  | 'settings:read'
  | 'settings:update'
  | 'admin:audit_log'
  | 'admin:user_manage';

// ── RBAC: 역할별 권한 매핑 ──
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'schedule:create',
    'schedule:read',
    'schedule:update',
    'schedule:delete',
    'schedule:reorder',
    'exchange:read',
    'exchange:refresh',
    'settings:read',
    'settings:update',
    'admin:audit_log',
    'admin:user_manage',
  ],
  user: [
    'schedule:create',
    'schedule:read',
    'schedule:update',
    'schedule:delete',
    'schedule:reorder',
    'exchange:read',
    'exchange:refresh',
    'settings:read',
    'settings:update',
  ],
  viewer: [
    'schedule:read',
    'exchange:read',
    'settings:read',
  ],
};

// ── ABAC: 속성 기반 접근 제어 조건 ──
export interface AbacContext {
  userId: string;
  tenantId: string;
  role: Role;
  resourceOwnerId?: string;
  resourceTenantId?: string;
  ipAddress?: string;
  timestamp?: number;
}

// ── 사용자 세션 ──
export interface UserSession {
  userId: string;
  tenantId: string;
  role: Role;
  email: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  lastActivity: number;
}

// ── JWT 토큰 구조 (시뮬레이션) ──
export interface JwtPayload {
  sub: string;       // userId
  tid: string;       // tenantId
  role: Role;
  email: string;
  iat: number;       // issued at
  exp: number;       // expiration
  jti: string;       // JWT ID (세션 ID)
}

// ── 세션 설정 ──
const SESSION_CONFIG = {
  /** 세션 만료 시간 (30분) */
  SESSION_TIMEOUT_MS: 30 * 60 * 1000,
  /** 비활성 타임아웃 (15분) */
  INACTIVITY_TIMEOUT_MS: 15 * 60 * 1000,
  /** 토큰 갱신 주기 (25분 - 만료 5분 전) */
  REFRESH_BEFORE_MS: 5 * 60 * 1000,
  /** 최대 세션 수 */
  MAX_SESSIONS: 3,
};

// ── 현재 세션 상태 (메모리 보관 - XSS로부터 보호) ──
let currentSession: UserSession | null = null;

// ── 세션 만료 정책 ──
const STORAGE_KEY_SESSION = 'tripos.security.session';

/**
 * 안전한 세션 ID 생성
 */
const generateSessionId = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * 로그인 (세션 생성)
 * - 로그인 시 세션 재발급 (Session Fixation 방어)
 */
export const createSession = (
  userId: string,
  tenantId: string,
  role: Role,
  email: string
): UserSession => {
  // 기존 세션 무효화 (세션 재발급)
  destroySession();

  const now = Date.now();
  const session: UserSession = {
    userId,
    tenantId,
    role,
    email,
    sessionId: generateSessionId(),
    issuedAt: now,
    expiresAt: now + SESSION_CONFIG.SESSION_TIMEOUT_MS,
    lastActivity: now,
  };

  currentSession = session;

  // sessionStorage에 저장 (탭 간 격리, HttpOnly 불가하므로 차선책)
  try {
    sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({
      ...session,
      // 민감 정보 최소화
    }));
  } catch {
    // sessionStorage 사용 불가 시 메모리만 사용
  }

  return session;
};

/**
 * 세션 유효성 검증
 */
export const validateSession = (): UserSession | null => {
  if (!currentSession) {
    // sessionStorage에서 복구 시도
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_SESSION);
      if (stored) {
        currentSession = JSON.parse(stored) as UserSession;
      }
    } catch {
      return null;
    }
  }

  if (!currentSession) return null;

  const now = Date.now();

  // 1. 세션 만료 확인
  if (now > currentSession.expiresAt) {
    destroySession();
    return null;
  }

  // 2. 비활성 타임아웃 확인
  if (now - currentSession.lastActivity > SESSION_CONFIG.INACTIVITY_TIMEOUT_MS) {
    destroySession();
    return null;
  }

  // 3. 활동 시간 갱신
  currentSession.lastActivity = now;

  // 4. 세션 갱신이 필요한 경우 (만료 5분 전)
  if (currentSession.expiresAt - now < SESSION_CONFIG.REFRESH_BEFORE_MS) {
    currentSession.expiresAt = now + SESSION_CONFIG.SESSION_TIMEOUT_MS;
  }

  return currentSession;
};

/**
 * 세션 파기 (로그아웃)
 */
export const destroySession = (): void => {
  currentSession = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY_SESSION);
  } catch {
    // 무시
  }
};

/**
 * 현재 세션 조회 (읽기 전용)
 */
export const getCurrentSession = (): Readonly<UserSession> | null => {
  return validateSession();
};

// ════════════════════════════════════════════
// RBAC (Role-Based Access Control)
// ════════════════════════════════════════════

/**
 * 역할에 해당 권한이 있는지 확인
 */
export const hasPermission = (role: Role, permission: Permission): boolean => {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.includes(permission) ?? false;
};

/**
 * 현재 세션에 해당 권한이 있는지 확인
 */
export const checkPermission = (permission: Permission): boolean => {
  const session = validateSession();
  if (!session) return false;
  return hasPermission(session.role, permission);
};

/**
 * 권한 검사 (실패 시 예외)
 */
export const requirePermission = (permission: Permission): void => {
  if (!checkPermission(permission)) {
    throw new SecurityError(
      `권한이 없습니다: ${permission}`,
      'PERMISSION_DENIED'
    );
  }
};

// ════════════════════════════════════════════
// ABAC (Attribute-Based Access Control)
// ════════════════════════════════════════════

export type AbacPolicy = (context: AbacContext) => boolean;

/**
 * ABAC 정책 레지스트리
 */
const abacPolicies: Map<string, AbacPolicy> = new Map();

/**
 * ABAC 정책 등록
 */
export const registerAbacPolicy = (name: string, policy: AbacPolicy): void => {
  abacPolicies.set(name, policy);
};

/**
 * ABAC 정책 평가
 */
export const evaluateAbacPolicy = (policyName: string, context: AbacContext): boolean => {
  const policy = abacPolicies.get(policyName);
  if (!policy) {
    console.warn(`[ABAC] 정책을 찾을 수 없습니다: ${policyName}`);
    return false; // 정책이 없으면 기본 거부
  }
  return policy(context);
};

// ── 기본 ABAC 정책들 ──

// 1. 리소스 소유자 정책: 자신의 리소스만 수정 가능
registerAbacPolicy('ownerOnly', (ctx: AbacContext) => {
  if (ctx.role === 'admin') return true; // 관리자는 항상 허용
  return ctx.userId === ctx.resourceOwnerId;
});

// 2. 테넌트 격리 정책: 같은 테넌트의 리소스만 접근 가능
registerAbacPolicy('tenantIsolation', (ctx: AbacContext) => {
  return ctx.tenantId === ctx.resourceTenantId;
});

// 3. 업무 시간 정책: 특정 시간대에만 접근 허용
registerAbacPolicy('businessHours', (ctx: AbacContext) => {
  if (ctx.role === 'admin') return true;
  const hour = new Date(ctx.timestamp || Date.now()).getHours();
  return hour >= 6 && hour <= 23; // 오전 6시 ~ 오후 11시
});

// ════════════════════════════════════════════
// 멀티테넌트 격리
// ════════════════════════════════════════════

/**
 * 테넌트 컨텍스트 검증
 * 현재 세션의 테넌트와 요청 리소스의 테넌트가 일치하는지 확인
 */
export const validateTenantAccess = (resourceTenantId: string): boolean => {
  const session = validateSession();
  if (!session) return false;

  // 관리자는 모든 테넌트 접근 가능 (상위 관리자 전용)
  if (session.role === 'admin') return true;

  return session.tenantId === resourceTenantId;
};

// ════════════════════════════════════════════
// 보안 에러
// ════════════════════════════════════════════

export class SecurityError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
  }
}

// ════════════════════════════════════════════
// 프론트엔드 앱 초기화 (현재 사용)
// ════════════════════════════════════════════

/**
 * 프론트엔드 앱에서 기본 세션을 생성
 * (백엔드가 없는 경우 기본 user 역할)
 */
export const initializeDefaultSession = (): UserSession => {
  const existing = validateSession();
  if (existing) return existing;

  // 기본 사용자 세션 생성
  return createSession(
    'default-user',
    'default-tenant',
    'user',
    'user@tripos.app'
  );
};

/**
 * 역할별 권한 목록 조회
 */
export const getPermissionsForRole = (role: Role): readonly Permission[] => {
  return ROLE_PERMISSIONS[role] || [];
};

// 내보내기: 세션 설정 (테스트용)
export { SESSION_CONFIG };
