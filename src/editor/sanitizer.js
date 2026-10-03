/**
 * HTML Sanitizer & Content Formatter
 *
 * Cleans incoming rich text, strips dangerous elements, standardizes tags,
 * and converts markdown syntax into sanitized HTML.
 */

import { wrapHanziInHtml } from './hanzi-aligner.js';

export function sanitizeRichHtml(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  const allowedTags = new Set([
    'DIV', 'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE',
    'CODE', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'HR',
    'SPAN', 'MARK', 'FONT'
  ]);

  const safeStyleProps = new Set([
    'color', 'background', 'background-color',
    'font-size', 'font-family', 'font-weight', 'font-style',
    'text-decoration', 'line-height', 'vertical-align'
  ]);

  container.querySelectorAll('*').forEach(el => {
    if (!allowedTags.has(el.tagName)) {
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH'].includes(el.tagName)) el.remove();
      else el.replaceWith(...el.childNodes);
      return;
    }

    // Convert legacy FONT tags to modern SPAN elements with equivalent styles
    if (el.tagName === 'FONT') {
      const span = document.createElement('span');
      const color = el.getAttribute('color');
      const face = el.getAttribute('face');
      const size = el.getAttribute('size');
      const fontStyles = [];
      if (color) fontStyles.push(`color: ${color}`);
      if (face) fontStyles.push(`font-family: ${face}`);
      if (size) {
        const sMap = { '1': '10px', '2': '12px', '3': '14px', '4': '16px', '5': '18px', '6': '24px', '7': '32px' };
        fontStyles.push(`font-size: ${sMap[size] || '16px'}`);
      }
      if (fontStyles.length > 0) span.setAttribute('style', fontStyles.join('; '));
      while (el.firstChild) span.appendChild(el.firstChild);
      el.replaceWith(span);
      el = span;
    }

    [...el.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      if (name === 'class') {
        const classes = attr.value.split(/\s+/).filter(c => /^(pill-badge|badge-pill|done-line|action-line-input|topic-input|date-input|no-input|hanzi-cjk)$/.test(c));
        if (classes.length > 0) el.className = classes.join(' ');
        else el.removeAttribute('class');
      } else if (name === 'style') {
        const rawStyles = attr.value.split(';');
        const safeDeclarations = [];
        for (const raw of rawStyles) {
          const colonIdx = raw.indexOf(':');
          if (colonIdx === -1) continue;
          const prop = raw.slice(0, colonIdx).trim().toLowerCase();
          const val = raw.slice(colonIdx + 1).trim();
          if (safeStyleProps.has(prop)) {
            if (!/url\(|expression\(|javascript:|behavior:/i.test(val)) {
              safeDeclarations.push(`${prop}: ${val}`);
            }
          }
        }
        if (safeDeclarations.length > 0) {
          el.setAttribute('style', safeDeclarations.join('; '));
        } else {
          el.removeAttribute('style');
        }
      } else {
        el.removeAttribute(attr.name);
      }
    });
  });
  return container.innerHTML;
}

export function formatContentToHtml(content) {
  if (content === null || content === undefined) return '';
  if (typeof content !== 'string') content = String(content);
  if (!content.trim()) return '';

  let html = content;

  // ── Step 1: Convert escaped HTML tags back to real tags ──
  html = html.replace(/&lt;span class="pill-badge"&gt;(.*?)&lt;\/span&gt;/gi, '<span class="pill-badge">$1</span>');
  html = html.replace(/&lt;span class="badge-pill"&gt;(.*?)&lt;\/span&gt;/gi, '<span class="pill-badge">$1</span>');
  html = html.replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u>$1</u>');
  html = html.replace(/&lt;s&gt;(.*?)&lt;\/s&gt;/gi, '<s>$1</s>');
  html = html.replace(/&lt;blockquote&gt;(.*?)&lt;\/blockquote&gt;/gi, '<blockquote>$1</blockquote>');
  html = html.replace(/&lt;code&gt;(.*?)&lt;\/code&gt;/gi, '<code>$1</code>');
  html = html.replace(/&lt;mark(.*?)&gt;(.*?)&lt;\/mark&gt;/gi, '<mark$1>$2</mark>');
  html = html.replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/gi, '<strong>$1</strong>');
  html = html.replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/gi, '<em>$1</em>');

  // ── Step 2: If content already has block-level HTML, it's pre-formatted — just sanitize ──
  if (/<(p|div|blockquote|ul|ol|h[1-6])[^>]*>/i.test(html)) {
    // If there is leading inline text before the first block element, wrap it in a div
    // so every line in the notebook has consistent block formatting
    const firstBlockMatch = html.match(/<(p|div|blockquote|ul|ol|h[1-6])[^>]*>/i);
    if (firstBlockMatch && firstBlockMatch.index > 0) {
      const leading = html.slice(0, firstBlockMatch.index);
      if (leading.trim() && !/^<(p|div|blockquote|ul|ol|h[1-6])/i.test(leading.trim())) {
        html = `<div>${leading}</div>` + html.slice(firstBlockMatch.index);
      }
    }
    html = wrapHanziInHtml(html);
    return sanitizeRichHtml(html);
  }

  // ── Step 3: Plain text / AI output — process LINE-BY-LINE ──
  // Split by newlines (and <br>) FIRST, then apply markdown per line.
  // This guarantees EVERY line ends up inside a block element (<div>, <h2>, <h3>, <blockquote>)
  // so it aligns perfectly 1:1 with notebook ruled lines.
  const rawLines = html.split(/<br\s*[\/]?>|\n/gi);

  const processedLines = rawLines.map(rawLine => {
    let line = rawLine;

    // ── Inline markdown conversions (applied per-line) ──
    // Bold
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/\*\*/g, '');
    // Italic
    line = line.replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');
    // Strikethrough
    line = line.replace(/~~(.+?)~~/g, '<s>$1</s>');
    // Inline code
    line = line.replace(/`([^`]+)`/g, '<code>$1</code>');

    // ── Block-level detection (per-line, mutually exclusive) ──
    // Heading ### → <h3>
    if (/^###\s+/.test(line)) return line.replace(/^###\s+(.*)$/, '<h3>$1</h3>');
    // Heading ## → <h2>
    if (/^##\s+/.test(line)) return line.replace(/^##\s+(.*)$/, '<h2>$1</h2>');
    // Heading # → <h2>
    if (/^#\s+/.test(line)) return line.replace(/^#\s+(.*)$/, '<h2>$1</h2>');

    // Blockquote > text
    if (/^>\s+/.test(line)) return line.replace(/^>\s+(.*)$/, '<blockquote>$1</blockquote>');

    // Bullet points: - item, * item, • item
    if (/^[-\*]\s+/.test(line)) return `<div>${line.replace(/^[-\*]\s+/, '• ')}</div>`;
    if (/^•\s*/.test(line)) return `<div>${line}</div>`;

    // Numbered list: 1. item, 2) item
    if (/^\d+[\.\)]\s+/.test(line)) return `<div>${line}</div>`;

    // ── Default: regular text → wrap in <div> ──
    return `<div>${line || '<br>'}</div>`;
  });

  html = processedLines.join('');

  // Auto-elevate Chinese / Hanzi characters to float centered in notebook ruled lines
  html = wrapHanziInHtml(html);

  return sanitizeRichHtml(html);
}
