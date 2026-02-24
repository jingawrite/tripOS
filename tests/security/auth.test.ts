/**
 * Authentication / Authorization 테스트
 *
 * OWASP Top 10 - A1: Broken Access Control
 * OWASP Top 10 - A7: Identification and Authentication Failures
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  validateSession,
  destroySession,
  getCurrentSession,
  hasPermission,
  checkPermission,
  requirePermission,
  validateTenantAccess,
  initializeDefaultSession,
  getPermissionsForRole,
  SecurityError,
} from '../../src/lib/security/auth';
import type { Role, Permission } from '../../src/lib/security/auth';

describe('Authentication / Authorization 테스트', () => {
  beforeEach(() => {
    destroySession();
  });

  describe('세션 관리 (AuthN)', () => {
    it('세션을 생성할 수 있어야 함', () => {
      const session = createSession('user1', 'tenant1', 'user', 'user@test.com');
      expect(session.userId).toBe('user1');
      expect(session.tenantId).toBe('tenant1');
      expect(session.role).toBe('user');
      expect(session.email).toBe('user@test.com');
      expect(session.sessionId).toBeTruthy();
      expect(session.sessionId.length).toBeGreaterThanOrEqual(32);
    });

    it('로그인 시 세션을 재발급해야 함 (Session Fixation 방어)', () => {
      const session1 = createSession('user1', 'tenant1', 'user', 'user@test.com');
      const sessionId1 = session1.sessionId;

      const session2 = createSession('user1', 'tenant1', 'user', 'user@test.com');
      const sessionId2 = session2.sessionId;

      // 세션 ID가 달라야 함 (재발급됨)
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('세션을 검증할 수 있어야 함', () => {
      createSession('user1', 'tenant1', 'user', 'user@test.com');
      const session = validateSession();

      expect(session).not.toBeNull();
      expect(session!.userId).toBe('user1');
    });

    it('세션을 파기할 수 있어야 함 (로그아웃)', () => {
      createSession('user1', 'tenant1', 'user', 'user@test.com');
      destroySession();

      const session = getCurrentSession();
      expect(session).toBeNull();
    });

    it('세션이 없으면 null을 반환해야 함', () => {
      const session = validateSession();
      expect(session).toBeNull();
    });

    it('기본 세션을 생성할 수 있어야 함', () => {
      const session = initializeDefaultSession();
      expect(session.userId).toBe('default-user');
      expect(session.role).toBe('user');
    });

    it('기존 세션이 있으면 기본 세션 생성을 건너뛰어야 함', () => {
      createSession('existing', 'tenant1', 'admin', 'admin@test.com');
      const session = initializeDefaultSession();
      expect(session.userId).toBe('existing');
      expect(session.role).toBe('admin');
    });
  });

  describe('RBAC (역할 기반 접근 제어)', () => {
    it('Admin 역할은 모든 권한을 가져야 함', () => {
      const permissions = getPermissionsForRole('admin');
      expect(permissions).toContain('schedule:create');
      expect(permissions).toContain('schedule:read');
      expect(permissions).toContain('schedule:update');
      expect(permissions).toContain('schedule:delete');
      expect(permissions).toContain('admin:audit_log');
      expect(permissions).toContain('admin:user_manage');
    });

    it('User 역할은 기본 CRUD 권한만 가져야 함', () => {
      const permissions = getPermissionsForRole('user');
      expect(permissions).toContain('schedule:create');
      expect(permissions).toContain('schedule:read');
      expect(permissions).toContain('schedule:update');
      expect(permissions).toContain('schedule:delete');
      expect(permissions).not.toContain('admin:audit_log');
      expect(permissions).not.toContain('admin:user_manage');
    });

    it('Viewer 역할은 읽기 권한만 가져야 함', () => {
      const permissions = getPermissionsForRole('viewer');
      expect(permissions).toContain('schedule:read');
      expect(permissions).toContain('exchange:read');
      expect(permissions).not.toContain('schedule:create');
      expect(permissions).not.toContain('schedule:delete');
      expect(permissions).not.toContain('admin:audit_log');
    });

    it('hasPermission이 역할에 따라 올바르게 동작해야 함', () => {
      expect(hasPermission('admin', 'admin:audit_log')).toBe(true);
      expect(hasPermission('user', 'admin:audit_log')).toBe(false);
      expect(hasPermission('viewer', 'schedule:create')).toBe(false);
    });

    it('최소 권한 원칙 - Viewer는 쓰기 권한이 없어야 함', () => {
      const writePermissions: Permission[] = [
        'schedule:create',
        'schedule:update',
        'schedule:delete',
        'schedule:reorder',
        'settings:update',
        'admin:audit_log',
        'admin:user_manage',
      ];

      for (const perm of writePermissions) {
        expect(hasPermission('viewer', perm)).toBe(false);
      }
    });
  });

  describe('세션 기반 권한 검사', () => {
    it('로그인된 사용자의 권한을 검사해야 함', () => {
      createSession('user1', 'tenant1', 'user', 'user@test.com');
      expect(checkPermission('schedule:create')).toBe(true);
      expect(checkPermission('admin:audit_log')).toBe(false);
    });

    it('로그인되지 않은 상태에서 권한 검사를 실패시켜야 함', () => {
      expect(checkPermission('schedule:read')).toBe(false);
    });

    it('requirePermission이 권한 없을 때 SecurityError를 던져야 함', () => {
      createSession('user1', 'tenant1', 'viewer', 'viewer@test.com');

      expect(() => requirePermission('schedule:create')).toThrow(SecurityError);
      expect(() => requirePermission('schedule:create')).toThrow('권한이 없습니다');
    });

    it('requirePermission이 권한 있을 때 통과해야 함', () => {
      createSession('user1', 'tenant1', 'admin', 'admin@test.com');

      expect(() => requirePermission('admin:audit_log')).not.toThrow();
    });
  });

  describe('인증 우회 방어 테스트', () => {
    it('세션 없이 보호된 작업에 접근할 수 없어야 함', () => {
      // 세션 없음
      expect(checkPermission('schedule:create')).toBe(false);
      expect(checkPermission('schedule:delete')).toBe(false);
      expect(checkPermission('admin:audit_log')).toBe(false);
    });

    it('낮은 역할로 높은 권한에 접근할 수 없어야 함', () => {
      createSession('user1', 'tenant1', 'viewer', 'viewer@test.com');

      expect(checkPermission('schedule:create')).toBe(false);
      expect(checkPermission('schedule:delete')).toBe(false);
      expect(checkPermission('admin:user_manage')).toBe(false);
    });

    it('잘못된 역할은 빈 권한을 반환해야 함', () => {
      const permissions = getPermissionsForRole('hacker' as Role);
      expect(permissions).toEqual(undefined);
    });
  });

  describe('멀티테넌트 격리', () => {
    it('같은 테넌트의 리소스에 접근할 수 있어야 함', () => {
      createSession('user1', 'tenant-A', 'user', 'user@test.com');
      expect(validateTenantAccess('tenant-A')).toBe(true);
    });

    it('다른 테넌트의 리소스에 접근할 수 없어야 함', () => {
      createSession('user1', 'tenant-A', 'user', 'user@test.com');
      expect(validateTenantAccess('tenant-B')).toBe(false);
    });

    it('Admin은 모든 테넌트에 접근할 수 있어야 함', () => {
      createSession('admin1', 'tenant-A', 'admin', 'admin@test.com');
      expect(validateTenantAccess('tenant-B')).toBe(true);
    });
  });
});
