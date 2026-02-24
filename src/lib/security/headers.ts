/**
 * Security Headers 검증 모듈
 *
 * - 필수 보안 헤더 존재 여부 검증
 * - CSP 정책 검증
 * - HSTS 설정 검증
 * - Vercel 배포 환경 헤더 검증
 */

// ── 필수 보안 헤더 목록 ──
export const REQUIRED_SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; '),
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
} as const;

// ── CSP 디렉티브 검증 ──
export interface CspDirective {
  name: string;
  value: string;
  required: boolean;
}

export const REQUIRED_CSP_DIRECTIVES: CspDirective[] = [
  { name: 'default-src', value: "'self'", required: true },
  { name: 'script-src', value: "'self'", required: true },
  { name: 'object-src', value: "'none'", required: true },
  { name: 'frame-ancestors', value: "'none'", required: true },
  { name: 'base-uri', value: "'self'", required: true },
  { name: 'form-action', value: "'self'", required: true },
];

// ── CSP에서 금지된 값 (inline/eval 차단) ──
export const FORBIDDEN_CSP_VALUES = [
  "'unsafe-eval'",   // eval() 차단
  // "'unsafe-inline'" - style-src에서는 허용 (React CSS-in-JS 호환)
  "'unsafe-hashes'",
];

export interface HeaderCheckResult {
  header: string;
  present: boolean;
  valid: boolean;
  actual?: string;
  expected?: string;
  message?: string;
}

/**
 * 응답 헤더에서 보안 헤더 검증
 */
export const checkSecurityHeaders = (
  headers: Record<string, string>
): HeaderCheckResult[] => {
  const results: HeaderCheckResult[] = [];

  for (const [header, expectedValue] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
    const actual = headers[header] || headers[header.toLowerCase()];

    if (!actual) {
      results.push({
        header,
        present: false,
        valid: false,
        expected: expectedValue,
        message: `${header} 헤더가 누락되었습니다`,
      });
      continue;
    }

    // CSP는 별도 검증
    if (header === 'Content-Security-Policy') {
      const cspResult = validateCsp(actual);
      results.push({
        header,
        present: true,
        valid: cspResult.valid,
        actual,
        expected: expectedValue,
        message: cspResult.valid ? 'CSP 정책이 올바릅니다' : cspResult.message,
      });
      continue;
    }

    const valid = actual === expectedValue;
    results.push({
      header,
      present: true,
      valid,
      actual,
      expected: expectedValue,
      message: valid ? '정상' : `기대값과 다릅니다: ${actual}`,
    });
  }

  return results;
};

/**
 * CSP 정책 문자열 검증
 */
export const validateCsp = (
  cspString: string
): { valid: boolean; message: string; issues: string[] } => {
  const issues: string[] = [];

  // 1. 필수 디렉티브 확인
  for (const directive of REQUIRED_CSP_DIRECTIVES) {
    if (directive.required && !cspString.includes(directive.name)) {
      issues.push(`필수 디렉티브 누락: ${directive.name}`);
    }
  }

  // 2. script-src에서 unsafe-eval, unsafe-inline 금지
  const scriptSrcMatch = cspString.match(/script-src\s+([^;]+)/);
  if (scriptSrcMatch) {
    const scriptSrcValue = scriptSrcMatch[1];
    for (const forbidden of FORBIDDEN_CSP_VALUES) {
      if (scriptSrcValue.includes(forbidden)) {
        issues.push(`script-src에서 ${forbidden}이(가) 사용되고 있습니다`);
      }
    }
    if (scriptSrcValue.includes("'unsafe-inline'")) {
      issues.push("script-src에서 'unsafe-inline'이(가) 사용되고 있습니다");
    }
  }

  // 3. default-src에서 * 금지
  if (cspString.includes("default-src *") || cspString.includes("default-src '*'")) {
    issues.push("default-src에서 와일드카드(*)가 사용되고 있습니다");
  }

  return {
    valid: issues.length === 0,
    message: issues.length === 0
      ? 'CSP 정책이 올바릅니다'
      : `CSP 문제 발견: ${issues.join(', ')}`,
    issues,
  };
};

/**
 * CORS 설정 검증
 */
export const validateCorsConfig = (config: {
  allowedOrigins: string[];
  allowCredentials: boolean;
}): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];

  // credentials 사용 시 * 금지
  if (config.allowCredentials && config.allowedOrigins.includes('*')) {
    issues.push('credentials 사용 시 Access-Control-Allow-Origin에 *를 사용할 수 없습니다');
  }

  // 빈 origin 목록 확인
  if (config.allowedOrigins.length === 0) {
    issues.push('허용된 오리진이 없습니다');
  }

  // 와일드카드 서브도메인 확인
  for (const origin of config.allowedOrigins) {
    if (origin !== '*' && origin.includes('*')) {
      issues.push(`와일드카드 서브도메인은 지원되지 않습니다: ${origin}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};

/**
 * 쿠키 보안 속성 검증
 */
export const validateCookieSecurity = (cookie: {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];

  if (!cookie.httpOnly) {
    issues.push('HttpOnly 플래그가 설정되지 않았습니다');
  }

  if (!cookie.secure) {
    issues.push('Secure 플래그가 설정되지 않았습니다');
  }

  if (!cookie.sameSite || !['strict', 'lax'].includes(cookie.sameSite.toLowerCase())) {
    issues.push('SameSite가 Strict 또는 Lax로 설정되어야 합니다');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};

/**
 * vercel.json 보안 헤더 설정 검증
 */
export const validateVercelHeaders = (
  vercelConfig: { headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }> }
): { valid: boolean; issues: string[]; score: number } => {
  const issues: string[] = [];
  let score = 0;
  const maxScore = Object.keys(REQUIRED_SECURITY_HEADERS).length;

  if (!vercelConfig.headers || vercelConfig.headers.length === 0) {
    return {
      valid: false,
      issues: ['vercel.json에 headers 설정이 없습니다'],
      score: 0,
    };
  }

  // 모든 경로에 적용되는 헤더 찾기
  const globalHeaders = vercelConfig.headers.find(
    (h) => h.source === '/(.*)'
  );

  if (!globalHeaders) {
    issues.push('전역 헤더 패턴 /(.*) 이 설정되지 않았습니다');
    return { valid: false, issues, score: 0 };
  }

  const headerMap = new Map(
    globalHeaders.headers.map((h) => [h.key, h.value])
  );

  for (const [requiredHeader] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
    if (headerMap.has(requiredHeader)) {
      score++;
    } else {
      issues.push(`${requiredHeader} 헤더가 vercel.json에 없습니다`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    score: Math.round((score / maxScore) * 100),
  };
};
