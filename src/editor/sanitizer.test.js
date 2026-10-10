// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { sanitizeRichHtml } from './sanitizer.js';

describe('sanitizeRichHtml', () => {
  it('removes executable and embedded elements', () => {
    const result = sanitizeRichHtml(`
      <p>Nội dung an toàn</p>
      <script>alert('xss')</script>
      <iframe src="https://example.com"></iframe>
      <object data="https://example.com/file"></object>
    `);

    expect(result).toContain('<p>Nội dung an toàn</p>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('<object');
    expect(result).not.toContain("alert('xss')");
  });

  it('removes event-handler attributes', () => {
    const result = sanitizeRichHtml(
      '<p onclick="alert(1)"><strong onmouseover="alert(2)">Ghi chú</strong></p>'
    );

    expect(result).toContain('<strong>Ghi chú</strong>');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onmouseover');
  });

  it('preserves safe formatting and removes unsafe styles', () => {
    const result = sanitizeRichHtml(
      '<span style="color: #123456; font-weight: 700; position: fixed; z-index: 9999">Nội dung</span>'
    );

    expect(result).toContain('color');
    expect(result).toContain('font-weight');
    expect(result).not.toContain('position');
    expect(result).not.toContain('z-index');
  });

  it('keeps safe image sources and removes unsafe protocols', () => {
    const safeResult = sanitizeRichHtml(
      'data:image/png;base64,AAAA'
    );
    const unsafeResult = sanitizeRichHtml(
      '<img src="javascript:alert(1)" alt="Ảnhoàn">'
    );

    expect(safeResult).toContain('data:image/png;base64,AAAA');
    expect(unsafeResult).not.toContain('javascript:');
  });

  it('converts legacy font tags to spans', () => {
    const result = sanitizeRichHtml(
      '<font color="#112233" face="serif" size="4">Văn bản cũ</font>'
    );

    expect(result).toContain('<span');
    expect(result).toContain('Văn bản cũ');
    expect(result).not.toContain('<font');
  });
});
