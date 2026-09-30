/**
 * PDF Exporter & Print Engine
 *
 * Generates an A4 print DOM tree with an optional royal cartouche cover,
 * sets print classes, and triggers the browser's high-fidelity print subsystem.
 */

import { getActiveNotebook } from '../state/store.js';
import { saveActivePages } from '../components/reader.js';
import { renderSheetContent } from '../templates/index.js';
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
 * Clones all pages and launches print dialog
 * @param {boolean} includeCover
 */
export function printFullNotebook(includeCover = false) {
  if (!saveActivePages()) return;
  const notebook = getActiveNotebook();
  if (!notebook || !Array.isArray(notebook.pages) || notebook.pages.length === 0) {
    showToast('Không có trang nào để in.');
    return;
  }

  document.querySelectorAll('.print-all-pages').forEach(node => node.remove());
  const printRoot = document.createElement('main');
  printRoot.className = 'print-all-pages';
  printRoot.setAttribute('aria-hidden', 'true');

  if (includeCover) {
    printRoot.appendChild(createPrintCover(notebook));
  }

  notebook.pages.forEach((page, pageIndex) => {
    const sheet = document.createElement('article');
    sheet.className = 'book-page-sheet print-page-sheet';
    renderSheetContent(sheet, JSON.parse(JSON.stringify(page)), pageIndex + 1, false);
    sheet.querySelectorAll('[contenteditable]').forEach(el => el.setAttribute('contenteditable', 'false'));
    sheet.querySelectorAll('input').forEach(input => input.setAttribute('readonly', 'readonly'));
    printRoot.appendChild(sheet);
  });

  const cleanup = () => {
    document.body.classList.remove('is-printing-all');
    printRoot.remove();
    window.removeEventListener('afterprint', cleanup);
  };

  document.body.appendChild(printRoot);
  document.body.classList.add('is-printing-all');
  window.addEventListener('afterprint', cleanup, { once: true });
  requestAnimationFrame(() => {
    window.print();
    setTimeout(cleanup, 1500);
  });
}
