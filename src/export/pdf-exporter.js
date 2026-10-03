/**
 * PDF Exporter & Print Engine
 *
 * Uses client-side html2canvas + jsPDF for pixel-perfect PDF generation.
 * Captures each page as a screenshot directly in the user's browser,
 * then composes all screenshots into a downloadable PDF.
 *
 * Benefits over server-side Puppeteer:
 * - No server roundtrip or navigation timeout issues
 * - Captures EXACTLY what the user sees (same fonts, emojis, icons)
 * - No CSS @media print conflicts
 * - Works on any deployment (no Chrome dependency on server)
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getState, getActiveNotebook } from '../state/store.js';
import { renderSheetContent } from '../templates/index.js';
import { saveActivePages } from '../components/reader.js';
import { showToast } from '../components/modal.js';
import { FONT_FAMILIES } from '../config/constants.js';

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
  author.textContent = (!notebook.author || notebook.author === 'Cá nhân') ? '@thaonv' : notebook.author;

  const pageCount = document.createElement('span');
  pageCount.textContent = `${notebook.pages.length} trang`;

  footer.append(author, pageCount);
  frame.append(category, title, rule, footer);
  sheet.appendChild(frame);

  return sheet;
}

/**
 * Export PDF — client-side using html2canvas + jsPDF.
 * Renders each page at exact web dimensions, captures as canvas,
 * then composes into a PDF.
 * @param {boolean} includeCover
 */
export async function exportPdfFromServer(includeCover = false) {
  if (!saveActivePages()) return;
  const notebook = getActiveNotebook();
  if (!notebook || !notebook.id) {
    showToast('Không có sổ tay nào để xuất.');
    return;
  }

  const pages = notebook.pages || [];
  if (pages.length === 0) {
    showToast('Sổ tay không có trang nào.');
    return;
  }

  showToast('📄 Đang kết xuất PDF...', 0); // persistent toast

  try {
    const state = getState();

    // ── Apply notebook typography CSS variables ──
    const nbFontKey = notebook.fontFamily || state.fontFamily || 'sans';
    const cssFont = FONT_FAMILIES[nbFontKey] || FONT_FAMILIES['sans'];
    const lhValue = notebook.lineHeight || state.lineHeight || '28';
    const fontSize = state.fontSize || 16;
    const lhPx = lhValue === 'none' ? 28 : (parseInt(lhValue, 10) || 28);
    const maxNbFont = Math.max(12, lhPx - 4);
    const nbFont = Math.max(10, Math.min(fontSize, maxNbFont));

    document.documentElement.style.setProperty('--notebook-font-family', cssFont);
    document.documentElement.style.setProperty('--notebook-line-height', `${lhPx}px`);
    document.documentElement.style.setProperty('--notebook-font-size', `${nbFont}px`);

    // ── Paper tone & texture ──
    const paperTone = state.paperTone || 'cream';
    const paperTexture = state.paperTexture || 'grain';

    // ── Create hidden offscreen container ──
    const offscreen = document.createElement('div');
    offscreen.id = 'pdf-offscreen-renderer';
    offscreen.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 660px;
      z-index: -1;
      pointer-events: none;
      opacity: 1;
    `;
    offscreen.setAttribute('data-paper-tone', paperTone);
    offscreen.setAttribute('data-paper-texture', paperTexture);
    document.body.appendChild(offscreen);

    // ── Render all pages into offscreen container ──
    const sheetElements = [];

    // Optional cover
    if (includeCover) {
      const coverCasing = document.createElement('div');
      coverCasing.className = 'book-spread-casing mode-1-page focus-left';
      coverCasing.setAttribute('data-paper-tone', paperTone);
      const coverSheet = document.createElement('article');
      coverSheet.className = 'book-page-sheet book-page-left';
      coverSheet.style.cssText = 'width: 660px; height: 820px; display: flex;';
      coverSheet.appendChild(createPrintCover(notebook));
      coverCasing.appendChild(coverSheet);
      offscreen.appendChild(coverCasing);
      sheetElements.push(coverSheet);
    }

    // Content pages
    for (let i = 0; i < pages.length; i++) {
      const casing = document.createElement('div');
      casing.className = 'book-spread-casing mode-1-page focus-left';
      casing.setAttribute('data-paper-tone', paperTone);
      casing.setAttribute('data-paper-texture', paperTexture);

      const sheet = document.createElement('article');
      sheet.className = 'book-page-sheet book-page-left';
      sheet.style.cssText = 'width: 660px; height: 820px; display: flex;';

      renderSheetContent(sheet, JSON.parse(JSON.stringify(pages[i])), i + 1, true, null);

      // Make non-editable
      sheet.querySelectorAll('[contenteditable]').forEach(el => el.setAttribute('contenteditable', 'false'));
      sheet.querySelectorAll('input').forEach(input => input.setAttribute('readonly', 'readonly'));

      casing.appendChild(sheet);
      offscreen.appendChild(casing);
      sheetElements.push(sheet);
    }

    // Wait for fonts and images to load
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 300));

    // ── Pre-capture fixes for html2canvas ──
    // Paper background and line color lookup
    const paperBgs = {
      cream: '#faf7f0', white: '#ffffff', ivory: '#f5f0e0',
      aged: '#ede4d0', mint: '#e8f5f0', rose: '#fce8e8',
      lavender: '#f0ecf8',
    };
    const lineColors = {
      cream: '#dfd5c4', white: '#cbd5e1', ivory: '#d4c9ab',
      aged: '#c5b99a', mint: '#a4c5b8', rose: '#d4a9a9',
      lavender: '#b0a4c5',
    };
    const paperBg = paperBgs[paperTone] || '#faf7f0';
    const lineColor = lineColors[paperTone] || '#dfd5c4';

    // Fix each page element before capture
    offscreen.querySelectorAll('.book-spread-casing').forEach(casing => {
      casing.style.cssText += `
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        width: 660px !important;
        height: 820px !important;
        overflow: hidden !important;
      `;
    });

    offscreen.querySelectorAll('.book-page-sheet').forEach(sheet => {
      sheet.style.cssText += `
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        outline: none !important;
        background-color: ${paperBg} !important;
      `;
    });

    offscreen.querySelectorAll('.a4-template-sheet').forEach(tmpl => {
      tmpl.style.setProperty('background-color', paperBg, 'important');
    });

    // Fix ruled lines using SVG data URI (html2canvas supports SVG images)
    offscreen.querySelectorAll('.template-writing-area').forEach(area => {
      const lh = parseInt(getComputedStyle(area).lineHeight, 10) || lhPx;

      // Create a tiny SVG that draws a 1px line at the bottom of each cell
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="${lh}"><rect x="0" y="${lh - 1}" width="10" height="1" fill="${lineColor}"/></svg>`;
      const svgDataUri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

      area.style.setProperty('background-image', svgDataUri, 'important');
      area.style.setProperty('background-repeat', 'repeat', 'important');
      area.style.setProperty('background-size', `100% ${lh}px`, 'important');
      area.style.setProperty('background-position', '0 0', 'important');
      area.style.setProperty('background-attachment', 'scroll', 'important');
      area.style.setProperty('background-color', paperBg, 'important');
    });

    // ── Capture each page as canvas ──
    const PAGE_W = 660;
    const PAGE_H = 820;
    const SCALE = 2; // 2x for retina quality

    // Capture the CASING elements (includes paper tone/texture styling)
    const casingElements = offscreen.querySelectorAll('.book-spread-casing');

    // Create PDF (page size = web dimensions in mm)
    // 660px at 96dpi = 174.625mm, 820px at 96dpi = 216.958mm
    const pdfWidthMm = (PAGE_W / 96) * 25.4;
    const pdfHeightMm = (PAGE_H / 96) * 25.4;
    const pdf = new jsPDF({
      orientation: pdfWidthMm > pdfHeightMm ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
    });

    for (let i = 0; i < casingElements.length; i++) {
      showToast(`📄 Đang xuất trang ${i + 1}/${casingElements.length}...`, 0);

      const canvas = await html2canvas(casingElements[i], {
        scale: SCALE,
        width: PAGE_W,
        height: PAGE_H,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      if (i > 0) {
        pdf.addPage([pdfWidthMm, pdfHeightMm]);
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidthMm, pdfHeightMm);
    }

    // ── Download ──
    pdf.save(`${notebook.title || 'notebook'}.pdf`);

    // Cleanup offscreen container
    offscreen.remove();

    showToast('✅ PDF đã tải xuống!', 3000);
  } catch (err) {
    console.error('PDF export error:', err);
    showToast(`❌ Lỗi tạo PDF: ${err.message}`, 5000);

    // Cleanup on error
    const offscreen = document.getElementById('pdf-offscreen-renderer');
    if (offscreen) offscreen.remove();
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
