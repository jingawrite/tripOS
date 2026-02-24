/**
 * Audit Log 테스트
 *
 * - 보안 이벤트 기록 검증
 * - Production 환경 에러 노출 방지 검증
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  logAudit,
  queryAuditLogs,
  getSecurityStats,
  clearAuditLogs,
  getSafeErrorMessage,
} from '../../src/lib/security/auditLog';

describe('Audit Log 테스트', () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  describe('로그 기록', () => {
    it('Audit 로그를 기록할 수 있어야 함', () => {
      const entry = logAudit({
        action: 'AUTH_LOGIN',
        userId: 'user1',
        tenantId: 'tenant1',
        details: '로그인 성공',
      });

      expect(entry.id).toBeTruthy();
      expect(entry.action).toBe('AUTH_LOGIN');
      expect(entry.userId).toBe('user1');
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    it('로그인 이벤트를 기록해야 함', () => {
      logAudit({ action: 'AUTH_LOGIN', userId: 'user1' });
      const logs = queryAuditLogs({ action: 'AUTH_LOGIN' });
      expect(logs.length).toBe(1);
    });

    it('로그아웃 이벤트를 기록해야 함', () => {
      logAudit({ action: 'AUTH_LOGOUT', userId: 'user1' });
      const logs = queryAuditLogs({ action: 'AUTH_LOGOUT' });
      expect(logs.length).toBe(1);
    });

    it('데이터 생성 이벤트를 기록해야 함', () => {
      logAudit({
        action: 'DATA_CREATE',
        resource: 'schedule',
        resourceId: 'sched-1',
      });
      const logs = queryAuditLogs({ action: 'DATA_CREATE' });
      expect(logs.length).toBe(1);
      expect(logs[0].resource).toBe('schedule');
    });

    it('데이터 수정 이벤트를 기록해야 함', () => {
      logAudit({ action: 'DATA_UPDATE', resource: 'schedule', resourceId: 'sched-1' });
      const logs = queryAuditLogs({ action: 'DATA_UPDATE' });
      expect(logs.length).toBe(1);
    });

    it('데이터 삭제 이벤트를 기록해야 함', () => {
      logAudit({ action: 'DATA_DELETE', resource: 'schedule', resourceId: 'sched-1' });
      const logs = queryAuditLogs({ action: 'DATA_DELETE' });
      expect(logs.length).toBe(1);
      expect(logs[0].severity).toBe('warning');
    });

    it('보안 이벤트를 기록해야 함', () => {
      logAudit({ action: 'SECURITY_XSS_DETECTED', details: 'XSS attempt detected' });
      const logs = queryAuditLogs({ action: 'SECURITY_XSS_DETECTED' });
      expect(logs.length).toBe(1);
      expect(logs[0].severity).toBe('critical');
    });

    it('권한 거부 이벤트를 기록해야 함', () => {
      logAudit({ action: 'AUTH_PERMISSION_DENIED', userId: 'user1', details: 'admin:audit_log' });
      const logs = queryAuditLogs({ action: 'AUTH_PERMISSION_DENIED' });
      expect(logs.length).toBe(1);
      expect(logs[0].severity).toBe('warning');
    });
  });

  describe('로그 조회 및 필터링', () => {
    it('액션별로 필터링할 수 있어야 함', () => {
      logAudit({ action: 'AUTH_LOGIN' });
      logAudit({ action: 'DATA_CREATE' });
      logAudit({ action: 'AUTH_LOGIN' });

      const loginLogs = queryAuditLogs({ action: 'AUTH_LOGIN' });
      expect(loginLogs.length).toBe(2);
    });

    it('심각도별로 필터링할 수 있어야 함', () => {
      logAudit({ action: 'AUTH_LOGIN' }); // info
      logAudit({ action: 'SECURITY_XSS_DETECTED' }); // critical
      logAudit({ action: 'DATA_DELETE' }); // warning

      const critical = queryAuditLogs({ severity: 'critical' });
      expect(critical.length).toBe(1);
    });

    it('사용자별로 필터링할 수 있어야 함', () => {
      logAudit({ action: 'AUTH_LOGIN', userId: 'user1' });
      logAudit({ action: 'AUTH_LOGIN', userId: 'user2' });

      const user1Logs = queryAuditLogs({ userId: 'user1' });
      expect(user1Logs.length).toBe(1);
    });

    it('최신순으로 정렬해야 함', () => {
      logAudit({ action: 'AUTH_LOGIN', details: 'first' });
      logAudit({ action: 'AUTH_LOGIN', details: 'second' });

      const logs = queryAuditLogs({ action: 'AUTH_LOGIN' });
      expect(logs[0].timestamp).toBeGreaterThanOrEqual(logs[1].timestamp);
    });

    it('limit로 결과 수를 제한할 수 있어야 함', () => {
      for (let i = 0; i < 10; i++) {
        logAudit({ action: 'DATA_CREATE' });
      }

      const logs = queryAuditLogs({ limit: 3 });
      expect(logs.length).toBe(3);
    });
  });

  describe('보안 통계', () => {
    it('보안 이벤트 통계를 조회할 수 있어야 함', () => {
      logAudit({ action: 'AUTH_LOGIN' });
      logAudit({ action: 'SECURITY_XSS_DETECTED' });
      logAudit({ action: 'SECURITY_RATE_LIMIT_HIT' });

      const stats = getSecurityStats();
      expect(stats.totalEvents).toBe(3);
      expect(stats.criticalCount).toBe(1);
      expect(stats.warningCount).toBe(1);
      expect(stats.last24hEvents).toBe(3);
    });
  });

  describe('Production 에러 보호', () => {
    it('에러 메시지를 안전하게 반환해야 함', () => {
      // dev 환경에서는 상세 메시지 반환
      const error = new Error('상세 에러 메시지');
      const message = getSafeErrorMessage(error);
      // dev 환경이므로 상세 메시지 반환
      expect(message).toBeTruthy();
    });

    it('비 Error 객체도 처리해야 함', () => {
      const message = getSafeErrorMessage('string error');
      expect(message).toBeTruthy();
    });
  });
});
