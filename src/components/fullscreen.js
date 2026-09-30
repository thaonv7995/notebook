/**
 * Fullscreen Mode & Left Rail Controller
 *
 * Implements distaction-free writing mode, left control rail,
 * single-page indicator, and floating quick tools drawer.
 */

import { getState, getActiveNotebook } from '../state/store.js';
import { getEls } from '../utils/dom.js';
import { getCurrentPageMode, getFocusedPageSide, handleFitPage, handleFitWidth } from './reader.js';
import { applyFormattingToActiveTarget, updateFontSize, setLineHeight } from '../editor/formatter.js';
import { showPromptModal } from './modal.js';

export function isFullscreenActive() {
  const els = getEls();
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    (els.notebookView && els.notebookView.classList.contains('is-fullscreen'))
  );
}

export function updateFullscreenRailControls() {
  const nb = getActiveNotebook();
  const els = getEls();
  if (!nb || !els.fullscreenRail) return;
  const totalPages = nb.pages.length;
  const state = getState();
  const curIdx = state.activePageIndex;
  const currentPageMode = getCurrentPageMode();
  const focusedPageSide = getFocusedPageSide();
  const step = currentPageMode === '2-page' ? 2 : 1;

  const activePageNum = (currentPageMode === '2-page' && focusedPageSide === 'right' && nb.pages[curIdx + 1])
    ? curIdx + 2
    : curIdx + 1;

  if (els.fsPageCur) {
    els.fsPageCur.textContent = `${activePageNum}`;
  } else if (els.fullscreenPageIndicator) {
    els.fullscreenPageIndicator.textContent = `${activePageNum}`;
  }
  if (els.fsPageTotal) {
    els.fsPageTotal.textContent = `${totalPages}`;
  }

  if (els.fullscreenPageIndicator) {
    els.fullscreenPageIndicator.setAttribute(
      'title',
      `Trang ${activePageNum} / ${totalPages} • Bấm để nhập số trang`
    );
  }

  if (els.btnFullscreenPrev) {
    els.btnFullscreenPrev.disabled = curIdx <= 0;
  }
  if (els.btnFullscreenNext) {
    els.btnFullscreenNext.disabled = curIdx + step >= totalPages;
  }

  if (els.btnFullscreenMode1Page) {
    els.btnFullscreenMode1Page.classList.toggle('is-active', currentPageMode === '1-page');
  }
  if (els.btnFullscreenMode2Pages) {
    els.btnFullscreenMode2Pages.classList.toggle('is-active', currentPageMode === '2-page');
  }

  if (els.fullscreenScaleValue) {
    els.fullscreenScaleValue.textContent = `${Math.round((state.zoomLevel || 1.0) * 100)}%`;
  }

  const isFitPageActive = Boolean(els.btnFitPage && els.btnFitPage.classList.contains('active'));
  const isFitWidthActive = Boolean(els.btnFitWidth && els.btnFitWidth.classList.contains('active'));
  if (els.btnFullscreenFitPage) {
    els.btnFullscreenFitPage.classList.toggle('is-active', isFitPageActive);
  }
  if (els.btnFullscreenFitWidth) {
    els.btnFullscreenFitWidth.classList.toggle('is-active', isFitWidthActive);
  }

  const activeSheetPage = (currentPageMode === '2-page' && focusedPageSide === 'right' && nb.pages[curIdx + 1])
    ? nb.pages[curIdx + 1]
    : nb.pages[curIdx];
  const curTemplate = (activeSheetPage && activeSheetPage.template) || 'cornell';

  if (els.btnFsTplCornell) {
    els.btnFsTplCornell.classList.toggle('is-active', curTemplate === 'cornell');
  }
  if (els.btnFsTplWork) {
    els.btnFsTplWork.classList.toggle('is-active', curTemplate === 'work');
  }
  if (els.btnFsTplNormal) {
    els.btnFsTplNormal.classList.toggle('is-active', curTemplate === 'ruled');
  }

  document.querySelectorAll('.fs-tpl-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.template === curTemplate);
  });

  const curTone = state.paperTone || 'cream';
  document.querySelectorAll('.fs-tone-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tone === curTone);
  });
}

export function updateFullscreenUI(isFs) {
  const els = getEls();
  if (els.notebookView) {
    els.notebookView.classList.toggle('is-fullscreen', isFs);
  }
  document.body.classList.toggle('is-fullscreen', isFs);

  if (els.btnToggleFullscreen) {
    els.btnToggleFullscreen.setAttribute('aria-pressed', String(isFs));
    els.btnToggleFullscreen.setAttribute('title', isFs ? 'Thoát toàn màn hình (Esc)' : 'Toàn màn hình (F11)');
    els.btnToggleFullscreen.classList.toggle('is-active', isFs);
  }

  if (els.fullscreenRail) {
    els.fullscreenRail.hidden = !isFs;
  }

  if (!isFs) {
    closeFullscreenToolsPanel();
  }

  updateFullscreenRailControls();

  if (els.btnFitPage && els.btnFitPage.classList.contains('active')) {
    setTimeout(handleFitPage, 220);
  } else if (els.btnFitWidth && els.btnFitWidth.classList.contains('active')) {
    setTimeout(handleFitWidth, 220);
  }
}

export function enterFullscreen() {
  const elem = document.documentElement;
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => console.warn('Browser requestFullscreen prevented:', err));
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    }
  } catch (err) {
    console.warn('requestFullscreen error:', err);
  }
  updateFullscreenUI(true);
}

export function exitFullscreen() {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn('exitFullscreen prevented:', err));
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  } catch (err) {
    console.warn('exitFullscreen error:', err);
  }
  updateFullscreenUI(false);
}

export function toggleFullscreen() {
  if (isFullscreenActive()) {
    exitFullscreen();
  } else {
    enterFullscreen();
  }
}

export function openFullscreenToolsPanel() {
  const els = getEls();
  if (!els.fullscreenToolsPanel) return;
  els.fullscreenToolsPanel.hidden = false;
  els.fullscreenToolsPanel.classList.add('is-open');
  if (els.btnFullscreenChrome) {
    els.btnFullscreenChrome.classList.add('is-active');
    els.btnFullscreenChrome.setAttribute('aria-pressed', 'true');
  }
}

export function closeFullscreenToolsPanel() {
  const els = getEls();
  if (!els.fullscreenToolsPanel) return;
  els.fullscreenToolsPanel.classList.remove('is-open');
  els.fullscreenToolsPanel.hidden = true;
  if (els.btnFullscreenChrome) {
    els.btnFullscreenChrome.classList.remove('is-active');
    els.btnFullscreenChrome.setAttribute('aria-pressed', 'false');
  }
}

export function toggleFullscreenToolsPanel() {
  const els = getEls();
  if (!els.fullscreenToolsPanel) return;
  if (els.fullscreenToolsPanel.hidden || !els.fullscreenToolsPanel.classList.contains('is-open')) {
    openFullscreenToolsPanel();
  } else {
    closeFullscreenToolsPanel();
  }
}

export function setupFullscreenListeners({
  onTurnBackward,
  onTurnForward,
  onAddPage,
  onJumpToPage,
  onPageModeChange,
  onChangeTemplate,
  onChangeTone,
  onTogglePageDrawer,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitPage,
  onFitWidth
} = {}) {
  const els = getEls();

  if (els.btnToggleFullscreen) els.btnToggleFullscreen.addEventListener('click', toggleFullscreen);
  if (els.btnFullscreenExit) els.btnFullscreenExit.addEventListener('click', exitFullscreen);
  if (els.btnFullscreenChrome) els.btnFullscreenChrome.addEventListener('click', toggleFullscreenToolsPanel);
  if (els.fsRailBtnPageList) {
    els.fsRailBtnPageList.addEventListener('click', () => {
      if (onTogglePageDrawer) onTogglePageDrawer();
    });
  }
  if (els.btnCloseFsPanel) els.btnCloseFsPanel.addEventListener('click', closeFullscreenToolsPanel);
  if (els.btnFullscreenPrev) els.btnFullscreenPrev.addEventListener('click', () => onTurnBackward && onTurnBackward());
  if (els.btnFullscreenNext) els.btnFullscreenNext.addEventListener('click', () => onTurnForward && onTurnForward());
  if (els.btnFullscreenAddPage) els.btnFullscreenAddPage.addEventListener('click', () => onAddPage && onAddPage());

  if (els.fullscreenPageIndicator) {
    const promptJump = async () => {
      const nb = getActiveNotebook();
      if (!nb) return;
      const total = nb.pages.length;
      const state = getState();
      const curIdx = state.activePageIndex;
      const currentPageMode = getCurrentPageMode();
      const focusedPageSide = getFocusedPageSide();
      const currentNum = (currentPageMode === '2-page' && focusedPageSide === 'right' && nb.pages[curIdx + 1])
        ? curIdx + 2
        : curIdx + 1;
      const input = await showPromptModal('Chuyển đến trang', `Nhập số trang (1 - ${total}):`, `${currentNum}`);
      if (!input) return;
      const page = parseInt(input.trim(), 10);
      if (Number.isFinite(page) && page >= 1 && page <= total && onJumpToPage) {
        onJumpToPage(page);
      }
    };
    els.fullscreenPageIndicator.addEventListener('click', promptJump);
    els.fullscreenPageIndicator.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        promptJump();
      }
    });
  }

  if (els.btnFullscreenMode1Page) {
    els.btnFullscreenMode1Page.addEventListener('click', () => {
      if (onPageModeChange) onPageModeChange('1-page');
      updateFullscreenRailControls();
    });
  }
  if (els.btnFullscreenMode2Pages) {
    els.btnFullscreenMode2Pages.addEventListener('click', () => {
      if (onPageModeChange) onPageModeChange('2-page');
      updateFullscreenRailControls();
    });
  }

  if (els.btnFsTplCornell) {
    els.btnFsTplCornell.addEventListener('click', () => onChangeTemplate && onChangeTemplate('cornell'));
  }
  if (els.btnFsTplWork) {
    els.btnFsTplWork.addEventListener('click', () => onChangeTemplate && onChangeTemplate('work'));
  }
  if (els.btnFsTplNormal) {
    els.btnFsTplNormal.addEventListener('click', () => onChangeTemplate && onChangeTemplate('ruled'));
  }
  document.querySelectorAll('.fs-tpl-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      if (onChangeTemplate) onChangeTemplate(btn.dataset.template);
    });
  });

  document.querySelectorAll('.fs-tone-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      if (onChangeTone) onChangeTone(btn.dataset.tone);
    });
  });

  if (els.btnFullscreenZoomIn) {
    els.btnFullscreenZoomIn.addEventListener('click', () => {
      if (onZoomIn) onZoomIn();
      updateFullscreenRailControls();
    });
  }
  if (els.btnFullscreenZoomOut) {
    els.btnFullscreenZoomOut.addEventListener('click', () => {
      if (onZoomOut) onZoomOut();
      updateFullscreenRailControls();
    });
  }
  if (els.fullscreenScaleValue) {
    els.fullscreenScaleValue.addEventListener('click', () => {
      if (onResetZoom) onResetZoom();
      updateFullscreenRailControls();
    });
  }
  if (els.btnFullscreenFitPage) {
    els.btnFullscreenFitPage.addEventListener('click', () => {
      if (onFitPage) onFitPage();
      updateFullscreenRailControls();
    });
  }
  if (els.btnFullscreenFitWidth) {
    els.btnFullscreenFitWidth.addEventListener('click', () => {
      if (onFitWidth) onFitWidth();
      updateFullscreenRailControls();
    });
  }

  // Floating Tools formatting actions
  const fsUndo = document.querySelector('#fs-fmt-undo');
  if (fsUndo) fsUndo.addEventListener('click', () => applyFormattingToActiveTarget('undo'));
  const fsRedo = document.querySelector('#fs-fmt-redo');
  if (fsRedo) fsRedo.addEventListener('click', () => applyFormattingToActiveTarget('redo'));
  const fsFontDec = document.querySelector('#fs-font-decrease');
  if (fsFontDec) fsFontDec.addEventListener('click', () => updateFontSize(-1));
  const fsFontInc = document.querySelector('#fs-font-increase');
  if (fsFontInc) fsFontInc.addEventListener('click', () => updateFontSize(1));

  const fsBold = document.querySelector('#fs-fmt-bold');
  if (fsBold) fsBold.addEventListener('click', () => applyFormattingToActiveTarget('bold'));
  const fsItalic = document.querySelector('#fs-fmt-italic');
  if (fsItalic) fsItalic.addEventListener('click', () => applyFormattingToActiveTarget('italic'));
  const fsUnderline = document.querySelector('#fs-fmt-underline');
  if (fsUnderline) fsUnderline.addEventListener('click', () => applyFormattingToActiveTarget('underline'));
  const fsStrike = document.querySelector('#fs-fmt-strike');
  if (fsStrike) fsStrike.addEventListener('click', () => applyFormattingToActiveTarget('strike'));

  document.querySelectorAll('.fs-color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color || '';
      if (els.currentColorBar) {
        els.currentColorBar.style.backgroundColor = color || 'currentColor';
      }
      applyFormattingToActiveTarget('color', color);
    });
  });

  document.querySelectorAll('.fs-bg-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const bg = btn.dataset.bg || '';
      if (els.currentBgBar) {
        els.currentBgBar.style.backgroundColor = bg || '#fef08a';
      }
      applyFormattingToActiveTarget('bg', bg);
    });
  });

  const fsH1 = document.querySelector('#fs-fmt-h1');
  if (fsH1) fsH1.addEventListener('click', () => applyFormattingToActiveTarget('h1'));
  const fsH2 = document.querySelector('#fs-fmt-h2');
  if (fsH2) fsH2.addEventListener('click', () => applyFormattingToActiveTarget('h2'));
  const fsBullet = document.querySelector('#fs-fmt-bullet');
  if (fsBullet) fsBullet.addEventListener('click', () => applyFormattingToActiveTarget('bullet'));
  const fsTodo = document.querySelector('#fs-fmt-todo');
  if (fsTodo) fsTodo.addEventListener('click', () => applyFormattingToActiveTarget('todo'));
  const fsQuote = document.querySelector('#fs-fmt-quote');
  if (fsQuote) fsQuote.addEventListener('click', () => applyFormattingToActiveTarget('quote'));

  document.querySelectorAll('.fs-lh-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fs-lh-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setLineHeight(btn.dataset.lh);
    });
  });

  // Native Fullscreen Change Listeners
  document.addEventListener('fullscreenchange', () => {
    const isFs = Boolean(document.fullscreenElement);
    updateFullscreenUI(isFs);
  });
  document.addEventListener('webkitfullscreenchange', () => {
    const isFs = Boolean(document.webkitFullscreenElement);
    updateFullscreenUI(isFs);
  });
}

