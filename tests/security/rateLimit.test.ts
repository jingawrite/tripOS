/**
 * Rate Limiter 테스트
 *
 * - API 호출 제한 검증
 * - Brute Force 방어 검증
 * - Exponential Backoff 동작 검증
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  resetRateLimit,
  resetAllRateLimits,
  getRateLimitStatus,
  RATE_LIMIT_PRESETS,
} from '../../src/lib/security/rateLimiter';

describe('Rate Limiter 테스트', () => {
  beforeEach(() => {
    resetAllRateLimits();
  });

  describe('기본 Rate Limit 동작', () => {
    it('한도 내 요청을 허용해야 함', () => {
      const config = { windowMs: 60000, maxRequests: 5, blockDurationMs: 30000 };

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit('test:basic', config);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('한도 초과 시 요청을 차단해야 함', () => {
      const config = { windowMs: 60000, maxRequests: 3, blockDurationMs: 30000 };

      // 3회 요청 소진
      for (let i = 0; i < 3; i++) {
        checkRateLimit('test:exceed', config);
      }

      // 4번째 요청 차단
      const result = checkRateLimit('test:exceed', config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(result.reason).toBeTruthy();
    });

    it('차단 후 재시도 시간을 안내해야 함', () => {
      const config = { windowMs: 60000, maxRequests: 2, blockDurationMs: 30000 };

      checkRateLimit('test:retry', config);
      checkRateLimit('test:retry', config);

      const result = checkRateLimit('test:retry', config);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeDefined();
      expect(result.retryAfterMs!).toBeGreaterThan(0);
      expect(result.retryAfterMs!).toBeLessThanOrEqual(30000);
    });
  });

  describe('API 호출 Rate Limit 프리셋', () => {
    it('API_CALL 프리셋이 올바르게 설정되어 있어야 함', () => {
      expect(RATE_LIMIT_PRESETS.API_CALL.windowMs).toBe(60000);
      expect(RATE_LIMIT_PRESETS.API_CALL.maxRequests).toBe(30);
    });

    it('30회까지 API 호출을 허용해야 함', () => {
      for (let i = 0; i < 30; i++) {
        const result = checkRateLimit('api:test', RATE_LIMIT_PRESETS.API_CALL);
        expect(result.allowed).toBe(true);
      }

      const blocked = checkRateLimit('api:test', RATE_LIMIT_PRESETS.API_CALL);
      expect(blocked.allowed).toBe(false);
    });
  });

  describe('로그인 Brute Force 방어', () => {
    it('LOGIN 프리셋이 올바르게 설정되어 있어야 함', () => {
      expect(RATE_LIMIT_PRESETS.LOGIN.maxRequests).toBe(5);
      expect(RATE_LIMIT_PRESETS.LOGIN.backoffMultiplier).toBe(2);
    });

    it('5회 초과 로그인 시도를 차단해야 함', () => {
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit('login:user@test.com', RATE_LIMIT_PRESETS.LOGIN);
        expect(result.allowed).toBe(true);
      }

      const blocked = checkRateLimit('login:user@test.com', RATE_LIMIT_PRESETS.LOGIN);
      expect(blocked.allowed).toBe(false);
      expect(blocked.reason).toContain('한도를 초과');
    });

    it('차단 시간이 15분 이상이어야 함', () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit('login:brute', RATE_LIMIT_PRESETS.LOGIN);
      }

      const blocked = checkRateLimit('login:brute', RATE_LIMIT_PRESETS.LOGIN);
      expect(blocked.retryAfterMs).toBeGreaterThanOrEqual(15 * 60 * 1000);
    });
  });

  describe('데이터 변경 Rate Limit', () => {
    it('DATA_MUTATION 프리셋이 올바르게 설정되어 있어야 함', () => {
      expect(RATE_LIMIT_PRESETS.DATA_MUTATION.maxRequests).toBe(20);
    });

    it('20회까지 데이터 변경을 허용해야 함', () => {
      for (let i = 0; i < 20; i++) {
        const result = checkRateLimit('data:test', RATE_LIMIT_PRESETS.DATA_MUTATION);
        expect(result.allowed).toBe(true);
      }

      const blocked = checkRateLimit('data:test', RATE_LIMIT_PRESETS.DATA_MUTATION);
      expect(blocked.allowed).toBe(false);
    });
  });

  describe('Rate Limit 관리', () => {
    it('특정 키의 Rate Limit를 초기화할 수 있어야 함', () => {
      const config = { windowMs: 60000, maxRequests: 2, blockDurationMs: 30000 };

      checkRateLimit('test:reset', config);
      checkRateLimit('test:reset', config);
      checkRateLimit('test:reset', config); // 차단됨

      resetRateLimit('test:reset');

      const result = checkRateLimit('test:reset', config);
      expect(result.allowed).toBe(true);
    });

    it('전체 Rate Limit를 초기화할 수 있어야 함', () => {
      const config = { windowMs: 60000, maxRequests: 1, blockDurationMs: 30000 };

      checkRateLimit('test:a', config);
      checkRateLimit('test:b', config);

      resetAllRateLimits();

      expect(checkRateLimit('test:a', config).allowed).toBe(true);
      expect(checkRateLimit('test:b', config).allowed).toBe(true);
    });

    it('Rate Limit 상태를 조회할 수 있어야 함', () => {
      const config = { windowMs: 60000, maxRequests: 10, blockDurationMs: 30000 };

      checkRateLimit('test:status', config);
      checkRateLimit('test:status', config);

      const status = getRateLimitStatus('test:status', config);
      expect(status.remaining).toBe(8);
      expect(status.allowed).toBe(true);
    });
  });

  describe('서로 다른 키는 독립적으로 동작', () => {
    it('키별로 독립적인 Rate Limit를 적용해야 함', () => {
      const config = { windowMs: 60000, maxRequests: 2, blockDurationMs: 30000 };

      checkRateLimit('user:alice', config);
      checkRateLimit('user:alice', config);

      // alice는 차단
      expect(checkRateLimit('user:alice', config).allowed).toBe(false);

      // bob은 아직 가능
      expect(checkRateLimit('user:bob', config).allowed).toBe(true);
    });
  });
});
