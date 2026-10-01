/**
 * PDF Exporter & Print Engine
 *
 * Two export methods:
 * 1. Server PDF (Puppeteer) — pixel-perfect, no Chrome print dialog
 * 2. Browser Print (fallback) — uses window.print() with @media print CSS
 */

import { getActiveNotebook } from '../state/store.js';
import { saveActivePages } from '../components/reader.js';
import { showToast } from '../components/modal.js';

/**
 * Builds the royal cover page for print/PDF export
 * @param {Object} notebook
 * @returns {HTMLElement}
 */
export function createPrintCover(notebook) {
  const sheet = document.createElement('article');
  sheet.className = 'print-page-sheet print-cover-sheet';
  sheet.style.setProperty('--print-cover-background', notebook.coverGradient || 'linear-gradient(135deg, #1e3a8a, #0f172a)');
  sheet.style.setProperty('--print-cover-color', notebook.coverTextColor || '#ffffff');

  const frame = document.createElement('div');
  frame.className = 'print-cover-frame';

  const category = document.createElement('div');
  category.className = 'print-cover-category';
  category.textContent = notebook.category || 'Ghi chép';

  const title = document.createElement('h1');
  title.className = 'print-cover-title';
  title.textContent = notebook.title || 'Sổ tay';

  const rule = document.createElement('div');
  rule.className = 'print-cover-rule';

  const footer = document.createElement('div');
  footer.className = 'print-cover-footer';

  const author = document.createElement('span');
  author.textContent = notebook.author || 'Cá nhân';

  const pageCount = document.createElement('span');
  pageCount.textContent = `${notebook.pages.length} trang`;

  footer.append(author, pageCount);
  frame.append(category, title, rule, footer);
  sheet.appendChild(frame);

  return sheet;
}

/**
 * Export PDF via server-side Puppeteer rendering.
 * Downloads a pixel-perfect PDF that matches the web view exactly.
 */
export async function exportPdfFromServer() {
  if (!saveActivePages()) return;
  const notebook = getActiveNotebook();
  if (!notebook || !notebook.id) {
    showToast('Không có sổ tay nào để xuất.');
    return;
  }

  showToast('📄 Đang tạo PDF...', 3000);

  try {
    const response = await fetch(`/api/notebooks/${notebook.id}/pdf`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    // Download the PDF
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notebook.title || 'notebook'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('✅ PDF đã tải xuống!', 3000);
  } catch (err) {
    console.error('PDF export error:', err);
    showToast(`❌ Lỗi tạo PDF: ${err.message}`, 5000);
  }
}

/**
 * Fallback: Browser print using window.print()
 * @param {boolean} includeCover
 */
export function printFullNotebook(includeCover = false) {
  if (!saveActivePages()) return;
  const notebook = getActiveNotebook();
  if (!notebook || !Array.isArray(notebook.pages) || notebook.pages.length === 0) {
    showToast('Không có trang nào để in.');
    return;
  }

  // For browser print, just call window.print() — the @media print CSS handles the rest
  showToast('💡 Chọn Margins: None + ✅ Background graphics để in đẹp nhất', 5000);
  window.print();
}
