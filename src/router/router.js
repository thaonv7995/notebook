/**
 * URL Routing & Deep-Linking Module
 *
 * Supports search query params (?book=...&page=...)
 * and hash routes (#/book/.../...) with browser Back/Forward navigation.
 */

import { getState, getActiveNotebook } from '../state/store.js';
import { showToast, showAlertModal } from '../components/modal.js';
import { openNotebook, returnToLibrary } from '../components/reader.js';

export const DEFAULT_APP_TITLE = 'Notebook Studio • Sổ Tay Thông Minh & Mẫu A4';

export function copyTextToClipboard(text, successMsg = 'Đã sao chép vào clipboard!') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(() => {
      fallbackCopyText(text, successMsg);
    });
  } else {
    fallbackCopyText(text, successMsg);
  }
}

function fallbackCopyText(text, successMsg) {
  const input = document.createElement('textarea');
  input.value = text;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.focus();
  input.select();
  try {
    document.execCommand('copy');
    showToast(successMsg);
  } catch (err) {
    showAlertModal('Sao chép liên kết', text);
  }
  document.body.removeChild(input);
}

export function copyCurrentBookUrl() {
  const nb = getActiveNotebook();
  const state = getState();
  const curPage = state.activePageIndex + 1;
  const url = new URL(window.location.href);
  if (nb) {
    url.searchParams.set('book', nb.id);
    url.searchParams.set('page', String(curPage));
  }
  copyTextToClipboard(url.toString(), `Đã sao chép deep-link trang ${curPage}; liên kết chỉ dùng trên thiết bị này.`);
}

export function parseRouteFromUrl() {
  // 1. Search query parameters (?book=...&page=...)
  try {
    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const bookId = params.get('book') || params.get('id') || params.get('notebook');
      if (bookId) {
        const rawPage = params.get('page') || params.get('p');
        const parsedPage = rawPage ? parseInt(rawPage, 10) : 1;
        const pageIndex = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage - 1 : 0;
        return { bookId: decodeURIComponent(bookId), pageIndex };
      }
    }
  } catch (e) {
    console.warn('[Router] Failed parsing search params:', e);
  }

  // 2. Hash routes (#/book/:id/:page)
  try {
    const hash = window.location.hash || '';
    if (hash) {
      if (hash.startsWith('#/book/') || hash.startsWith('#/notebook/')) {
        const cleanHash = hash.replace(/^#(?:(?:\/book\/)|(?:\/notebook\/))/, '');
        const parts = cleanHash.split('/');
        const bookId = decodeURIComponent(parts[0]);
        let pageIndex = 0;
        if (parts[1]) {
          if (parts[1] === 'page' && parts[2]) {
            const p = parseInt(parts[2], 10);
            if (!isNaN(p) && p > 0) pageIndex = p - 1;
          } else {
            const p = parseInt(parts[1], 10);
            if (!isNaN(p) && p > 0) pageIndex = p - 1;
          }
        }
        if (bookId) return { bookId, pageIndex };
      } else if (hash.includes('book=') || hash.includes('id=')) {
        const hashQuery = hash.replace(/^#\??/, '');
        const hashParams = new URLSearchParams(hashQuery);
        const bookId = hashParams.get('book') || hashParams.get('id') || hashParams.get('notebook');
        if (bookId) {
          const rawPage = hashParams.get('page') || hashParams.get('p');
          const parsedPage = rawPage ? parseInt(rawPage, 10) : 1;
          const pageIndex = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage - 1 : 0;
          return { bookId: decodeURIComponent(bookId), pageIndex };
        }
      }
    }
  } catch (e) {
    console.warn('[Router] Failed parsing hash route:', e);
  }

  return null;
}

export function updateUrl(route, replace = false) {
  const state = getState();
  try {
    const url = new URL(window.location.href);
    if (route && route.bookId) {
      url.searchParams.set('book', route.bookId);
      url.searchParams.set('page', String(route.pageIndex + 1));
      url.searchParams.delete('id');
      url.searchParams.delete('notebook');
      url.searchParams.delete('p');
      if (url.hash && (url.hash.startsWith('#/book') || url.hash.startsWith('#book='))) {
        url.hash = '';
      }
    } else {
      url.searchParams.delete('book');
      url.searchParams.delete('page');
      url.searchParams.delete('id');
      url.searchParams.delete('notebook');
      url.searchParams.delete('p');
      if (url.hash && (url.hash.startsWith('#/book') || url.hash.startsWith('#book='))) {
        url.hash = '';
      }
    }

    const newUrlString = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
    const currentRelative = window.location.pathname + window.location.search + window.location.hash;

    if (newUrlString !== currentRelative) {
      if (replace) {
        window.history.replaceState({ route }, '', newUrlString);
      } else {
        window.history.pushState({ route }, '', newUrlString);
      }
    }
  } catch (e) {
    try {
      if (route && route.bookId) {
        window.location.hash = `#/book/${encodeURIComponent(route.bookId)}/${route.pageIndex + 1}`;
      } else {
        if (window.location.hash && (window.location.hash.startsWith('#/book') || window.location.hash.startsWith('#book='))) {
          window.location.hash = '';
        }
      }
    } catch (err) {
      console.warn('[Router] Failed to sync URL hash:', err);
    }
  }

  // Dynamic document title update
  if (route && route.bookId) {
    const nb = (state.notebooks || []).find(n => n.id === route.bookId);
    if (nb) {
      document.title = `${nb.title} (Trang ${route.pageIndex + 1}) • Notebook Studio`;
    }
  } else {
    document.title = DEFAULT_APP_TITLE;
  }
}

let isHandlingPopState = false;

export function handleRouteFromUrl(skipHistory = true) {
  const route = parseRouteFromUrl();
  const state = getState();
  if (route && route.bookId) {
    const targetBook = (state.notebooks || []).find(n => n.id === route.bookId && !n.deletedAt);
    if (targetBook) {
      openNotebook(route.bookId, route.pageIndex, skipHistory);
      return true;
    } else {
      showToast('Không tìm thấy cuốn sổ hoặc sổ đã bị chuyển vào thùng rác.');
      updateUrl(null, true);
      return false;
    }
  }
  return false;
}

export function setupRouting() {
  window.addEventListener('popstate', () => {
    isHandlingPopState = true;
    try {
      const route = parseRouteFromUrl();
      const state = getState();
      if (route && route.bookId) {
        const targetBook = (state.notebooks || []).find(n => n.id === route.bookId && !n.deletedAt);
        if (targetBook) {
          openNotebook(route.bookId, route.pageIndex, true);
        } else {
          returnToLibrary(true);
        }
      } else {
        returnToLibrary(true);
      }
    } finally {
      isHandlingPopState = false;
    }
  });

  window.addEventListener('hashchange', () => {
    if (isHandlingPopState) return;
    const route = parseRouteFromUrl();
    const state = getState();
    if (route && route.bookId) {
      const targetBook = (state.notebooks || []).find(n => n.id === route.bookId && !n.deletedAt);
      if (targetBook) {
        openNotebook(route.bookId, route.pageIndex, true);
      } else {
        returnToLibrary(true);
      }
    } else if (!window.location.search.includes('book=')) {
      returnToLibrary(true);
    }
  });
}
