/**
 * Editor Formatting Toolbar Component
 *
 * Manages text styling actions, color & background pickers,
 * font selectors, line height settings, and collapse/expand state.
 */

import { getState, setState, persistState, getActiveNotebook } from '../state/store.js';
import { getEls } from '../utils/dom.js';
import {
  applyFormattingToActiveTarget,
  saveCurrentSelection,
  applyFontFamilyToSelection,
  applyFontFamily,
  updateFontSize,
  setLineHeight,
  getActiveEditableArea
} from '../editor/formatter.js';
import { showToast } from './modal.js';
import { handleFitPage } from './reader.js';
import { printFullNotebook, exportPdfFromServer } from '../export/pdf-exporter.js';
import { compressAndProcessImageFile, insertImageCardIntoEditable } from '../editor/image-manager.js';
import { renderEmojiPickerContent } from '../editor/emoji-picker.js';

export function applyToolbarCollapse(collapsed, save = true) {
  const els = getEls();
  setState({ toolbarCollapsed: Boolean(collapsed) });
  if (els.editorToolbar) {
    els.editorToolbar.classList.toggle('is-collapsed', Boolean(collapsed));
  }
  if (els.btnToggleFormatToolbar) {
    els.btnToggleFormatToolbar.setAttribute('aria-pressed', String(!collapsed));
    els.btnToggleFormatToolbar.setAttribute('title', collapsed ? 'Hiện thanh định dạng (Ctrl+\\)' : 'Thu gọn thanh định dạng (Ctrl+\\)');
    els.btnToggleFormatToolbar.classList.toggle('is-active', !collapsed);
  }
  if (save) persistState();
  if (els.btnFitPage && els.btnFitPage.classList.contains('active')) {
    setTimeout(handleFitPage, 240);
  }
}

export function openPopoverMenu(menuEl, otherMenuEls = []) {
  otherMenuEls.forEach(other => {
    if (other) {
      other.setAttribute('hidden', '');
      other.hidden = true;
      other.classList.remove('is-open');
    }
  });
  if (!menuEl) return;
  const isCurrentlyOpen = menuEl.classList.contains('is-open') && !menuEl.hidden && !menuEl.hasAttribute('hidden');
  if (isCurrentlyOpen) {
    menuEl.setAttribute('hidden', '');
    menuEl.hidden = true;
    menuEl.classList.remove('is-open');
  } else {
    menuEl.removeAttribute('hidden');
    menuEl.hidden = false;
    menuEl.classList.add('is-open');
  }
}

export function closeAllPopoverMenus() {
  const els = getEls();
  [els.fmtColorPalette, els.fmtBgPalette, els.lineHeightMenu, els.pdfExportMenu, els.toolbarMoreMenu, els.emojiPickerPopover].forEach(m => {
    if (m) {
      m.setAttribute('hidden', '');
      m.hidden = true;
      m.classList.remove('is-open');
    }
  });
  if (els.exportPrintBtn) els.exportPrintBtn.setAttribute('aria-expanded', 'false');
  if (els.btnToolbarMore) els.btnToolbarMore.setAttribute('aria-expanded', 'false');
  if (els.fmtInsertEmoji) els.fmtInsertEmoji.setAttribute('aria-expanded', 'false');
}

export function setupToolbarListeners() {
  const els = getEls();

  // Prevent losing selection on clicking formatting buttons
  document.querySelectorAll('.editor-toolbar .tool-btn, .editor-toolbar .tool-badge-btn, .editor-toolbar .color-swatch, .editor-toolbar .export-menu, .toolbar-more-menu .tool-menu-item').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      saveCurrentSelection();
    });
  });

  // Formatting actions — with active state update after each click
  const fmtClick = (el, type) => {
    if (!el) return;
    el.addEventListener('click', () => {
      applyFormattingToActiveTarget(type);
      updateToolbarActiveStates();
    });
  };
  fmtClick(els.fmtBold, 'bold');
  fmtClick(els.fmtItalic, 'italic');
  fmtClick(els.fmtUnderline, 'underline');
  fmtClick(els.fmtStrike, 'strike');
  if (els.fmtBadgeBtn) els.fmtBadgeBtn.addEventListener('click', () => applyFormattingToActiveTarget('badge'));
  if (els.fmtClear) els.fmtClear.addEventListener('click', () => { applyFormattingToActiveTarget('clear'); updateToolbarActiveStates(); });

  if (els.fmtH1) els.fmtH1.addEventListener('click', () => applyFormattingToActiveTarget('h1'));
  if (els.fmtH2) els.fmtH2.addEventListener('click', () => applyFormattingToActiveTarget('h2'));
  if (els.fmtH3) els.fmtH3.addEventListener('click', () => applyFormattingToActiveTarget('h3'));
  if (els.fmtBullet) els.fmtBullet.addEventListener('click', () => applyFormattingToActiveTarget('bullet'));
  if (els.fmtNumber) els.fmtNumber.addEventListener('click', () => applyFormattingToActiveTarget('number'));
  if (els.fmtTodo) els.fmtTodo.addEventListener('click', () => applyFormattingToActiveTarget('todo'));
  if (els.fmtQuote) els.fmtQuote.addEventListener('click', () => applyFormattingToActiveTarget('quote'));
  if (els.fmtCode) els.fmtCode.addEventListener('click', () => applyFormattingToActiveTarget('code'));
  if (els.fmtHr) els.fmtHr.addEventListener('click', () => applyFormattingToActiveTarget('hr'));
  if (els.fmtUndo) els.fmtUndo.addEventListener('click', () => applyFormattingToActiveTarget('undo'));
  if (els.fmtRedo) els.fmtRedo.addEventListener('click', () => applyFormattingToActiveTarget('redo'));

  // Insert Image from file
  if (els.fmtInsertImage && els.imageFileInput) {
    els.fmtInsertImage.addEventListener('click', () => {
      saveCurrentSelection();
      els.imageFileInput.click();
    });

    els.imageFileInput.addEventListener('change', async () => {
      const file = els.imageFileInput.files && els.imageFileInput.files[0];
      if (file) {
        const editable = getActiveEditableArea();
        if (editable) {
          try {
            showToast('Đang đính kèm hình ảnh... ⏳', 'info');
            const dataUrl = await compressAndProcessImageFile(file);
            insertImageCardIntoEditable(editable, dataUrl, file.name);
            showToast('Đã chèn ảnh vào trang! 🖼️', 'success');
          } catch (err) {
            console.error('Lỗi chèn ảnh:', err);
            showToast('Không thể chèn ảnh: ' + err.message, 'error');
          }
        } else {
          showToast('Vui lòng nhấp vào trang viết trước khi chèn ảnh', 'info');
        }
        els.imageFileInput.value = '';
      }
    });
  }

  // Insert Emoji Popover
  if (els.fmtInsertEmoji && els.emojiPickerPopover) {
    els.fmtInsertEmoji.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      saveCurrentSelection();
      const willOpen = els.emojiPickerPopover.hidden;
      openPopoverMenu(els.emojiPickerPopover, [els.fmtColorPalette, els.fmtBgPalette, els.lineHeightMenu, els.pdfExportMenu, els.toolbarMoreMenu]);
      if (willOpen) {
        renderEmojiPickerContent(els.emojiPickerPopover);
        els.fmtInsertEmoji.setAttribute('aria-expanded', 'true');
      } else {
        els.fmtInsertEmoji.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Color picker popover
  if (els.fmtColorBtn && els.fmtColorPalette) {
    els.fmtColorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPopoverMenu(els.fmtColorPalette, [els.fmtBgPalette, els.pdfExportMenu, els.toolbarMoreMenu, els.lineHeightMenu]);
    });

    els.fmtColorPalette.querySelectorAll('.color-swatch').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const color = btn.dataset.color || '';
        if (els.currentColorBar) {
          els.currentColorBar.style.backgroundColor = color || 'currentColor';
        }
        applyFormattingToActiveTarget('color', color);
        closeAllPopoverMenus();
      });
    });
  }

  // Background highlight popover
  if (els.fmtBgBtn && els.fmtBgPalette) {
    els.fmtBgBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPopoverMenu(els.fmtBgPalette, [els.fmtColorPalette, els.pdfExportMenu, els.toolbarMoreMenu, els.lineHeightMenu]);
    });

    els.fmtBgPalette.querySelectorAll('.color-swatch').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const bg = btn.dataset.bg || '';
        if (els.currentBgBar) {
          els.currentBgBar.style.backgroundColor = bg || '#fef08a';
        }
        applyFormattingToActiveTarget('bg', bg);
        closeAllPopoverMenus();
      });
    });
  }

  // Font family selector — per-selection, not global
  if (els.fmtFontFamily) {
    els.fmtFontFamily.addEventListener('change', (e) => {
      const chosen = e.target.value;
      const editable = getActiveEditableArea();
      if (editable) {
        applyFontFamilyToSelection(editable, chosen);
      }
    });
  }

  // Font size buttons
  if (els.fontIncreaseBtn) els.fontIncreaseBtn.addEventListener('click', () => updateFontSize(1));
  if (els.fontDecreaseBtn) els.fontDecreaseBtn.addEventListener('click', () => updateFontSize(-1));
  if (els.fontResetBtn) els.fontResetBtn.addEventListener('click', () => updateFontSize(0, true));

  // Line height menu
  if (els.btnLineHeightSettings && els.lineHeightMenu) {
    els.btnLineHeightSettings.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPopoverMenu(els.lineHeightMenu, [els.fmtColorPalette, els.fmtBgPalette, els.pdfExportMenu, els.toolbarMoreMenu]);
    });

    els.lineHeightMenu.querySelectorAll('.line-height-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lh = btn.dataset.lh;
        setLineHeight(lh);
        closeAllPopoverMenus();
      });
    });
  }

  // PDF Export popover
  if (els.exportPrintBtn && els.pdfExportMenu) {
    els.exportPrintBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPopoverMenu(els.pdfExportMenu, [els.fmtColorPalette, els.fmtBgPalette, els.lineHeightMenu, els.toolbarMoreMenu]);
      els.exportPrintBtn.setAttribute('aria-expanded', String(!els.pdfExportMenu.hidden));
    });
    if (els.exportPdfWithCoverBtn) {
      els.exportPdfWithCoverBtn.addEventListener('click', () => {
        closeAllPopoverMenus();
        exportPdfFromServer(true);
      });
    }
    if (els.exportPdfContentOnlyBtn) {
      els.exportPdfContentOnlyBtn.addEventListener('click', () => {
        closeAllPopoverMenus();
        exportPdfFromServer(false);
      });
    }
  }

  // Toolbar More Menu
  if (els.btnToolbarMore && els.toolbarMoreMenu) {
    els.btnToolbarMore.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPopoverMenu(els.toolbarMoreMenu, [els.fmtColorPalette, els.fmtBgPalette, els.pdfExportMenu, els.lineHeightMenu]);
      els.btnToolbarMore.setAttribute('aria-expanded', String(els.toolbarMoreMenu.classList.contains('is-open')));
    });

    els.toolbarMoreMenu.querySelectorAll('.tool-menu-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.id;
        if (id === 'fmt-h1') applyFormattingToActiveTarget('h1');
        else if (id === 'fmt-h2') applyFormattingToActiveTarget('h2');
        else if (id === 'fmt-h3') applyFormattingToActiveTarget('h3');
        else if (id === 'fmt-bullet') applyFormattingToActiveTarget('bullet');
        else if (id === 'fmt-number') applyFormattingToActiveTarget('number');
        else if (id === 'fmt-todo') applyFormattingToActiveTarget('todo');
        else if (id === 'fmt-quote') applyFormattingToActiveTarget('quote');
        else if (id === 'fmt-code') applyFormattingToActiveTarget('code');
        else if (id === 'fmt-hr') applyFormattingToActiveTarget('hr');
        else if (id === 'fmt-clear') applyFormattingToActiveTarget('clear');
        else if (id === 'btnAiSettings') {
          window.dispatchEvent(new CustomEvent('ai:open-settings'));
        }
        closeAllPopoverMenus();
      });
    });
  }

  // Toggle Format Toolbar button in header
  if (els.btnToggleFormatToolbar) {
    els.btnToggleFormatToolbar.addEventListener('click', () => {
      const state = getState();
      applyToolbarCollapse(!state.toolbarCollapsed, true);
    });
  }

  // Quick collapse button on toolbar
  if (els.btnCollapseToolbar) {
    els.btnCollapseToolbar.addEventListener('click', () => {
      applyToolbarCollapse(true, true);
    });
  }

  // Close menus on clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.export-wrapper') && !e.target.closest('.toolbar-more-wrapper')) {
      closeAllPopoverMenus();
    }
  });

  // ─── Active State Tracking ───
  // Update toolbar button states when the text cursor or selection changes
  document.addEventListener('selectionchange', () => {
    const act = document.activeElement;
    if (act && act.classList && act.classList.contains('template-writing-area')) {
      updateToolbarActiveStates();
    }
  });
}

// ─── Toolbar Active State Detection ───

function rgbToHex(rgb) {
  if (!rgb || rgb === 'transparent' || rgb === 'inherit') return null;
  const m = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (!m) return rgb;
  return `#${((1 << 24) + (parseInt(m[1]) << 16) + (parseInt(m[2]) << 8) + parseInt(m[3])).toString(16).slice(1)}`;
}

function updateToolbarActiveStates() {
  const els = getEls();

  // Bold / Italic / Underline / Strikethrough
  const stateMap = [
    [els.fmtBold, 'bold'],
    [els.fmtItalic, 'italic'],
    [els.fmtUnderline, 'underline'],
    [els.fmtStrike, 'strikeThrough'],
  ];
  for (const [btn, cmd] of stateMap) {
    if (!btn) continue;
    try {
      btn.classList.toggle('is-active', document.queryCommandState(cmd));
    } catch (e) { /* ignore */ }
  }

  // Text color indicator bar
  if (els.currentColorBar) {
    try {
      const val = document.queryCommandValue('foreColor');
      const hex = rgbToHex(val);
      if (hex) els.currentColorBar.style.backgroundColor = hex;
    } catch (e) { /* ignore */ }
  }

  // Background highlight indicator bar
  if (els.currentBgBar) {
    try {
      const val = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor');
      const hex = rgbToHex(val);
      if (hex && hex !== '#000000' && val !== 'transparent') {
        els.currentBgBar.style.backgroundColor = hex;
      }
    } catch (e) { /* ignore */ }
  }
}
