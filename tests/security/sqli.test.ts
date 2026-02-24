/**
 * SQL Injection 방어 테스트
 *
 * OWASP Top 10 - A3: Injection
 */
import { describe, it, expect } from 'vitest';
import {
  detectSqlInjection,
  validateString,
  validateScheduleInput,
} from '../../src/lib/security/inputValidator';

describe('SQL Injection 방어 테스트', () => {
  describe('detectSqlInjection - SQLi 패턴 감지', () => {
    it("기본 ' OR '1'='1 공격을 감지해야 함", () => {
      expect(detectSqlInjection("' OR '1'='1")).toBe(true);
    });

    it("' AND '1'='1 공격을 감지해야 함", () => {
      expect(detectSqlInjection("' AND '1'='1")).toBe(true);
    });

    it('DROP TABLE 공격을 감지해야 함', () => {
      expect(detectSqlInjection('; DROP TABLE users;')).toBe(true);
    });

    it('DELETE 공격을 감지해야 함', () => {
      expect(detectSqlInjection('; DELETE FROM schedules;')).toBe(true);
    });

    it('UNION SELECT 공격을 감지해야 함', () => {
      expect(detectSqlInjection('UNION SELECT * FROM users')).toBe(true);
    });

    it('UNION ALL SELECT 공격을 감지해야 함', () => {
      expect(detectSqlInjection('UNION ALL SELECT password FROM users')).toBe(true);
    });

    it('SQL 주석 공격을 감지해야 함', () => {
      expect(detectSqlInjection('admin--')).toBe(true);
      expect(detectSqlInjection('admin/*comment*/')).toBe(true);
    });

    it('SLEEP (Time-based) 공격을 감지해야 함', () => {
      expect(detectSqlInjection("' OR SLEEP(5)--")).toBe(true);
    });

    it('BENCHMARK 공격을 감지해야 함', () => {
      expect(detectSqlInjection("BENCHMARK(1000000,SHA1('test'))")).toBe(true);
    });

    it('WAITFOR DELAY 공격을 감지해야 함', () => {
      expect(detectSqlInjection("'; WAITFOR DELAY '0:0:5'--")).toBe(true);
    });

    it('xp_ 확장 프로시저를 감지해야 함', () => {
      expect(detectSqlInjection("xp_cmdshell('dir')")).toBe(true);
    });

    it('INSERT 공격을 감지해야 함', () => {
      expect(detectSqlInjection("; INSERT INTO users VALUES('hacker')")).toBe(true);
    });

    it('UPDATE 공격을 감지해야 함', () => {
      expect(detectSqlInjection("; UPDATE users SET role='admin'")).toBe(true);
    });

    it('정상 텍스트에서는 false를 반환해야 함', () => {
      expect(detectSqlInjection('서울 여행 일정')).toBe(false);
      expect(detectSqlInjection('2024-01-15')).toBe(false);
      expect(detectSqlInjection('Tokyo Trip')).toBe(false);
      expect(detectSqlInjection('Flight KE123')).toBe(false);
    });

    it('비문자열 입력에서 false를 반환해야 함', () => {
      expect(detectSqlInjection(null as unknown as string)).toBe(false);
      expect(detectSqlInjection(undefined as unknown as string)).toBe(false);
    });
  });

  describe('validateString - SQLi가 포함된 입력 거부', () => {
    it('SQLi 패턴이 포함된 입력을 거부해야 함', () => {
      const result = validateString("'; DROP TABLE users;--", {
        fieldName: '이름',
        required: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('허용되지 않은 패턴');
    });

    it('정상 입력을 허용해야 함', () => {
      const result = validateString('도쿄 여행', {
        fieldName: '제목',
        required: true,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateScheduleInput - 종합 입력 검증', () => {
    it('정상 입력을 허용해야 함', () => {
      const result = validateScheduleInput({
        category: 'custom',
        emoji: '✈️',
        topText: '도쿄 여행',
        date: '2024-03-15',
      });
      expect(result.valid).toBe(true);
    });

    it('SQLi가 포함된 topText를 거부해야 함', () => {
      const result = validateScheduleInput({
        category: 'custom',
        emoji: '✈️',
        topText: "'; DROP TABLE--",
        date: '2024-03-15',
      });
      expect(result.valid).toBe(false);
    });

    it('잘못된 카테고리를 거부해야 함', () => {
      const result = validateScheduleInput({
        category: 'hacked_category',
        emoji: '✈️',
        topText: '일정',
        date: '2024-03-15',
      });
      expect(result.valid).toBe(false);
    });

    it('잘못된 날짜 형식을 거부해야 함', () => {
      const result = validateScheduleInput({
        category: 'custom',
        emoji: '✈️',
        topText: '일정',
        date: '2024/03/15', // 잘못된 형식
      });
      expect(result.valid).toBe(false);
    });

    it('javascript: URL을 거부해야 함', () => {
      const result = validateScheduleInput({
        category: 'custom',
        emoji: '✈️',
        topText: '일정',
        date: '2024-03-15',
        url: 'javascript:alert(1)',
      });
      expect(result.valid).toBe(false);
    });
  });
});
