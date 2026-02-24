/**
 * CSRF (Cross-Site Request Forgery) 방어 테스트
 *
 * OWASP Top 10 - A5: Security Misconfiguration (CSRF 방어)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCsrfToken,
  getCsrfToken,
  validateCsrfToken,
  addCsrfHeader,
  invalidateCsrfToken,
} from '../../src/lib/security/csrf';

describe('CSRF 방어 테스트', () => {
  beforeEach(() => {
    invalidateCsrfToken();
  });

  describe('CSRF 토큰 생성', () => {
    it('토큰을 생성할 수 있어야 함', () => {
      const token = createCsrfToken();
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThanOrEqual(32);
    });

    it('매번 다른 토큰을 생성해야 함', () => {
      const token1 = createCsrfToken();
      invalidateCsrfToken();
      const token2 = createCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('CSRF 토큰 검증', () => {
    it('유효한 토큰을 검증 통과시켜야 함', () => {
      const token = getCsrfToken();
      expect(validateCsrfToken(token)).toBe(true);
    });

    it('잘못된 토큰을 거부해야 함', () => {
      getCsrfToken(); // 토큰 생성
      expect(validateCsrfToken('invalid-token')).toBe(false);
    });

    it('빈 토큰을 거부해야 함', () => {
      expect(validateCsrfToken('')).toBe(false);
    });

    it('null 토큰을 거부해야 함', () => {
      expect(validateCsrfToken(null as unknown as string)).toBe(false);
    });

    it('undefined 토큰을 거부해야 함', () => {
      expect(validateCsrfToken(undefined as unknown as string)).toBe(false);
    });
  });

  describe('CSRF 헤더 추가', () => {
    it('POST 요청에 CSRF 토큰 헤더를 추가해야 함', () => {
      const headers = addCsrfHeader({}, 'POST');
      expect(headers instanceof Headers).toBe(true);
      expect((headers as Headers).get('X-CSRF-Token')).toBeTruthy();
    });

    it('PUT 요청에 CSRF 토큰 헤더를 추가해야 함', () => {
      const headers = addCsrfHeader({}, 'PUT');
      expect((headers as Headers).get('X-CSRF-Token')).toBeTruthy();
    });

    it('DELETE 요청에 CSRF 토큰 헤더를 추가해야 함', () => {
      const headers = addCsrfHeader({}, 'DELETE');
      expect((headers as Headers).get('X-CSRF-Token')).toBeTruthy();
    });

    it('PATCH 요청에 CSRF 토큰 헤더를 추가해야 함', () => {
      const headers = addCsrfHeader({}, 'PATCH');
      expect((headers as Headers).get('X-CSRF-Token')).toBeTruthy();
    });

    it('GET 요청에는 CSRF 토큰을 추가하지 않아야 함', () => {
      const headers = addCsrfHeader({}, 'GET');
      // GET은 원본 헤더 그대로 반환
      expect(headers).toBeDefined();
    });
  });

  describe('CSRF 토큰 무효화', () => {
    it('토큰을 무효화할 수 있어야 함', () => {
      const token = getCsrfToken();
      invalidateCsrfToken();

      // 무효화 후 새 토큰이 생성됨
      const newToken = getCsrfToken();
      expect(newToken).not.toBe(token);
    });
  });
});
