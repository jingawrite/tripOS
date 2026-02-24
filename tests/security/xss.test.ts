/**
 * XSS (Cross-Site Scripting) 방어 테스트
 *
 * OWASP Top 10 - A7: Cross-Site Scripting (XSS)
 */
import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  stripHtmlTags,
  detectXss,
  sanitizeText,
  sanitizeUrl,
  sanitizeEmoji,
} from '../../src/lib/security/xss';

describe('XSS 방어 테스트', () => {
  describe('escapeHtml - HTML 엔티티 이스케이프', () => {
    it('HTML 특수문자를 엔티티로 변환해야 함', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('& 문자를 이스케이프해야 함', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('작은따옴표를 이스케이프해야 함', () => {
      expect(escapeHtml("it's")).toBe('it&#x27;s');
    });

    it('백틱을 이스케이프해야 함', () => {
      expect(escapeHtml('`injected`')).toBe('&#96;injected&#96;');
    });

    it('빈 문자열을 처리해야 함', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('비문자열 입력을 빈 문자열로 반환해야 함', () => {
      expect(escapeHtml(null as unknown as string)).toBe('');
      expect(escapeHtml(undefined as unknown as string)).toBe('');
      expect(escapeHtml(123 as unknown as string)).toBe('');
    });
  });

  describe('stripHtmlTags - HTML 태그 제거', () => {
    it('모든 HTML 태그를 제거해야 함', () => {
      expect(stripHtmlTags('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    it('script 태그를 제거해야 함', () => {
      expect(stripHtmlTags('<script>alert(1)</script>Normal')).toBe('alert(1)Normal');
    });

    it('self-closing 태그를 제거해야 함', () => {
      expect(stripHtmlTags('Line1<br/>Line2')).toBe('Line1Line2');
    });

    it('이벤트 핸들러가 포함된 태그를 제거해야 함', () => {
      expect(stripHtmlTags('<img onerror="alert(1)" src="x">')).toBe('');
    });
  });

  describe('detectXss - XSS 패턴 감지', () => {
    it('javascript: 프로토콜을 감지해야 함', () => {
      expect(detectXss('javascript:alert(1)')).toBe(true);
    });

    it('vbscript: 프로토콜을 감지해야 함', () => {
      expect(detectXss('vbscript:MsgBox')).toBe(true);
    });

    it('data: 프로토콜을 감지해야 함', () => {
      expect(detectXss('data:text/html,<script>alert(1)</script>')).toBe(true);
    });

    it('이벤트 핸들러를 감지해야 함', () => {
      expect(detectXss('onload=alert(1)')).toBe(true);
      expect(detectXss('onerror=alert(1)')).toBe(true);
      expect(detectXss('onclick=alert(1)')).toBe(true);
    });

    it('script 태그를 감지해야 함', () => {
      expect(detectXss('<script>alert(1)</script>')).toBe(true);
      expect(detectXss('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
    });

    it('eval() 호출을 감지해야 함', () => {
      expect(detectXss('eval("malicious")')).toBe(true);
    });

    it('Function() 생성자를 감지해야 함', () => {
      expect(detectXss('Function("return this")()')).toBe(true);
    });

    it('정상 텍스트에서는 false를 반환해야 함', () => {
      expect(detectXss('Hello World')).toBe(false);
      expect(detectXss('여행 일정 입력')).toBe(false);
      expect(detectXss('2024-01-15')).toBe(false);
    });

    it('비문자열 입력에서 false를 반환해야 함', () => {
      expect(detectXss(null as unknown as string)).toBe(false);
    });
  });

  describe('sanitizeText - XSS 안전 텍스트 변환', () => {
    it('HTML 태그를 제거해야 함', () => {
      expect(sanitizeText('<b>Bold</b>')).toBe('Bold');
    });

    it('script injection을 제거해야 함', () => {
      expect(sanitizeText('<script>alert("xss")</script>Normal')).toBe('Normal');
    });

    it('이벤트 핸들러를 제거해야 함', () => {
      expect(sanitizeText('text onclick=alert(1)')).toBe('text alert(1)');
    });

    it('null bytes를 제거해야 함', () => {
      expect(sanitizeText('hello\0world')).toBe('helloworld');
    });

    it('정상 텍스트는 유지해야 함', () => {
      expect(sanitizeText('서울 여행 일정')).toBe('서울 여행 일정');
    });

    it('비문자열 입력을 빈 문자열로 반환해야 함', () => {
      expect(sanitizeText(undefined as unknown as string)).toBe('');
    });
  });

  describe('sanitizeUrl - URL XSS 방어', () => {
    it('http:// URL을 허용해야 함', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('https:// URL을 허용해야 함', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('javascript: URL을 차단해야 함', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('data: URL을 차단해야 함', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('vbscript: URL을 차단해야 함', () => {
      expect(sanitizeUrl('vbscript:MsgBox')).toBe('');
    });

    it('프로토콜 없는 URL을 차단해야 함', () => {
      expect(sanitizeUrl('example.com')).toBe('');
    });

    it('빈 문자열을 반환해야 함', () => {
      expect(sanitizeUrl('')).toBe('');
    });

    it('ftp: URL을 차단해야 함', () => {
      expect(sanitizeUrl('ftp://files.example.com')).toBe('');
    });
  });

  describe('sanitizeEmoji - 이모지 안전 처리', () => {
    it('이모지를 유지해야 함', () => {
      expect(sanitizeEmoji('✈️')).toBe('✈️');
      expect(sanitizeEmoji('🏨')).toBe('🏨');
    });

    it('HTML 태그를 제거해야 함', () => {
      expect(sanitizeEmoji('<script>alert(1)</script>✈️')).toBe('alert(1)✈️');
    });

    it('제어문자를 제거해야 함', () => {
      expect(sanitizeEmoji('✈️\x00\x01')).toBe('✈️');
    });
  });
});
