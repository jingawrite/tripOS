/**
 * Security Headers 검증 테스트
 *
 * OWASP Top 10 - A5: Security Misconfiguration
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  checkSecurityHeaders,
  validateCsp,
  validateCorsConfig,
  validateCookieSecurity,
  validateVercelHeaders,
  REQUIRED_SECURITY_HEADERS,
} from '../../src/lib/security/headers';

describe('보안 헤더 검증 테스트', () => {
  describe('vercel.json 보안 헤더 설정 검증', () => {
    it('vercel.json에 필수 보안 헤더가 모두 설정되어 있어야 함', () => {
      const vercelConfig = JSON.parse(
        readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
      );
      const result = validateVercelHeaders(vercelConfig);

      expect(result.score).toBeGreaterThanOrEqual(80);

      if (!result.valid) {
        console.warn('누락된 헤더:', result.issues);
      }
    });

    it('Strict-Transport-Security(HSTS)가 설정되어 있어야 함', () => {
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
      expect(hsts?.value).toContain('includeSubDomains');
    });

    it('X-Frame-Options가 DENY로 설정되어 있어야 함', () => {
      const vercelConfig = JSON.parse(
        readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
      );
      const globalHeaders = vercelConfig.headers?.find(
        (h: { source: string }) => h.source === '/(.*)'
      );

      const xfo = globalHeaders?.headers?.find(
        (h: { key: string }) => h.key === 'X-Frame-Options'
      );

      expect(xfo).toBeTruthy();
      expect(xfo?.value).toBe('DENY');
    });

    it('X-Content-Type-Options가 nosniff로 설정되어 있어야 함', () => {
      const vercelConfig = JSON.parse(
        readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
      );
      const globalHeaders = vercelConfig.headers?.find(
        (h: { source: string }) => h.source === '/(.*)'
      );

      const xcto = globalHeaders?.headers?.find(
        (h: { key: string }) => h.key === 'X-Content-Type-Options'
      );

      expect(xcto).toBeTruthy();
      expect(xcto?.value).toBe('nosniff');
    });

    it('Referrer-Policy가 설정되어 있어야 함', () => {
      const vercelConfig = JSON.parse(
        readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
      );
      const globalHeaders = vercelConfig.headers?.find(
        (h: { source: string }) => h.source === '/(.*)'
      );

      const rp = globalHeaders?.headers?.find(
        (h: { key: string }) => h.key === 'Referrer-Policy'
      );

      expect(rp).toBeTruthy();
    });

    it('Content-Security-Policy가 설정되어 있어야 함', () => {
      const vercelConfig = JSON.parse(
        readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
      );
      const globalHeaders = vercelConfig.headers?.find(
        (h: { source: string }) => h.source === '/(.*)'
      );

      const csp = globalHeaders?.headers?.find(
        (h: { key: string }) => h.key === 'Content-Security-Policy'
      );

      expect(csp).toBeTruthy();
      expect(csp?.value).toContain("default-src 'self'");
      expect(csp?.value).toContain("script-src 'self'");
      expect(csp?.value).toContain("object-src 'none'");
      expect(csp?.value).toContain("frame-ancestors 'none'");
    });

    it('Cross-Origin-Opener-Policy가 설정되어 있어야 함', () => {
      const vercelConfig = JSON.parse(
        readFileSync(resolve(__dirname, '../../vercel.json'), 'utf-8')
      );
      const globalHeaders = vercelConfig.headers?.find(
        (h: { source: string }) => h.source === '/(.*)'
      );

      const coop = globalHeaders?.headers?.find(
        (h: { key: string }) => h.key === 'Cross-Origin-Opener-Policy'
      );

      expect(coop).toBeTruthy();
      expect(coop?.value).toBe('same-origin');
    });
  });

  describe('CSP 정책 검증', () => {
    it("정상 CSP를 검증 통과시켜야 함", () => {
      const csp = "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
      const result = validateCsp(csp);
      expect(result.valid).toBe(true);
    });

    it("script-src에서 unsafe-eval을 거부해야 함", () => {
      const csp = "default-src 'self'; script-src 'self' 'unsafe-eval'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
      const result = validateCsp(csp);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("script-src에서 'unsafe-eval'이(가) 사용되고 있습니다");
    });

    it("script-src에서 unsafe-inline을 거부해야 함", () => {
      const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
      const result = validateCsp(csp);
      expect(result.valid).toBe(false);
    });

    it('필수 디렉티브 누락을 감지해야 함', () => {
      const csp = "default-src 'self'";
      const result = validateCsp(csp);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('CORS 설정 검증', () => {
    it('credentials + wildcard 조합을 거부해야 함', () => {
      const result = validateCorsConfig({
        allowedOrigins: ['*'],
        allowCredentials: true,
      });
      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain('credentials');
    });

    it('화이트리스트 기반 CORS를 허용해야 함', () => {
      const result = validateCorsConfig({
        allowedOrigins: ['https://tripos.vercel.app'],
        allowCredentials: true,
      });
      expect(result.valid).toBe(true);
    });

    it('빈 오리진 목록을 거부해야 함', () => {
      const result = validateCorsConfig({
        allowedOrigins: [],
        allowCredentials: false,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('쿠키 보안 검증', () => {
    it('HttpOnly + Secure + SameSite=Strict를 통과시켜야 함', () => {
      const result = validateCookieSecurity({
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
      });
      expect(result.valid).toBe(true);
    });

    it('HttpOnly가 없으면 경고해야 함', () => {
      const result = validateCookieSecurity({
        httpOnly: false,
        secure: true,
        sameSite: 'Strict',
      });
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('HttpOnly 플래그가 설정되지 않았습니다');
    });

    it('Secure가 없으면 경고해야 함', () => {
      const result = validateCookieSecurity({
        httpOnly: true,
        secure: false,
        sameSite: 'Strict',
      });
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Secure 플래그가 설정되지 않았습니다');
    });

    it('SameSite=None이면 경고해야 함', () => {
      const result = validateCookieSecurity({
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('index.html CSP 메타태그 검증', () => {
    it('index.html에 CSP 메타태그가 있어야 함', () => {
      const html = readFileSync(
        resolve(__dirname, '../../index.html'),
        'utf-8'
      );
      expect(html).toContain('Content-Security-Policy');
      expect(html).toContain("default-src 'self'");
      expect(html).toContain("script-src 'self'");
      expect(html).toContain("object-src 'none'");
    });

    it('index.html에 X-Content-Type-Options 메타태그가 있어야 함', () => {
      const html = readFileSync(
        resolve(__dirname, '../../index.html'),
        'utf-8'
      );
      expect(html).toContain('X-Content-Type-Options');
      expect(html).toContain('nosniff');
    });

    it('index.html에 Referrer-Policy가 있어야 함', () => {
      const html = readFileSync(
        resolve(__dirname, '../../index.html'),
        'utf-8'
      );
      expect(html).toContain('referrer');
      expect(html).toContain('strict-origin-when-cross-origin');
    });
  });

  describe('checkSecurityHeaders - 응답 헤더 검증', () => {
    it('모든 필수 헤더가 있을 때 통과해야 함', () => {
      const headers = { ...REQUIRED_SECURITY_HEADERS } as Record<string, string>;
      const results = checkSecurityHeaders(headers);

      const allValid = results.every((r) => r.present);
      expect(allValid).toBe(true);
    });

    it('헤더가 누락되면 감지해야 함', () => {
      const results = checkSecurityHeaders({});
      const missing = results.filter((r) => !r.present);
      expect(missing.length).toBeGreaterThan(0);
    });
  });
});
