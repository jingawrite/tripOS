/**
 * Rate Limiter 모듈
 *
 * - Sliding Window 알고리즘 기반
 * - API 호출 제한
 * - 로그인 시도 제한 (Brute Force 방어)
 * - 민감한 작업 제한
 */

interface RateLimitEntry {
  timestamps: number[];
  blockedUntil: number | null;
}

interface RateLimitConfig {
  /** 허용 윈도우 크기 (밀리초) */
  windowMs: number;
  /** 윈도우 내 최대 요청 수 */
  maxRequests: number;
  /** 차단 시 대기 시간 (밀리초) */
  blockDurationMs: number;
  /** 연속 차단 시 증가 배수 */
  backoffMultiplier?: number;
}

// 전역 Rate Limit 저장소
const rateLimitStore: Map<string, RateLimitEntry> = new Map();

// 차단 횟수 추적 (Exponential Backoff)
const blockCounts: Map<string, number> = new Map();

// ── 기본 프리셋 ──
export const RATE_LIMIT_PRESETS = {
  /** API 호출: 1분에 30회 */
  API_CALL: {
    windowMs: 60_000,
    maxRequests: 30,
    blockDurationMs: 60_000,
  } as RateLimitConfig,

  /** 로그인 시도: 15분에 5회, 실패 시 15분 차단 */
  LOGIN: {
    windowMs: 15 * 60_000,
    maxRequests: 5,
    blockDurationMs: 15 * 60_000,
    backoffMultiplier: 2,
  } as RateLimitConfig,

  /** 데이터 변경: 1분에 20회 */
  DATA_MUTATION: {
    windowMs: 60_000,
    maxRequests: 20,
    blockDurationMs: 30_000,
  } as RateLimitConfig,

  /** 민감 API: 1분에 10회 */
  SENSITIVE_API: {
    windowMs: 60_000,
    maxRequests: 10,
    blockDurationMs: 120_000,
    backoffMultiplier: 1.5,
  } as RateLimitConfig,
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
  reason?: string;
}

/**
 * Rate Limit 검사
 *
 * @param key - 제한 대상 키 (예: 'api:exchange', 'login:user@email.com')
 * @param config - Rate Limit 설정
 * @returns 허용 여부 및 상세 정보
 */
export const checkRateLimit = (
  key: string,
  config: RateLimitConfig
): RateLimitResult => {
  const now = Date.now();

  // 기존 엔트리 가져오기 또는 생성
  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [], blockedUntil: null };
    rateLimitStore.set(key, entry);
  }

  // 1. 차단 상태 확인
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfterMs = entry.blockedUntil - now;
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
      retryAfterMs,
      reason: `요청이 제한되었습니다. ${Math.ceil(retryAfterMs / 1000)}초 후 다시 시도하세요.`,
    };
  }

  // 차단 해제 시 blockedUntil 초기화
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    entry.blockedUntil = null;
  }

  // 2. 윈도우 밖의 오래된 타임스탬프 제거
  const windowStart = now - config.windowMs;
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  // 3. 최대 요청 수 초과 여부 확인
  if (entry.timestamps.length >= config.maxRequests) {
    // 차단 횟수 증가
    const currentBlockCount = (blockCounts.get(key) || 0) + 1;
    blockCounts.set(key, currentBlockCount);

    // Exponential Backoff 적용
    const multiplier = config.backoffMultiplier || 1;
    const blockDuration =
      config.blockDurationMs * Math.pow(multiplier, Math.min(currentBlockCount - 1, 5));

    entry.blockedUntil = now + blockDuration;

    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
      retryAfterMs: blockDuration,
      reason: `요청 한도를 초과했습니다. ${Math.ceil(blockDuration / 1000)}초 후 다시 시도하세요.`,
    };
  }

  // 4. 요청 기록 추가
  entry.timestamps.push(now);

  // 성공 시 차단 횟수 점진적 감소
  if (blockCounts.has(key)) {
    const count = blockCounts.get(key)!;
    if (count > 0 && entry.timestamps.length <= Math.floor(config.maxRequests / 2)) {
      blockCounts.set(key, count - 1);
    }
  }

  const remaining = config.maxRequests - entry.timestamps.length;
  const resetAt = entry.timestamps[0] + config.windowMs;

  return {
    allowed: true,
    remaining,
    resetAt,
  };
};

/**
 * Rate Limit 초기화 (특정 키)
 */
export const resetRateLimit = (key: string): void => {
  rateLimitStore.delete(key);
  blockCounts.delete(key);
};

/**
 * Rate Limit 전체 초기화
 */
export const resetAllRateLimits = (): void => {
  rateLimitStore.clear();
  blockCounts.clear();
};

/**
 * 현재 Rate Limit 상태 조회
 */
export const getRateLimitStatus = (
  key: string,
  config: RateLimitConfig
): RateLimitResult => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: now + config.windowMs,
    };
  }

  // 차단 상태 확인
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
      retryAfterMs: entry.blockedUntil - now,
    };
  }

  // 유효한 요청 수 계산
  const windowStart = now - config.windowMs;
  const validTimestamps = entry.timestamps.filter((ts) => ts > windowStart);
  const remaining = Math.max(0, config.maxRequests - validTimestamps.length);

  return {
    allowed: remaining > 0,
    remaining,
    resetAt: validTimestamps.length > 0 ? validTimestamps[0] + config.windowMs : now + config.windowMs,
  };
};
