/**
 * Reference Book Component (Study Split Mode)
 *
 * Embeds bilingual book reader from bilingual-app into the right page
 * of Notebook Studio, with independent page flipping, language toggle,
 * and 1-click Smart Quote insertion via window.postMessage.
 */

import { getState, persistState, scheduleSave } from '../state/store.js';
import { getEls } from '../utils/dom.js';
import { showToast } from './modal.js';
import { getActiveEditableArea } from '../editor/formatter.js';

let cachedBooks = null;
let isFetchingBooks = false;
let messageListenerAttached = false;

/**
 * Fetch books from Bilingual App via secure backend proxy
 */
export async function fetchBilingualBooks(forceRefresh = false) {
  if (cachedBooks && !forceRefresh) return cachedBooks;
  if (isFetchingBooks) return [];

  isFetchingBooks = true;
  try {
    const res = await fetch('/api/bilingual/books');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    cachedBooks = Array.isArray(data.books) ? data.books : (Array.isArray(data) ? data : []);
    return cachedBooks;
  } catch (err) {
    console.warn('[ReferenceBook] Failed to fetch books via backend proxy:', err.message);
    cachedBooks = null;
    throw err;
  } finally {
    isFetchingBooks = false;
  }
}

/**
 * Setup 2-way postMessage listener for quotes sent from Bilingual App
 */
export function setupReferenceBookQuoteListener() {
  if (messageListenerAttached) return;
  messageListenerAttached = true;

  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'NOTEBOOK_INSERT_QUOTE') {
      const { quote, title, url } = event.data;
      if (!quote) return;
      insertQuoteIntoActiveSheet(quote, title);
    }
  });
}

/**
 * Insert quoted text into the active editable on the note sheet
 */
export function insertQuoteIntoActiveSheet(quote, sourceTitle) {
  const state = getState();
  const isBookLeft = (state && state.studyLayout === 'book-left');
  const targetSheetSelector = isBookLeft ? '#rightPageSheet' : '#leftPageSheet';
  const targetSheet = document.querySelector(targetSheetSelector);

  const editable = (targetSheet && targetSheet.querySelector('.template-writing-area:focus'))
    || (targetSheet && targetSheet.querySelector('.template-writing-area'))
    || getActiveEditableArea(isBookLeft ? 'right' : 'left', 'study')
    || document.querySelector('.template-writing-area');
  if (!editable) return;

  editable.focus();
  const cleanQuote = String(quote).trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanTitle = (sourceTitle || 'Sách tham khảo').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const quoteHtml = `<blockquote class="notebook-smart-quote" style="border-left: 3px solid #3b82f6; margin: 10px 0; padding: 6px 14px; background: rgba(59, 130, 246, 0.08); font-style: italic; border-radius: 4px; line-height: 1.6;">“${cleanQuote}”<br><span style="font-size: 0.82em; color: #64748b; font-style: normal; display: inline-block; margin-top: 4px;">— ${cleanTitle}</span></blockquote><p><br></p>`;

  document.execCommand('insertHTML', false, quoteHtml);
  scheduleSave();
  showToast('✦ Đã trích dẫn vào trang ghi chép!');
}

/**
 * Render the Reference Book panel into the page sheet container
 */
export async function renderReferenceBookPanel(containerEl, activeNotebook) {
  if (!containerEl) return;
  setupReferenceBookQuoteListener();

  // Load saved preference from active notebook or defaults
  if (!activeNotebook.referenceBook) {
    activeNotebook.referenceBook = {
      slug: '',
      page: 1,
      lang: 'vi'
    };
  }
  const refState = activeNotebook.referenceBook;

  containerEl.innerHTML = `
    <div class="ref-book-panel">
      <div class="ref-book-header" id="refBookHeader">
        <div class="ref-book-selector-wrap">
          <select class="ref-book-dropdown" id="refBookDropdown" title="Chọn sách tham khảo">
            <option value="">Đang tải danh sách sách...</option>
          </select>
        </div>
        <div class="ref-book-tools">
          <div class="ref-font-toggle" title="Điều chỉnh cỡ chữ">
            <button type="button" class="ref-font-btn" id="refFontDec" title="Thu nhỏ chữ">A-</button>
            <button type="button" class="ref-font-btn" id="refFontInc" title="Phóng to chữ">A+</button>
          </div>
          <div class="ref-lang-toggle" title="Ngôn ngữ đọc">
            <button type="button" class="ref-lang-pill ${refState.lang === 'vi' ? 'active' : ''}" id="refLangVi" title="Tiếng Việt">VI</button>
            <button type="button" class="ref-lang-pill ${refState.lang === 'en' ? 'active' : ''}" id="refLangEn" title="Tiếng Anh">EN</button>
          </div>
          <div class="ref-nav-controls" title="Chuyển trang">
            <button type="button" class="ref-nav-btn" id="refPrevPage" title="Trang trước">‹</button>
            <span class="ref-page-display">
              <input type="number" id="refPageInput" class="ref-page-input" value="${refState.page || 1}" min="1" title="Nhập số trang" />
              <span id="refTotalPages">/ 1</span>
            </span>
            <button type="button" class="ref-nav-btn" id="refNextPage" title="Trang sau">›</button>
          </div>
          <button type="button" class="ref-icon-btn ref-swap-btn" id="refSwapBtn" title="Đổi vị trí (Sổ ⇆ Sách)">⇆</button>
          <a class="ref-icon-btn ref-external-link" id="refExternalLink" href="#" target="_blank" title="Mở trên tab riêng">↗</a>
        </div>
      </div>
      <div class="ref-book-body" id="refBookBody">
        <div class="ref-book-loading">
          <div class="ref-spinner"></div>
          <p>Đang kết nối Thư viện Bilingual App...</p>
        </div>
      </div>
    </div>
  `;

  const dropdown = containerEl.querySelector('#refBookDropdown');
  const fontDecBtn = containerEl.querySelector('#refFontDec');
  const fontIncBtn = containerEl.querySelector('#refFontInc');
  const prevBtn = containerEl.querySelector('#refPrevPage');
  const nextBtn = containerEl.querySelector('#refNextPage');
  const pageInput = containerEl.querySelector('#refPageInput');
  const totalPagesSpan = containerEl.querySelector('#refTotalPages');
  const langViBtn = containerEl.querySelector('#refLangVi');
  const langEnBtn = containerEl.querySelector('#refLangEn');
  const externalLink = containerEl.querySelector('#refExternalLink');
  const bodyEl = containerEl.querySelector('#refBookBody');

  let books = [];
  try {
    books = await fetchBilingualBooks();
  } catch (err) {
    bodyEl.innerHTML = `
      <div class="ref-book-error">
        <div class="ref-error-icon">📚</div>
        <h3>Chưa kết nối Thư viện Bilingual App</h3>
        <p>Vui lòng đảm bảo máy chủ <strong>Bilingual App</strong> đang chạy trên cổng <strong>27099</strong>.</p>
        <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; display: inline-block; margin: 8px 0; font-size: 12px;">python3 server.py</code>
        <br>
        <button type="button" class="ref-retry-btn" id="refRetryBtn">🔄 Thử kết nối lại</button>
      </div>
    `;
    const retryBtn = bodyEl.querySelector('#refRetryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        renderReferenceBookPanel(containerEl, activeNotebook);
      });
    }
    return;
  }

  if (!books || books.length === 0) {
    bodyEl.innerHTML = `
      <div class="ref-book-empty">
        <div class="ref-error-icon">📭</div>
        <p>Thư viện chưa có cuốn sách nào. Hãy tải sách lên Bilingual App trước.</p>
      </div>
    `;
    return;
  }

  // Populate books dropdown
  dropdown.innerHTML = books.map(b => `
    <option value="${escapeHTML(b.slug)}" ${b.slug === refState.slug ? 'selected' : ''}>
      ${escapeHTML(b.title)} (${b.pageCount || '?'} trang)
    </option>
  `).join('');

  // If no saved slug or invalid slug, default to first book
  let currentBook = books.find(b => b.slug === refState.slug);
  if (!currentBook) {
    currentBook = books[0];
    refState.slug = currentBook.slug;
    refState.page = 1;
    persistState();
  }

  const updateBookFrame = () => {
    const book = books.find(b => b.slug === refState.slug) || books[0];
    const total = book.pageCount || 1;
    let page = parseInt(refState.page, 10) || 1;
    if (page < 1) page = 1;
    if (page > total) page = total;
    refState.page = page;

    totalPagesSpan.textContent = `/ ${total}`;
    pageInput.value = page;
    pageInput.max = total;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= total;

    langViBtn.classList.toggle('active', refState.lang === 'vi');
    langEnBtn.classList.toggle('active', refState.lang === 'en');

    const pageUrl = `/api/bilingual/books/${encodeURIComponent(book.slug)}/page/${refState.lang}/${page}`;
    externalLink.href = pageUrl;

    bodyEl.innerHTML = `
      <iframe
        class="ref-book-iframe"
        src="${pageUrl}"
        title="${escapeHTML(book.title)} — Trang ${page}"
        sandbox="allow-same-origin allow-scripts allow-forms"
      ></iframe>
    `;

    const iframe = bodyEl.querySelector('.ref-book-iframe');
    if (iframe) {
      iframe.addEventListener('load', () => {
        applyFontSizeToIframe(currentBookFontSize);
      });
    }

    persistState();
  };

  let currentBookFontSize = parseFloat(localStorage.getItem('nb_ref_font_size') || '15');

  const applyFontSizeToIframe = (size) => {
    currentBookFontSize = Math.max(12, Math.min(26, size));
    localStorage.setItem('nb_ref_font_size', String(currentBookFontSize));
    const iframe = containerEl.querySelector('.ref-book-iframe');
    if (iframe && iframe.contentDocument) {
      try {
        let styleEl = iframe.contentDocument.getElementById('nb-dynamic-font-size');
        if (!styleEl) {
          styleEl = iframe.contentDocument.createElement('style');
          styleEl.id = 'nb-dynamic-font-size';
          iframe.contentDocument.head.appendChild(styleEl);
        }
        styleEl.textContent = `
          .sheet-flow.prose-page p { font-size: ${currentBookFontSize}px !important; line-height: 1.7 !important; }
        `;
      } catch (e) {}
    }
  };

  if (fontDecBtn) {
    fontDecBtn.addEventListener('click', () => {
      applyFontSizeToIframe(currentBookFontSize - 1.5);
    });
  }
  if (fontIncBtn) {
    fontIncBtn.addEventListener('click', () => {
      applyFontSizeToIframe(currentBookFontSize + 1.5);
    });
  }

  dropdown.addEventListener('change', (e) => {
    refState.slug = e.target.value;
    refState.page = 1;
    updateBookFrame();
  });

  prevBtn.addEventListener('click', () => {
    if (refState.page > 1) {
      refState.page--;
      updateBookFrame();
    }
  });

  nextBtn.addEventListener('click', () => {
    const book = books.find(b => b.slug === refState.slug);
    if (book && refState.page < (book.pageCount || 1)) {
      refState.page++;
      updateBookFrame();
    }
  });

  pageInput.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      refState.page = val;
      updateBookFrame();
    }
  });

  langViBtn.addEventListener('click', () => {
    refState.lang = 'vi';
    updateBookFrame();
  });

  langEnBtn.addEventListener('click', () => {
    refState.lang = 'en';
    updateBookFrame();
  });

  const swapBtn = containerEl.querySelector('#refSwapBtn');
  if (swapBtn) {
    swapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('notebook:toggle-study-layout'));
    });
  }

  // Initial load
  updateBookFrame();
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
