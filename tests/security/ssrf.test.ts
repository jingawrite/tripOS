/**
 * SSRF (Server-Side Request Forgery) 방어 테스트
 *
 * OWASP Top 10 - A10: Server-Side Request Forgery (SSRF)
 */
import { describe, it, expect } from 'vitest';
import {
  validateUrl,
  validateApiUrl,
  validateUserUrl,
} from '../../src/lib/security/urlValidator';

describe('SSRF 방어 테스트', () => {
  describe('validateUrl - URL 안전성 검증', () => {
    it('정상 HTTPS URL을 허용해야 함', () => {
      const result = validateUrl('https://www.example.com');
      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBe('https://www.example.com/');
    });

    it('정상 HTTP URL을 허용해야 함', () => {
      const result = validateUrl('http://www.example.com');
      expect(result.valid).toBe(true);
    });

    it('localhost를 차단해야 함', () => {
      const result = validateUrl('http://localhost:3000');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('내부 호스트');
    });

    it('127.0.0.1을 차단해야 함', () => {
      const result = validateUrl('http://127.0.0.1');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('내부 IP');
    });

    it('10.x.x.x 내부 IP를 차단해야 함', () => {
      const result = validateUrl('http://10.0.0.1');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('내부 IP');
    });

    it('172.16.x.x 내부 IP를 차단해야 함', () => {
      const result = validateUrl('http://172.16.0.1');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('내부 IP');
    });

    it('192.168.x.x 내부 IP를 차단해야 함', () => {
      const result = validateUrl('http://192.168.1.1');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('내부 IP');
    });

    it('AWS 메타데이터 서버(169.254.169.254)를 차단해야 함', () => {
      const result = validateUrl('http://169.254.169.254/latest/meta-data/');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('내부 IP');
    });

    it('0.0.0.0을 차단해야 함', () => {
      const result = validateUrl('http://0.0.0.0');
      expect(result.valid).toBe(false);
    });

    it('GCP 메타데이터 서버를 차단해야 함', () => {
      const result = validateUrl('http://metadata.google.internal');
      expect(result.valid).toBe(false);
    });

    it('javascript: 프로토콜을 차단해야 함', () => {
      const result = validateUrl('javascript:alert(1)');
      expect(result.valid).toBe(false);
    });

    it('ftp: 프로토콜을 차단해야 함', () => {
      const result = validateUrl('ftp://files.example.com');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('프로토콜');
    });

    it('빈 URL을 거부해야 함', () => {
      const result = validateUrl('');
      expect(result.valid).toBe(false);
    });

    it('잘못된 URL을 거부해야 함', () => {
      const result = validateUrl('not-a-url');
      expect(result.valid).toBe(false);
    });

    it('HTTPS 필수 옵션이 작동해야 함', () => {
      const result = validateUrl('http://example.com', { requireHttps: true });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('HTTPS');
    });

    it('도메인 화이트리스트가 작동해야 함', () => {
      const allowed = validateUrl('https://api.example.com', {
        allowedDomains: ['api.example.com'],
      });
      expect(allowed.valid).toBe(true);

      const blocked = validateUrl('https://evil.com', {
        allowedDomains: ['api.example.com'],
      });
      expect(blocked.valid).toBe(false);
    });
  });

  describe('validateApiUrl - API URL 화이트리스트 검증', () => {
    it('허용된 API 도메인을 통과시켜야 함', () => {
      const result = validateApiUrl('https://api.frankfurter.app/latest?from=USD&to=KRW');
      expect(result.valid).toBe(true);
    });

    it('허용되지 않은 도메인을 차단해야 함', () => {
      const result = validateApiUrl('https://evil-api.com/steal-data');
      expect(result.valid).toBe(false);
    });

    it('HTTP(비암호화)를 차단해야 함', () => {
      const result = validateApiUrl('http://api.frankfurter.app/latest');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUserUrl - 사용자 입력 URL 검증', () => {
    it('빈 URL을 허용해야 함 (선택사항)', () => {
      const result = validateUserUrl('');
      expect(result.valid).toBe(true);
    });

    it('정상 URL을 허용해야 함', () => {
      const result = validateUserUrl('https://www.google.com');
      expect(result.valid).toBe(true);
    });

    it('내부 IP URL을 차단해야 함', () => {
      const result = validateUserUrl('http://192.168.1.1/admin');
      expect(result.valid).toBe(false);
    });
  });
});
