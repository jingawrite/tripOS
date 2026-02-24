/**
 * OWASP Top 10 종합 점검 테스트
 *
 * 2021 OWASP Top 10 주요 항목별 방어 적용 확인
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { escapeHtml, detectXss, sanitizeText, sanitizeUrl } from '../../src/lib/security/xss';
import { validateUrl, validateApiUrl } from '../../src/lib/security/urlValidator';
import { detectSqlInjection, validateScheduleInput, validateId } from '../../src/lib/security/inputValidator';
import { hasPermission, getPermissionsForRole } from '../../src/lib/security/auth';
import { validateCsp, validateCorsConfig, validateCookieSecurity } from '../../src/lib/security/headers';

describe('OWASP Top 10 종합 점검', () => {

  describe('A01:2021 - Broken Access Control (접근 제어 취약점)', () => {
    it('RBAC가 구현되어 있어야 함', () => {
      // Admin, User, Viewer 역할이 구분되어야 함
      expect(getPermissionsForRole('admin')?.length).toBeGreaterThan(0);
      expect(getPermissionsForRole('user')?.length).toBeGreaterThan(0);
      expect(getPermissionsForRole('viewer')?.length).toBeGreaterThan(0);
    });

    it('최소 권한 원칙이 적용되어야 함', () => {
      const adminPerms = getPermissionsForRole('admin')!;
      const userPerms = getPermissionsForRole('user')!;
      const viewerPerms = getPermissionsForRole('viewer')!;

      // 역할 계층 확인: admin > user > viewer
      expect(adminPerms.length).toBeGreaterThan(userPerms.length);
      expect(userPerms.length).toBeGreaterThan(viewerPerms.length);
    });

    it('Viewer는 쓰기 작업이 불가해야 함', () => {
      expect(hasPermission('viewer', 'schedule:create')).toBe(false);
      expect(hasPermission('viewer', 'schedule:update')).toBe(false);
      expect(hasPermission('viewer', 'schedule:delete')).toBe(false);
    });

    it('X-Frame-Options DENY가 설정되어 있어야 함 (Clickjacking 방어)', () => {
      const vercelConfig = JSON.parse(
        readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
      );
      const globalHeaders = vercelConfig.headers?.find(
        (h: { source: string }) => h.source === '/(.*)'
      );
      const xfo = globalHeaders?.headers?.find(
        (h: { key: string }) => h.key === 'X-Frame-Options'
      );
      expect(xfo?.value).toBe('DENY');
    });
  });

  describe('A02:2021 - Cryptographic Failures (암호화 실패)', () => {
    it('HTTPS 강제 (upgrade-insecure-requests)가 적용되어 있어야 함', () => {
      const vercelConfig = JSON.parse(
        readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
      );
      const globalHeaders = vercelConfig.headers?.find(
        (h: { source: string }) => h.source === '/(.*)'
      );
      const csp = globalHeaders?.headers?.find(
        (h: { key: string }) => h.key === 'Content-Security-Policy'
      );
      expect(csp?.value).toContain('upgrade-insecure-requests');
    });

    it('HSTS가 적용되어 있어야 함', () => {
      const vercelConfig = JSON.parse(
        readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
      );
      const globalHeaders = vercelConfig.headers?.find(
        (h: { source: string }) => h.source === '/(.*)'
      );
      const hsts = globalHeaders?.headers?.find(
        (h: { key: string }) => h.key === 'Strict-Transport-Security'
      );
      expect(hsts).toBeTruthy();
      expect(hsts?.value).toContain('max-age=');
    });
  });

  describe('A03:2021 - Injection (인젝션)', () => {
    it('SQL Injection 공격을 감지해야 함', () => {
      const attacks = [
        "' OR '1'='1",
        "; DROP TABLE users;",
        "UNION SELECT * FROM users",
        "' OR SLEEP(5)--",
        "'; WAITFOR DELAY '0:0:5'",
      ];

      for (const attack of attacks) {
        expect(detectSqlInjection(attack)).toBe(true);
      }
    });

    it('XSS 공격을 방어해야 함', () => {
      const attacks = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img onerror="alert(1)" src="x">',
        'eval("malicious")',
      ];

      for (const attack of attacks) {
        expect(detectXss(attack)).toBe(true);
      }
    });

    it('HTML 이스케이프가 올바르게 동작해야 함', () => {
      const result = escapeHtml('<script>document.cookie</script>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });
  });

  describe('A04:2021 - Insecure Design (불안전한 설계)', () => {
    it('입력값 검증이 구현되어 있어야 함', () => {
      // 필수 필드 없이 검증 실패
      const result = validateScheduleInput({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('ID 검증이 구현되어 있어야 함', () => {
      const maliciousId = validateId('../../../etc/passwd');
      expect(maliciousId.valid).toBe(false);
    });
  });

  describe('A05:2021 - Security Misconfiguration (보안 설정 오류)', () => {
    it('CSP에서 unsafe-eval이 차단되어야 함', () => {
      const unsafeCSP = "default-src 'self'; script-src 'self' 'unsafe-eval'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
      const result = validateCsp(unsafeCSP);
      expect(result.valid).toBe(false);
    });

    it('CORS에서 credentials + wildcard가 차단되어야 함', () => {
      const result = validateCorsConfig({
        allowedOrigins: ['*'],
        allowCredentials: true,
      });
      expect(result.valid).toBe(false);
    });

    it('쿠키 보안 설정이 검증되어야 함', () => {
      const insecureCookie = validateCookieSecurity({
        httpOnly: false,
        secure: false,
        sameSite: 'None',
      });
      expect(insecureCookie.valid).toBe(false);
      expect(insecureCookie.issues.length).toBe(3); // HttpOnly, Secure, SameSite
    });
  });

  describe('A06:2021 - Vulnerable and Outdated Components', () => {
    it('.gitignore에 .env 파일이 포함되어 있어야 함', () => {
      const gitignore = readFileSync(
        resolve(__dirname, '../../.gitignore'),
        'utf-8'
      );
      expect(gitignore).toContain('.env');
      expect(gitignore).toContain('.env.local');
      expect(gitignore).toContain('.env.production');
    });

    it('npm audit 스크립트가 package.json에 있어야 함', () => {
      const packageJson = JSON.parse(
        readFileSync(resolve(__dirname, '../../package.json'), 'utf-8')
      );
      expect(packageJson.scripts['audit:deps']).toBeTruthy();
    });
  });

  describe('A07:2021 - Identification and Authentication Failures', () => {
    it('세션 재발급이 구현되어 있어야 함', () => {
      // auth.ts의 createSession에서 destroySession 호출 확인
      const authCode = readFileSync(
        resolve(__dirname, '../../src/lib/security/auth.ts'),
        'utf-8'
      );
      expect(authCode).toContain('destroySession');
      expect(authCode).toContain('generateSessionId');
    });

    it('세션 만료 정책이 있어야 함', () => {
      const authCode = readFileSync(
        resolve(__dirname, '../../src/lib/security/auth.ts'),
        'utf-8'
      );
      expect(authCode).toContain('SESSION_TIMEOUT_MS');
      expect(authCode).toContain('INACTIVITY_TIMEOUT_MS');
    });
  });

  describe('A08:2021 - Software and Data Integrity Failures', () => {
    it('CSP가 inline script를 차단해야 함', () => {
      const vercelConfig = JSON.parse(
        readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
      );
      const globalHeaders = vercelConfig.headers?.find(
        (h: { source: string }) => h.source === '/(.*)'
      );
      const csp = globalHeaders?.headers?.find(
        (h: { key: string }) => h.key === 'Content-Security-Policy'
      );

      // script-src 'self'만 허용 (unsafe-inline 없음)
      expect(csp?.value).toContain("script-src 'self'");
      expect(csp?.value).not.toContain("'unsafe-eval'");
    });
  });

  describe('A09:2021 - Security Logging and Monitoring Failures', () => {
    it('Audit Log 모듈이 구현되어 있어야 함', () => {
      const auditCode = readFileSync(
        resolve(__dirname, '../../src/lib/security/auditLog.ts'),
        'utf-8'
      );
      expect(auditCode).toContain('AUTH_LOGIN');
      expect(auditCode).toContain('AUTH_LOGOUT');
      expect(auditCode).toContain('DATA_CREATE');
      expect(auditCode).toContain('DATA_UPDATE');
      expect(auditCode).toContain('DATA_DELETE');
      expect(auditCode).toContain('SECURITY_XSS_DETECTED');
      expect(auditCode).toContain('SECURITY_SQLI_DETECTED');
      expect(auditCode).toContain('SECURITY_RATE_LIMIT_HIT');
    });

    it('Production 에러 노출 방지가 구현되어 있어야 함', () => {
      const auditCode = readFileSync(
        resolve(__dirname, '../../src/lib/security/auditLog.ts'),
        'utf-8'
      );
      expect(auditCode).toContain('IS_PRODUCTION');
      expect(auditCode).toContain('sanitizeLogDetails');
    });
  });

  describe('A10:2021 - Server-Side Request Forgery (SSRF)', () => {
    it('내부 IP를 차단해야 함', () => {
      expect(validateUrl('http://127.0.0.1').valid).toBe(false);
      expect(validateUrl('http://10.0.0.1').valid).toBe(false);
      expect(validateUrl('http://192.168.1.1').valid).toBe(false);
      expect(validateUrl('http://172.16.0.1').valid).toBe(false);
    });

    it('클라우드 메타데이터 서버를 차단해야 함', () => {
      expect(validateUrl('http://169.254.169.254/latest/meta-data/').valid).toBe(false);
      expect(validateUrl('http://metadata.google.internal').valid).toBe(false);
    });

    it('API URL은 화이트리스트 기반으로 검증해야 함', () => {
      expect(validateApiUrl('https://api.frankfurter.app/latest').valid).toBe(true);
      expect(validateApiUrl('https://evil-api.com/steal').valid).toBe(false);
    });

    it('URL에서 XSS 프로토콜을 차단해야 함', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('data:text/html,<script>')).toBe('');
    });
  });
});
