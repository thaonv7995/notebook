/**
 * Vector Ornaments & Decorative Assets
 * Ornate Royal Corner Frames & Edge Index Markers
 */

export const ROYAL_CORNERS_SVG = `
  <svg class="content-corner-frame corner-tl" viewBox="0 0 45 45" fill="none">
    <path d="M2,44 L2,6 C2,3.8 3.8,2 6,2 L44,2" stroke="#0f172a" stroke-width="1.5"/>
    <path d="M7,44 L7,9 C7,7.9 7.9,7 9,7 L44,7" stroke="#475569" stroke-width="1"/>
    <polygon points="12,12 15,9 12,6 9,9" fill="#0f172a"/>
  </svg>
  <svg class="content-corner-frame corner-tr" viewBox="0 0 45 45" fill="none">
    <path d="M2,44 L2,6 C2,3.8 3.8,2 6,2 L44,2" stroke="#0f172a" stroke-width="1.5"/>
    <path d="M7,44 L7,9 C7,7.9 7.9,7 9,7 L44,7" stroke="#475569" stroke-width="1"/>
    <polygon points="12,12 15,9 12,6 9,9" fill="#0f172a"/>
  </svg>
  <svg class="content-corner-frame corner-bl" viewBox="0 0 45 45" fill="none">
    <path d="M2,44 L2,6 C2,3.8 3.8,2 6,2 L44,2" stroke="#0f172a" stroke-width="1.5"/>
    <path d="M7,44 L7,9 C7,7.9 7.9,7 9,7 L44,7" stroke="#475569" stroke-width="1"/>
    <polygon points="12,12 15,9 12,6 9,9" fill="#0f172a"/>
  </svg>
  <svg class="content-corner-frame corner-br" viewBox="0 0 45 45" fill="none">
    <path d="M2,44 L2,6 C2,3.8 3.8,2 6,2 L44,2" stroke="#0f172a" stroke-width="1.5"/>
    <path d="M7,44 L7,9 C7,7.9 7.9,7 9,7 L44,7" stroke="#475569" stroke-width="1"/>
    <polygon points="12,12 15,9 12,6 9,9" fill="#0f172a"/>
  </svg>
`;

export function renderEdgeNotches(activePhase = '') {
  const phases = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const normPhase = String(activePhase || '').trim().toUpperCase();
  const notchesHtml = phases.map(p => {
    const isActive = normPhase === p || normPhase === `PHASE ${p}` || normPhase === `PHASE_${p}`;
    const title = isActive
      ? `Giai đoạn ${p} · Đang chọn (Bấm để bỏ đánh dấu)`
      : `Giai đoạn ${p} (Bấm để đánh dấu)`;
    return `<div class="index-notch${isActive ? ' is-active' : ''}" data-phase="${p}" role="button" tabindex="0" title="${title}" aria-label="Giai đoạn ${p}" aria-pressed="${isActive}">${p}</div>`;
  }).join('\n    ');

  return `
  <div class="edge-index-markers" role="group" aria-label="Đánh dấu giai đoạn I - VI">
    ${notchesHtml}
  </div>
`;
}

export const EDGE_NOTCHES_HTML = renderEdgeNotches('');

function escapeSealHTML(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

export function formatAuthorHandle(author) {
  if (!author || author === 'Cá nhân' || author === 'Notebook Studio') {
    return '@thaonv';
  }
  const str = String(author).trim();
  if (!str || str === 'Cá nhân') return '@thaonv';
  if (/^[a-zA-Z0-9._-]+$/.test(str) && !str.startsWith('@')) {
    return `@${str}`;
  }
  return str;
}

export function renderSignatureSeal(author, subLabel = 'STUDY ARCHIVE') {
  const handle = formatAuthorHandle(author);
  return `
    <div class="signature-seal-cartouche" title="Bấm để đổi tên tác giả / handle (ví dụ: @thaonv)">
      <span class="seal-user-handle">${escapeSealHTML(handle)}</span>
      <span class="seal-user-sub">${escapeSealHTML(subLabel)}</span>
    </div>
  `;
}
