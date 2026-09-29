/**
 * NOTEBOOK STUDIO - DUAL-VIEW & AUTHENTIC BOOK EXPERIENCE
 * Mode 1: Digital Library (Matching Reference Screenshot 1)
 * Mode 2: Authentic Book Reader & Writer (Matching Reference Screenshot 2)
 * Features: 1-Page vs 2-Page mode, 3D Page Flip Animation, Template Formats, Strict Auto Line Wrap.
 */

import { createNotebookEditor } from './public/assets/js/editor-bundle.js';

(function () {
  'use strict';

  const STORAGE_KEY = 'thao_digital_notebooks_v7';
  const BACKUP_STORAGE_KEY = 'thao_digital_notebooks_v7_previous';
  const STATE_VERSION = 2;
  const SAVE_DEBOUNCE_MS = 600;

  // Initial Library Data (Featuring the 3 authentic A4 templates + reading books)
  const INITIAL_LIBRARY_DATA = {
    activeNotebookId: 'nb-cornell-study',
    activePageIndex: 0,
    pageMode: '2-page', // '1-page' or '2-page'
    zoomLevel: 1.0,
    fontSize: 16,
    fontFamily: 'sans',
    notebooks: [
      {
        id: 'nb-cornell-study',
        title: 'Cornell Notes • Study Journal',
        author: 'Notebook Studio',
        category: 'Học tập',
        lang: 'EN · VI',
        coverGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        coverTextColor: '#ffffff',
        pages: [
          {
            id: 'p-cornell-1',
            lang: 'VI',
            title: 'HỆ THỐNG PHÂN TÁN & SCALABILITY',
            topic: 'System Design: Scalability & Caching Strategy',
            date: '29/09/2026',
            no: '01',
            template: 'cornell',
            cues: '• Scalability (Ngang vs Dọc)\n• Caching Strategy (Cache-aside)\n• Cache Eviction (LRU/LFU)\n• SPOF & High Availability\n• Database Sharding Keys',
            notes: '1. Scale Ngang (Horizontal Scaling):\n   - Thêm server vào stateless tier qua Load Balancer (Round Robin, Least Connection).\n   - Tách biệt Web Tier và Data Tier để scale độc lập.\n\n2. Caching Tier (Redis / Memcached):\n   - Cache-Aside (Lazy Loading): Ứng dụng đọc cache trước, miss thì query DB rồi nạp vào cache.\n   - Write-Through: Ghi dữ liệu đồng thời vào cache và database để đảm bảo tính nhất quán.\n\n3. Cache Eviction Policy:\n   - LRU (Least Recently Used), LFU (Least Frequently Used), TTL (Time-To-Live).\n\n4. Xử lý Single Point of Failure (SPOF):\n   - Cấu hình Multi-AZ replication, tự động failover giữa Master-Slave.',
            summary: 'Hệ thống mở rộng quy mô lớn cần tầng web stateless, cache đa tầng (CDN + Redis) và database replication để đạt độ khả dụng cao (99.99% SLA).'
          },
          {
            id: 'p-cornell-2',
            lang: 'EN',
            title: 'DATA STRUCTURES: TREES & GRAPHS',
            topic: 'Data Structures & Algorithms: Graphs & Trees',
            date: '30/09/2026',
            no: '02',
            template: 'cornell',
            cues: '• DFS vs BFS Complexity\n• Dijkstra Algorithm\n• Balanced Binary Search Tree\n• Red-Black vs AVL Properties',
            notes: '1. Graph Traversals:\n   - BFS uses a Queue, finding shortest path in unweighted graphs with O(V + E) complexity.\n   - DFS uses a Stack / recursion, ideal for topological sort and cycle detection.\n\n2. Shortest Path:\n   - Dijkstra algorithm uses Min-Heap (Priority Queue) with O((V + E) log V).\n\n3. Balanced BST:\n   - AVL enforces strict height balance (diff <= 1), faster lookups.\n   - Red-Black trees require fewer rotations on insert/delete, ideal for standard libraries.',
            summary: 'Choosing the right graph traversal and tree balancing algorithm is essential for optimal network routing and hierarchical data querying.'
          }
        ]
      },
      {
        id: 'nb-work-project',
        title: 'Work & Project Log • Meeting Notes',
        author: 'Notebook Studio',
        category: 'Công việc',
        lang: 'EN · VI',
        coverGradient: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
        coverTextColor: '#ffffff',
        pages: [
          {
            id: 'p-work-1',
            lang: 'VI',
            title: 'KẾ HOẠCH PHÁT TRIỂN NOTEBOOK STUDIO',
            project: 'Notebook Studio: Redesign & Vector Templates',
            date: '29/09/2026',
            deadline: '02/10/2026',
            status: 'WIP',
            template: 'work',
            agenda: '1. Đánh giá giao diện và format trang A4\n2. Tích hợp mẫu Cornell, Work, Ruled\n3. Sửa lỗi ngắt dòng và tràn lề tự động\n4. Phê duyệt bản phát hành v5',
            discussions: '• Đã phân tích source HTML của 3 file PDF: Cornell_Notes_A4.pdf, Work_Notes_A4.pdf, Ruled_Notebook_A4.pdf.\n• Tất cả đường kẻ hairline vector 7.5mm được giữ nguyên độ nét tuyệt đối.\n• Tích hợp tương tác checkbox thời gian thực cho danh sách Action items.\n• Sửa triệt để lỗi tràn chữ theo chiều ngang bằng thuộc tính CSS word-break và auto-wrap.',
            actions: [
              { checked: true, text: 'Phân tích cấu trúc vector từ a4-study-templates.html' },
              { checked: true, text: 'Tích hợp 3 template vào hệ thống chuyển đổi trang' },
              { checked: false, text: 'Kiểm tra chế độ 1 trang & 2 trang song song' },
              { checked: false, text: 'Xác thực tính năng lưu trữ dữ liệu template vào localStorage' },
              { checked: false, text: 'Phát hành bản demo cho khách hàng nghiệm thu' }
            ]
          },
          {
            id: 'p-work-2',
            lang: 'EN',
            title: 'SPRINT 15 ARCHITECTURE REVIEW',
            project: 'Sprint 15 Planning & Microservices Architecture',
            date: '03/10/2026',
            deadline: '07/10/2026',
            status: 'TODO',
            template: 'work',
            agenda: '1. Backlog Refinement\n2. Story Points Estimation\n3. Database Migration Strategy',
            discussions: '• Discuss microservice decoupling for the checkout module.\n• Standardize Kafka event schemas across engineering teams.\n• Target 95% test coverage for core domain services.\n• Setup Prometheus alerts for API p99 latency spikes.',
            actions: [
              { checked: false, text: 'Draft architecture RFC document for Tech Lead review' },
              { checked: false, text: 'Set up staging database replica cluster' },
              { checked: false, text: 'Review security compliance with DevSecOps team' },
              { checked: false, text: 'Organize internal tech talk on distributed tracing' },
              { checked: false, text: 'Finalize Sprint 15 task assignments in Jira' }
            ]
          }
        ]
      },
      {
        id: 'nb-ruled-classic',
        title: 'Ruled Notebook • Sổ Kẻ Ngang A4',
        author: 'Notebook Studio',
        category: 'Ghi chép',
        lang: 'EN · VI',
        coverGradient: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)',
        coverTextColor: '#ffffff',
        pages: [
          {
            id: 'p-ruled-1',
            lang: 'VI',
            title: 'NHẬT KÝ CHIẾN LƯỢC SẢN PHẨM',
            topic: 'Nhật Ký Chiến Lược & Tư Duy Phát Triển Sản Phẩm',
            date: '29/09/2026',
            no: '01',
            template: 'ruled',
            content: `Một sản phẩm xuất sắc không chỉ nằm ở tính năng, mà nằm ở trải nghiệm cảm xúc mà nó mang lại cho người dùng.\n\nKhi người dùng mở một cuốn sổ số, họ phải cảm nhận được sự tỉ mỉ của từng nét gáy sách, độ mịn của mặt giấy ngà, và sự thanh lịch của những đường kẻ ngang vector.\n\nSự tĩnh lặng của không gian viết giúp tâm trí tập trung vào những suy nghĩ sâu sắc nhất. Không có sự xao nhãng của các thông báo hay giao diện lộn xộn.\n\nMỗi trang giấy là một không gian sáng tạo vô tận.`
          },
          {
            id: 'p-ruled-2',
            lang: 'EN',
            title: 'DAILY REFLECTIONS & IDEATION',
            topic: 'Product Ideation & Creative Reflections',
            date: '30/09/2026',
            no: '02',
            template: 'ruled',
            content: `True productivity is not about doing more things in less time, but about doing the right things with undivided attention.\n\nA digital notebook should feel as tactile and responsive as real paper, while empowering the author with instant search, auto-saving, and effortless page reorganization.\n\nSimplicity is the ultimate sophistication.`
          }
        ]
      },
      {
        id: 'nb-freeform-notes',
        title: 'Sổ Ghi Chú Tự Do • Freeform Notes',
        author: 'Thao NV',
        category: 'Ghi chép',
        lang: 'VN · EN',
        coverGradient: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
        coverTextColor: '#ffffff',
        pages: [
          {
            id: 'p-free-1',
            lang: 'VI',
            title: 'GHI CHÉP VĂN BẢN TỰ DO',
            template: 'ruled',
            content: '# GHI CHÉP TỰ DO\n\nTrang ghi chép tự do dành cho văn bản, tài liệu và các suy nghĩ cá nhân.\n\n- Hỗ trợ đầy đủ định dạng **Markdown**, danh sách gạch đầu dòng.\n- Đổi màu chữ, màu dạ quang và viền pill badge.\n- Tự động ngắt dòng và tự động lưu dữ liệu.'
          },
          {
            id: 'p-free-2',
            lang: 'EN',
            title: 'FREEFORM DIGITAL NOTES',
            template: 'ruled',
            content: '# DIGITAL NOTEBOOK\n\nYour digital notebook for freeform writing, documentation, and ideation.\n\n- Write freely with automatic line wrapping.\n- Seamless 1-Page and 2-Page open book spreads.'
          }
        ]
      }
    ]
  };

  // State
  let appState = loadState();
  let leftEditor = null;
  let rightEditor = null;
  let saveTimer = null;
  let isTurningPage = false;
  let searchQuery = '';
  let categoryFilter = 'all';
  let sortMode = 'recent';
  let isTrashView = false;
  let currentPageMode = appState.pageMode || '2-page';
  let wasCompactViewport = window.innerWidth <= 900;
  let lastActiveTextarea = null;
  let lastActiveEditable = null;
  let toastTimer = null;
  let selectedCoverGradient = 'linear-gradient(135deg, #dc2626, #991b1b)';

  // DOM Elements
  const els = {
    // Views
    libraryView: document.querySelector('#libraryView'),
    notebookView: document.querySelector('#notebookView'),

    // Library View
    libBrandLogo: document.querySelector('#libBrandLogo'),
    libSearchInput: document.querySelector('#libSearchInput'),
    libCategoryFilter: document.querySelector('#libCategoryFilter'),
    libSortSelect: document.querySelector('#libSortSelect'),
    btnOpenNewBookModal: document.querySelector('#btnOpenNewBookModal'),
    booksGrid: document.querySelector('#booksGrid'),
    libBookCount: document.querySelector('#libBookCount'),
    libSectionTitle: document.querySelector('.lib-section-title'),
    btnToggleTrash: document.querySelector('#btnToggleTrash'),
    trashButtonText: document.querySelector('#trashButtonText'),
    btnResetLibrary: document.querySelector('#btnResetLibrary'),

    // Reader View Top Header
    btnBackToLibrary: document.querySelector('#btnBackToLibrary'),
    openBookTitle: document.querySelector('#openBookTitle'),
    btnPrevPage: document.querySelector('#btnPrevPage'),
    btnNextPage: document.querySelector('#btnNextPage'),
    readerPageInput: document.querySelector('#readerPageInput'),
    readerTotalPages: document.querySelector('#readerTotalPages'),
    btnZoomOut: document.querySelector('#btnZoomOut'),
    btnZoomIn: document.querySelector('#btnZoomIn'),
    readerScaleValue: document.querySelector('#readerScaleValue'),
    btnFitPage: document.querySelector('#btnFitPage'),
    btnFitWidth: document.querySelector('#btnFitWidth'),
    btnMode1Page: document.querySelector('#btnMode1Page'),
    btnMode2Pages: document.querySelector('#btnMode2Pages'),
    readerTemplateSelect: document.querySelector('#readerTemplateSelect'),
    btnAddPage: document.querySelector('#btnAddPage'),
    saveStatus: document.querySelector('#save-status'),
    saveStatusText: document.querySelector('#save-status-text'),

    // Workspace & Spread
    openBookWorkspace: document.querySelector('#openBookWorkspace'),
    bookDeskScaler: document.querySelector('#bookDeskScaler'),
    bookSpreadCasing: document.querySelector('#bookSpreadCasing'),
    leftPageSheet: document.querySelector('#leftPageSheet'),
    rightPageSheet: document.querySelector('#rightPageSheet'),
    leftPageLangTag: document.querySelector('#leftPageLangTag'),
    rightPageLangTag: document.querySelector('#rightPageLangTag'),
    leftEditorContainer: document.querySelector('#leftEditorContainer'),
    rightEditorContainer: document.querySelector('#rightEditorContainer'),
    leftPageFooterTitle: document.querySelector('#leftPageFooterTitle'),
    rightPageFooterTitle: document.querySelector('#rightPageFooterTitle'),
    leftPageFooterNum: document.querySelector('#leftPageFooterNum'),
    rightPageFooterNum: document.querySelector('#rightPageFooterNum'),
    bookCenterSpine: document.querySelector('#bookCenterSpine'),

    // Formatting Toolbar
    fmtBold: document.querySelector('#fmt-bold'),
    fmtItalic: document.querySelector('#fmt-italic'),
    fmtUnderline: document.querySelector('#fmt-underline'),
    fmtStrike: document.querySelector('#fmt-strike'),
    fmtColorBtn: document.querySelector('#fmt-color-btn'),
    fmtColorPalette: document.querySelector('#fmt-color-palette'),
    currentColorBar: document.querySelector('#current-color-bar'),
    fmtBgBtn: document.querySelector('#fmt-bg-btn'),
    fmtBgPalette: document.querySelector('#fmt-bg-palette'),
    currentBgBar: document.querySelector('#current-bg-bar'),
    fmtBadgeBtn: document.querySelector('#fmt-badge-btn'),
    fmtClear: document.querySelector('#fmt-clear'),
    fmtH1: document.querySelector('#fmt-h1'),
    fmtH2: document.querySelector('#fmt-h2'),
    fmtH3: document.querySelector('#fmt-h3'),
    fmtBullet: document.querySelector('#fmt-bullet'),
    fmtNumber: document.querySelector('#fmt-number'),
    fmtTodo: document.querySelector('#fmt-todo'),
    fmtQuote: document.querySelector('#fmt-quote'),
    fmtCode: document.querySelector('#fmt-code'),
    fmtHr: document.querySelector('#fmt-hr'),
    fmtUndo: document.querySelector('#fmt-undo'),
    fmtRedo: document.querySelector('#fmt-redo'),
    fmtFontFamily: document.querySelector('#fmt-font-family'),
    fontDecreaseBtn: document.querySelector('#font-decrease'),
    fontIncreaseBtn: document.querySelector('#font-increase'),
    fontSizeLabel: document.querySelector('#font-size-label'),
    fontResetBtn: document.querySelector('#font-reset'),
    btnDeleteCurrentPage: document.querySelector('#btnDeleteCurrentPage'),
    btnRenameBook: document.querySelector('#btnRenameBook'),
    btnCopyBookLink: document.querySelector('#btnCopyBookLink'),
    exportBtn: document.querySelector('#export-btn'),
    exportMenu: document.querySelector('#export-menu'),
    exportMdBtn: document.querySelector('#export-md'),
    exportPrintBtn: document.querySelector('#export-print'),
    exportJsonBtn: document.querySelector('#export-json'),
    importJsonBtn: document.querySelector('#import-json'),
    fileInputJson: document.querySelector('#fileInputJson'),

    // Modal
    newNotebookModal: document.querySelector('#newNotebookModal'),
    btnCloseModal: document.querySelector('#btnCloseModal'),
    btnCancelModal: document.querySelector('#btnCancelModal'),
    btnConfirmNewNotebook: document.querySelector('#btnConfirmNewNotebook'),
    newNotebookTitle: document.querySelector('#newNotebookTitle'),
    newNotebookCategory: document.querySelector('#newNotebookCategory'),
    newNotebookTemplate: document.querySelector('#newNotebookTemplate'),

    // Feedback
    appToast: document.querySelector('#appToast'),
    appToastText: document.querySelector('#appToastText'),
    appToastAction: document.querySelector('#appToastAction')
  };

  // State Persistence
  function normalizeState(rawState) {
    const state = rawState && typeof rawState === 'object' ? rawState : {};
    state.version = STATE_VERSION;
    state.notebooks = Array.isArray(state.notebooks) ? state.notebooks : [];
    state.trash = Array.isArray(state.trash) ? state.trash : [];
    state.pageMode = state.pageMode === '1-page' ? '1-page' : '2-page';
    state.zoomLevel = Number.isFinite(state.zoomLevel) ? Math.max(0.3, Math.min(state.zoomLevel, 3.5)) : 1;
    state.fontSize = Number.isInteger(state.fontSize) && state.fontSize >= 10 && state.fontSize <= 200 ? state.fontSize : 16;
    state.fontFamily = typeof state.fontFamily === 'string' && state.fontFamily ? state.fontFamily : 'sans';

    [...state.notebooks, ...state.trash].forEach((nb, nbIndex) => {
      nb.pages = Array.isArray(nb.pages) ? nb.pages : [];
      nb.title = String(nb.title || 'Cuốn sổ chưa đặt tên');
      nb.author = String(nb.author || 'Cá nhân');
      nb.category = String(nb.category || 'Ghi chép');
      nb.lang = String(nb.lang || 'VI');
      nb.fontFamily = typeof nb.fontFamily === 'string' && nb.fontFamily ? nb.fontFamily : state.fontFamily;
      if (typeof nb.coverGradient !== 'string' || !/^linear-gradient\([^;{}]+\)$/.test(nb.coverGradient)) {
        nb.coverGradient = 'linear-gradient(135deg, #1e3a8a, #0f172a)';
      }
      if (typeof nb.coverTextColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(nb.coverTextColor)) nb.coverTextColor = '#ffffff';
      if (nb.pages.length === 0) {
        nb.pages.push({
          id: `p-${Date.now()}-${nbIndex}-1`,
          title: 'TRANG 1',
          topic: nb.title,
          date: new Date().toLocaleDateString('vi-VN'),
          no: '01',
          lang: 'VI',
          template: 'ruled',
          content: ''
        });
      }
      nb.createdAt = nb.createdAt || `2026-09-29T00:00:${String(nbIndex).padStart(2, '0')}.000Z`;
      nb.updatedAt = nb.updatedAt || nb.pages.reduce((latest, page) => {
        return page.updatedAt && page.updatedAt > latest ? page.updatedAt : latest;
      }, nb.createdAt);
      nb.isPinned = Boolean(nb.isPinned);
      nb.lastPageIndex = Math.max(0, Math.min(Number(nb.lastPageIndex) || 0, Math.max(0, nb.pages.length - 1)));
      delete nb.pagesCount;
      delete nb.currentProgress;
      delete nb.progressPct;
      nb.pages.forEach((page, pageIndex) => {
        page.id = page.id || `p-${Date.now()}-${nbIndex}-${pageIndex}`;
        if (page.template === 'book') page.template = 'ruled';
        if (!['cornell', 'work', 'ruled'].includes(page.template)) page.template = 'ruled';
        ['title', 'topic', 'project', 'date', 'no', 'deadline', 'status', 'lang', 'cues', 'notes', 'summary', 'agenda', 'discussions', 'content']
          .forEach(key => {
            if (page[key] != null && typeof page[key] !== 'string') page[key] = String(page[key]);
          });
        if (page.actions != null) {
          page.actions = Array.isArray(page.actions) ? page.actions.slice(0, 50).map(action => ({
            checked: Boolean(action && action.checked),
            text: String((action && action.text) || '')
          })) : [];
        }
        if (page.textBoxes) delete page.textBoxes;
      });
    });

    if (!state.activeNotebookId && state.notebooks[0]) state.activeNotebookId = state.notebooks[0].id;
    return state;
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.notebooks)) return normalizeState(parsed);
      }
    } catch (e) {
      console.warn('Error loading state:', e);
    }
    return normalizeState(JSON.parse(JSON.stringify(INITIAL_LIBRARY_DATA)));
  }

  function persistState() {
    try {
      const serialized = JSON.stringify(appState);
      localStorage.setItem(STORAGE_KEY, serialized);
      if (localStorage.getItem(STORAGE_KEY) !== serialized) throw new Error('Không thể xác minh dữ liệu vừa lưu.');
      return true;
    } catch (e) {
      console.error('Error saving state:', e);
      showStatus('Lưu thất bại', 'error');
      showToast('Không thể lưu dữ liệu. Hãy xuất bản sao JSON để tránh mất ghi chú.');
      return false;
    }
  }

  function showToast(message, actionLabel = '', action = null) {
    if (!els.appToast || !els.appToastText) return;
    clearTimeout(toastTimer);
    els.appToastText.textContent = message;
    els.appToast.hidden = false;
    els.appToast.classList.add('is-visible');
    if (els.appToastAction) {
      els.appToastAction.hidden = !actionLabel;
      els.appToastAction.textContent = actionLabel;
      els.appToastAction.onclick = action ? () => {
        action();
        hideToast();
      } : null;
    }
    toastTimer = setTimeout(hideToast, actionLabel ? 8000 : 4500);
  }

  function hideToast() {
    if (!els.appToast) return;
    els.appToast.classList.remove('is-visible');
    setTimeout(() => {
      if (!els.appToast.classList.contains('is-visible')) els.appToast.hidden = true;
    }, 180);
  }

  function openNewNotebookModal() {
    if (!els.newNotebookModal) return;
    els.newNotebookModal.classList.add('open');
    els.newNotebookModal.setAttribute('aria-hidden', 'false');
    if (els.newNotebookTitle) {
      els.newNotebookTitle.value = '';
      els.newNotebookTitle.focus();
    }
    if (els.newNotebookCategory) els.newNotebookCategory.value = categoryFilter !== 'all' ? categoryFilter : 'Học tập';
  }

  function closeNewNotebookModal() {
    if (!els.newNotebookModal) return;
    els.newNotebookModal.classList.remove('open');
    els.newNotebookModal.setAttribute('aria-hidden', 'true');
  }

  function getActiveNotebook() {
    if (!appState.notebooks || appState.notebooks.length === 0) {
      return null;
    }
    let nb = appState.notebooks.find(n => n.id === appState.activeNotebookId);
    if (!nb) {
      nb = appState.notebooks[0];
      appState.activeNotebookId = nb.id;
    }
    return nb;
  }

  function showStatus(text, state) {
    if (!els.saveStatus) return;
    els.saveStatus.setAttribute('data-state', state);
    els.saveStatus.setAttribute('title', text);
    if (els.saveStatusText) els.saveStatusText.textContent = text;
  }

  // Auto-Save
  function scheduleSave() {
    clearTimeout(saveTimer);
    showStatus('Chưa lưu', 'dirty');

    saveTimer = setTimeout(() => {
      saveActivePages();
    }, SAVE_DEBOUNCE_MS);
  }

  function getEditableContent(el) {
    if (!el) return '';
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return el.value;
    return el.innerHTML;
  }

  function extractTemplateDataFromSheet(sheetEl, page) {
    if (!sheetEl || !page) return;
    const template = page.template || 'cornell';

    const topicInput = sheetEl.querySelector('.topic-input');
    if (topicInput) {
      page.topic = topicInput.value;
      page.title = topicInput.value || page.title;
    }
    const projectInput = sheetEl.querySelector('.project-input');
    if (projectInput) {
      page.project = projectInput.value;
      page.title = projectInput.value || page.title;
    }
    const dateInput = sheetEl.querySelector('.date-input');
    if (dateInput) page.date = dateInput.value;
    const noInput = sheetEl.querySelector('.no-input');
    if (noInput) page.no = noInput.value;
    const deadlineInput = sheetEl.querySelector('.deadline-input');
    if (deadlineInput) page.deadline = deadlineInput.value;

    if (template === 'cornell') {
      const cuesText = sheetEl.querySelector('.cornell-cues-text');
      if (cuesText) page.cues = getEditableContent(cuesText);
      const notesText = sheetEl.querySelector('.cornell-notes-text');
      if (notesText) {
        page.notes = getEditableContent(notesText);
        page.content = getEditableContent(notesText);
      }
      const summaryText = sheetEl.querySelector('.cornell-summary-text');
      if (summaryText) page.summary = getEditableContent(summaryText);
    } else if (template === 'work') {
      const agendaText = sheetEl.querySelector('.work-agenda-text');
      if (agendaText) page.agenda = getEditableContent(agendaText);
      const notesText = sheetEl.querySelector('.work-notes-text');
      if (notesText) {
        page.discussions = getEditableContent(notesText);
        page.content = getEditableContent(notesText);
      }
      const actionRows = sheetEl.querySelectorAll('.action-row');
      if (actionRows && actionRows.length > 0) {
        if (!page.actions) page.actions = [];
        actionRows.forEach((row, idx) => {
          const chk = row.querySelector('.action-check-square');
          const input = row.querySelector('.action-line-input');
          page.actions[idx] = {
            checked: chk ? chk.classList.contains('checked') : false,
            text: input ? input.value : ''
          };
        });
      }
    } else if (template === 'ruled') {
      const ruledText = sheetEl.querySelector('.ruled-canvas-text');
      if (ruledText) page.content = getEditableContent(ruledText);
    }
  }

  function saveActivePages() {
    if (els.notebookView && els.notebookView.classList.contains('hidden')) return true;
    const nb = getActiveNotebook();
    if (!nb) return false;
    const curIdx = appState.activePageIndex;
    showStatus('Đang lưu', 'loading');

    // Save left page
    if (nb.pages[curIdx]) {
      const leftPage = nb.pages[curIdx];
      extractTemplateDataFromSheet(els.leftPageSheet, leftPage);
      leftPage.updatedAt = new Date().toISOString();
    }

    // Save right page if in 2-page mode
    if (currentPageMode === '2-page' && nb.pages[curIdx + 1]) {
      const rightPage = nb.pages[curIdx + 1];
      extractTemplateDataFromSheet(els.rightPageSheet, rightPage);
      rightPage.updatedAt = new Date().toISOString();
    }

    nb.lastPageIndex = curIdx;
    nb.updatedAt = new Date().toISOString();
    const saved = persistState();
    if (saved) {
      setTimeout(() => {
        showStatus('Đã lưu tự động', 'saved');
      }, 120);
    }
    return saved;
  }

  function getNotebookSearchText(nb) {
    const pageText = (nb.pages || []).map(page => [
      page.title, page.topic, page.project, page.date, page.deadline, page.status,
      page.cues, page.notes, page.summary, page.agenda, page.discussions, page.content,
      ...(page.actions || []).map(action => action.text)
    ].join(' ')).join(' ');
    return `${nb.title || ''} ${nb.author || ''} ${nb.category || ''} ${pageText}`
      .replace(/<[^>]*>/g, ' ')
      .toLowerCase();
  }

  function updateCategoryOptions() {
    if (!els.libCategoryFilter) return;
    const categories = [...new Set(appState.notebooks.map(nb => (nb.category || 'Ghi chép').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'vi'));
    const selected = categoryFilter;
    els.libCategoryFilter.innerHTML = '<option value="all">Tất cả sổ ▾</option>' + categories
      .map(category => `<option value="${escapeAttr(category)}">${escapeHTML(category)}</option>`)
      .join('');
    els.libCategoryFilter.value = categories.includes(selected) ? selected : 'all';
    categoryFilter = els.libCategoryFilter.value;
  }

  // Render Library Grid
  function renderLibraryGrid() {
    if (!els.booksGrid) return;
    updateCategoryOptions();

    const source = isTrashView ? appState.trash : appState.notebooks;

    let filtered = source.filter(nb => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!getNotebookSearchText(nb).includes(q)) return false;
      }
      if (!isTrashView && categoryFilter !== 'all') {
        if ((nb.category || '') !== categoryFilter) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (!isTrashView && a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (sortMode === 'title') return (a.title || '').localeCompare(b.title || '', 'vi');
      if (sortMode === 'created') return (b.createdAt || '').localeCompare(a.createdAt || '');
      return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
    });

    if (els.libBookCount) {
      els.libBookCount.textContent = `${filtered.length} ${isTrashView ? 'đã xóa' : 'cuốn sổ'}`;
    }
    if (els.libSectionTitle) els.libSectionTitle.textContent = isTrashView ? 'Thùng Rác' : 'Tủ Sổ Tay Của Bạn';
    if (els.trashButtonText) els.trashButtonText.textContent = isTrashView ? 'Quay lại tủ sổ' : `Thùng rác${appState.trash.length ? ` (${appState.trash.length})` : ''}`;
    if (els.libCategoryFilter) els.libCategoryFilter.disabled = isTrashView;
    if (els.btnOpenNewBookModal) els.btnOpenNewBookModal.hidden = isTrashView;

    if (filtered.length === 0) {
      els.booksGrid.innerHTML = `
        <div class="lib-empty-state">
          <div class="lib-empty-icon">📓</div>
          <h3 class="lib-empty-title">${isTrashView ? 'Thùng rác đang trống' : 'Chưa có cuốn sổ nào'}</h3>
          <p class="lib-empty-desc">
            ${isTrashView ? 'Các sổ đã xóa sẽ xuất hiện ở đây để bạn có thể khôi phục.' : searchQuery || categoryFilter !== 'all'
              ? 'Không có cuốn sổ nào khớp với tiêu chí tìm kiếm.' 
              : 'Tủ sổ tay hiện đang trống. Hãy tạo cuốn sổ ghi chép đầu tiên của bạn!'}
          </p>
          ${isTrashView ? '' : `<button class="btn-create-empty" id="btnEmptyCreate">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            <span>Tạo cuốn sổ mới</span>
          </button>`}
        </div>
      `;
      const btnEmpty = els.booksGrid.querySelector('#btnEmptyCreate');
      if (btnEmpty) {
        btnEmpty.addEventListener('click', () => {
          openNewNotebookModal();
        });
      }
      return;
    }

    els.booksGrid.innerHTML = filtered.map(nb => {
      const totalPages = Math.max(1, nb.pages.length);
      const currentPage = Math.min(totalPages, (nb.lastPageIndex || 0) + 1);
      const progressPct = Math.round((currentPage / totalPages) * 100);
      const pagesCountText = `${currentPage} / ${nb.pages.length} trang`;
      const textColor = nb.coverTextColor || '#ffffff';

      return `
        <div class="book-card ${isTrashView ? 'is-trash-card' : ''}" data-id="${escapeAttr(nb.id)}" ${isTrashView ? '' : 'role="button" tabindex="0"'} title="${isTrashView ? 'Sổ đã xóa' : `Mở cuốn sổ '${escapeAttr(nb.title)}'`}">
          <div class="book-cover" style="background: ${nb.coverGradient || 'linear-gradient(135deg, #1e3a8a, #0f172a)'}; color: ${textColor};">
            ${isTrashView ? '' : `<button class="book-star-badge btn-book-pin ${nb.isPinned ? 'is-pinned' : ''}" aria-label="${nb.isPinned ? 'Bỏ ghim sổ' : 'Ghim sổ'}" title="${nb.isPinned ? 'Bỏ ghim' : 'Ghim sổ'}" data-id="${escapeAttr(nb.id)}">★</button>`}
            <div class="cover-header-meta">${escapeHTML(nb.category || 'GHI CHÉP')}</div>
            <div class="cover-main-title" style="font-size: ${nb.title.length > 35 ? '13px' : '15px'};">
              ${escapeHTML(nb.title)}
            </div>
            <div class="cover-footer-meta">
              <span>${escapeHTML(nb.author || 'ARCHIVE')}</span>
              <span>●</span>
            </div>
            <div class="book-cover-progress-bar">
              <div class="book-cover-progress-fill" style="width: ${progressPct}%;"></div>
            </div>
            <div class="book-actions-overlay">
              ${isTrashView ? `
                <button class="btn-book-restore" aria-label="Khôi phục sổ" title="Khôi phục sổ" data-id="${escapeAttr(nb.id)}">↩</button>
                <button class="btn-book-delete-permanent" aria-label="Xóa sổ vĩnh viễn" title="Xóa vĩnh viễn" data-id="${escapeAttr(nb.id)}">×</button>
              ` : `
                <button class="btn-book-share" aria-label="Sao chép liên kết sổ" title="Sao chép liên kết cuốn sổ (URL)" data-id="${escapeAttr(nb.id)}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="pointer-events: none;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
                <button class="btn-book-duplicate" aria-label="Nhân bản sổ" title="Nhân bản sổ" data-id="${escapeAttr(nb.id)}">⧉</button>
                <button class="btn-book-delete" aria-label="Chuyển sổ vào thùng rác" title="Chuyển vào thùng rác" data-id="${escapeAttr(nb.id)}">×</button>
              `}
            </div>
          </div>
          <div class="book-info">
            <div class="book-title">${escapeHTML(nb.title)}</div>
            <div class="book-meta-row">
              <span class="book-page-count">${pagesCountText}</span>
              <span class="book-lang-tag">${escapeHTML(nb.lang || 'VN')}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers
    els.booksGrid.querySelectorAll('.book-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (isTrashView || e.target.closest('button')) return;
        const id = card.dataset.id;
        if (id) openNotebook(id);
      });
      card.addEventListener('keydown', (e) => {
        if (!isTrashView && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          openNotebook(card.dataset.id);
        }
      });
    });

    els.booksGrid.querySelectorAll('.btn-book-pin').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePin(btn.dataset.id);
    }));
    els.booksGrid.querySelectorAll('.btn-book-share').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const nb = (appState.notebooks || []).find(n => n.id === id);
      const page = nb ? (nb.lastPageIndex || 0) + 1 : 1;
      const url = new URL(window.location.href);
      url.searchParams.set('book', id);
      url.searchParams.set('page', String(page));
      copyTextToClipboard(url.toString(), `Đã sao chép liên kết cuốn “${nb ? nb.title : ''}”!`);
    }));
    els.booksGrid.querySelectorAll('.btn-book-duplicate').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      duplicateBook(btn.dataset.id);
    }));
    els.booksGrid.querySelectorAll('.btn-book-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteBook(btn.dataset.id);
      });
    });
    els.booksGrid.querySelectorAll('.btn-book-restore').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      restoreBook(btn.dataset.id);
    }));
    els.booksGrid.querySelectorAll('.btn-book-delete-permanent').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      permanentlyDeleteBook(btn.dataset.id);
    }));
  }

  function deleteBook(id) {
    const nb = appState.notebooks.find(n => n.id === id);
    if (!nb) return;
    if (confirm(`Chuyển cuốn sổ "${nb.title}" vào thùng rác?`)) {
      appState.notebooks = appState.notebooks.filter(n => n.id !== id);
      nb.deletedAt = new Date().toISOString();
      appState.trash.unshift(nb);
      if (appState.notebooks.length > 0) {
        if (appState.activeNotebookId === id) {
          appState.activeNotebookId = appState.notebooks[0].id;
        }
      } else {
        appState.activeNotebookId = null;
      }
      persistState();
      renderLibraryGrid();
      showToast(`Đã chuyển “${nb.title}” vào thùng rác.`, 'Hoàn tác', () => restoreBook(id));
    }
  }

  function restoreBook(id) {
    const nb = appState.trash.find(n => n.id === id);
    if (!nb) return;
    appState.trash = appState.trash.filter(n => n.id !== id);
    delete nb.deletedAt;
    nb.updatedAt = new Date().toISOString();
    appState.notebooks.unshift(nb);
    persistState();
    renderLibraryGrid();
    showToast(`Đã khôi phục “${nb.title}”.`);
  }

  function permanentlyDeleteBook(id) {
    const nb = appState.trash.find(n => n.id === id);
    if (!nb || !confirm(`Xóa vĩnh viễn cuốn sổ "${nb.title}"? Hành động này không thể hoàn tác.`)) return;
    appState.trash = appState.trash.filter(n => n.id !== id);
    persistState();
    renderLibraryGrid();
  }

  function togglePin(id) {
    const nb = appState.notebooks.find(n => n.id === id);
    if (!nb) return;
    nb.isPinned = !nb.isPinned;
    nb.updatedAt = new Date().toISOString();
    persistState();
    renderLibraryGrid();
  }

  function duplicateBook(id) {
    const source = appState.notebooks.find(n => n.id === id);
    if (!source) return;
    const now = Date.now();
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = `nb-${now}`;
    copy.title = `${source.title} — Bản sao`;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    copy.isPinned = false;
    copy.lastPageIndex = 0;
    copy.pages = copy.pages.map((page, index) => ({ ...page, id: `p-${now}-${index + 1}` }));
    appState.notebooks.unshift(copy);
    persistState();
    renderLibraryGrid();
    showToast(`Đã nhân bản “${source.title}”.`);
  }

  // ==========================================
  // URL ROUTING & DEEP-LINKING (ENDPOINT)
  // Supports:
  // - Query Params: ?book=nb-cornell-study&page=1
  // - Hash Routes: #/book/nb-cornell-study/1 or #book=nb-cornell-study&page=1
  // - Automatic state restoration on Reload
  // - Seamless browser Back / Forward (popstate & hashchange)
  // ==========================================

  const DEFAULT_APP_TITLE = 'Notebook Studio • Sổ Tay Thông Minh & Mẫu A4';

  function copyTextToClipboard(text, successMsg = 'Đã sao chép vào clipboard!') {
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
      prompt('Sao chép liên kết:', text);
    }
    document.body.removeChild(input);
  }

  function copyCurrentBookUrl() {
    const nb = getActiveNotebook();
    const curPage = appState.activePageIndex + 1;
    const url = new URL(window.location.href);
    if (nb) {
      url.searchParams.set('book', nb.id);
      url.searchParams.set('page', String(curPage));
    }
    copyTextToClipboard(url.toString(), `Đã sao chép liên kết trang ${curPage} của cuốn “${nb ? nb.title : ''}”!`);
  }

  function parseRouteFromUrl() {
    // 1. First priority: search query parameters (?book=...&page=...)
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

    // 2. Second priority: hash routes (#/book/:id/:page or #book=:id&page=:page)
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

  function updateUrl(route, replace = false) {
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

    // Dynamic document.title update
    if (route && route.bookId) {
      const nb = (appState.notebooks || []).find(n => n.id === route.bookId);
      if (nb) {
        document.title = `${nb.title} (Trang ${route.pageIndex + 1}) • Notebook Studio`;
      }
    } else {
      document.title = DEFAULT_APP_TITLE;
    }
  }

  let isHandlingPopState = false;

  function handleRouteFromUrl(skipHistory = true) {
    const route = parseRouteFromUrl();
    if (route && route.bookId) {
      const targetBook = (appState.notebooks || []).find(n => n.id === route.bookId && !n.deletedAt);
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

  function setupRouting() {
    window.addEventListener('popstate', () => {
      isHandlingPopState = true;
      try {
        const route = parseRouteFromUrl();
        if (route && route.bookId) {
          const targetBook = (appState.notebooks || []).find(n => n.id === route.bookId && !n.deletedAt);
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
      if (route && route.bookId) {
        const targetBook = (appState.notebooks || []).find(n => n.id === route.bookId && !n.deletedAt);
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

  // Open Notebook (Switch to Reader/Writer View)
  function openNotebook(notebookId, targetPageIndex = null, skipUrlUpdate = false) {
    if (!notebookId) {
      if (!appState.notebooks || appState.notebooks.length === 0) {
        openNewNotebookModal();
        return;
      }
      notebookId = appState.notebooks[0].id;
    }
    if (!els.notebookView.classList.contains('hidden')) saveActivePages();

    appState.activeNotebookId = notebookId;
    const notebook = getActiveNotebook();
    if (!notebook) {
      returnToLibrary(skipUrlUpdate);
      return;
    }

    if (typeof targetPageIndex === 'number' && !isNaN(targetPageIndex)) {
      const maxIdx = Math.max(0, (notebook.pages ? notebook.pages.length : 1) - 1);
      appState.activePageIndex = Math.max(0, Math.min(targetPageIndex, maxIdx));
    } else {
      appState.activePageIndex = notebook.lastPageIndex || 0;
    }
    notebook.lastPageIndex = appState.activePageIndex;
    persistState();

    els.libraryView.classList.add('hidden');
    els.notebookView.classList.remove('hidden');

    const compact = window.innerWidth <= 900;
    wasCompactViewport = compact;
    applyPageMode(compact ? '1-page' : (appState.pageMode || '2-page'), !compact);
    if (compact) {
      applyZoom(1);
    } else {
      applyZoom(appState.zoomLevel || 1.0);
    }

    if (!skipUrlUpdate) {
      updateUrl({ bookId: notebookId, pageIndex: appState.activePageIndex }, false);
    }

    renderBookPages();
  }

  function returnToLibrary(skipUrlUpdate = false) {
    saveActivePages();

    els.notebookView.classList.add('hidden');
    els.libraryView.classList.remove('hidden');
    renderLibraryGrid();

    if (!skipUrlUpdate) {
      updateUrl(null, false);
    }
  }

  // SVG Templates & Ornaments matching A4 Study Templates (100% Vector PDF Match)
  const ROYAL_CORNERS_SVG = `
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

  const EDGE_NOTCHES_HTML = `
    <div class="edge-index-markers">
      <div class="index-notch">I</div>
      <div class="index-notch">II</div>
      <div class="index-notch">III</div>
      <div class="index-notch">IV</div>
      <div class="index-notch">V</div>
      <div class="index-notch">VI</div>
    </div>
  `;

  function sanitizeRichHtml(html) {
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
      'text-decoration', 'line-height'
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
          const classes = attr.value.split(/\s+/).filter(c => /^(pill-badge|badge-pill|done-line|action-line-input|topic-input|date-input|no-input)$/.test(c));
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

  function formatContentToHtml(content) {
    if (content === null || content === undefined) return '';
    if (typeof content !== 'string') content = String(content);
    if (!content.trim()) return '';

    let html = content;

    // Convert unescaped or escaped badge pills & marks:
    html = html.replace(/&lt;span class="pill-badge"&gt;(.*?)&lt;\/span&gt;/gi, '<span class="pill-badge">$1</span>');
    html = html.replace(/&lt;span class="badge-pill"&gt;(.*?)&lt;\/span&gt;/gi, '<span class="pill-badge">$1</span>');
    html = html.replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u>$1</u>');
    html = html.replace(/&lt;s&gt;(.*?)&lt;\/s&gt;/gi, '<s>$1</s>');
    html = html.replace(/&lt;blockquote&gt;(.*?)&lt;\/blockquote&gt;/gi, '<blockquote>$1</blockquote>');
    html = html.replace(/&lt;code&gt;(.*?)&lt;\/code&gt;/gi, '<code>$1</code>');
    html = html.replace(/&lt;mark(.*?)&gt;(.*?)&lt;\/mark&gt;/gi, '<mark$1>$2</mark>');
    html = html.replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/gi, '<strong>$1</strong>');
    html = html.replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/gi, '<em>$1</em>');

    // Convert markdown bold: **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Clean dangling ** (e.g. from user input like Horizontal Scaling):** or Mục số 1**)
    html = html.replace(/\*\*/g, '');

    // Convert markdown italic: *text* -> <em>text</em>
    html = html.replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');

    // Convert markdown strike: ~~text~~ -> <s>$1</s>
    html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');

    // Convert markdown inline code: `text` -> <code>$1</code>
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert markdown quote line: > text -> <blockquote>text</blockquote>
    html = html.replace(/(^|<br>)> (.*?)(?=<br>|$)/gi, '$1<blockquote>$2</blockquote>');

    // If string has no block tags (div, p, blockquote, li, h1-h6), split by \n or <br> and wrap into <div>
    if (!/<(p|div|blockquote|ul|ol|h[1-6])[^>]*>/i.test(html)) {
      const rawLines = html.split(/<br\s*[\/]?>|\n/gi);
      html = rawLines.map(line => `<div>${line || '<br>'}</div>`).join('');
    }

    return sanitizeRichHtml(html);
  }

  function renderSheetContent(sheetEl, page, pageNum, isLeft) {
    if (!sheetEl || !page) return;
    const template = page.template || 'cornell';

    if (template === 'cornell') {
      renderCornellLayout(sheetEl, page, pageNum, isLeft);
    } else if (template === 'work') {
      renderWorkLayout(sheetEl, page, pageNum, isLeft);
    } else {
      renderRuledLayout(sheetEl, page, pageNum, isLeft);
    }
  }

  function renderCornellLayout(sheetEl, page, pageNum, isLeft) {
    sheetEl.innerHTML = `
      <div class="a4-template-sheet cornell-template-sheet">
        <div class="punch-margin-line"></div>
        ${EDGE_NOTCHES_HTML}
        ${ROYAL_CORNERS_SVG}

        <div class="functional-header">
          <div class="header-top-meta">
            <div class="header-purpose-badge"><span>✦</span> STUDY JOURNAL</div>
            <div class="signature-seal-cartouche">
              <span class="seal-user-handle">${escapeHTML((getActiveNotebook() && getActiveNotebook().author) || 'Cá nhân')}</span>
              <span class="seal-user-sub">STUDY ARCHIVE</span>
            </div>
          </div>
          <div class="header-main-field">
            <span class="field-label">SUBJECT / TOPIC:</span>
            <input type="text" class="field-underline-input topic-input" value="${escapeAttr(page.topic || page.title || '')}" placeholder="Nhập chủ đề bài học / nghiên cứu..." />
          </div>
          <div class="header-sub-fields">
            <div class="sub-field-group">
              <span style="font-weight: 700;">DATE:</span>
              <input type="text" class="sub-field-input date-input" value="${escapeAttr(page.date || '')}" placeholder="DD/MM/YYYY" style="width: 80px;" />
            </div>
            <div class="sub-field-group">
              <span style="font-weight: 700;">NO.</span>
              <input type="text" class="sub-field-input no-input" value="${escapeAttr(page.no || String(pageNum).padStart(2, '0'))}" placeholder="01" style="width: 45px;" />
            </div>
          </div>
        </div>

        <div class="cornell-container">
          <div class="cornell-body-split">
            <div class="cornell-cue-col">
              <span class="section-guide-badge">CUES & QUESTIONS</span>
              <div contenteditable="true" class="template-writing-area cornell-cues-text" data-placeholder="Từ khóa, câu hỏi ôn tập, luận điểm chính...">${formatContentToHtml(page.cues || '')}</div>
            </div>
            <div class="cornell-notes-col">
              <span class="section-guide-badge">NOTES</span>
              <div contenteditable="true" class="template-writing-area cornell-notes-text" data-placeholder="Ghi chép chi tiết, công thức, định nghĩa, sơ đồ...">${formatContentToHtml(page.notes || page.content || '')}</div>
            </div>
          </div>
          <div class="cornell-summary-area">
            <span class="section-guide-badge">SUMMARY & SYNTHESIS</span>
            <div contenteditable="true" class="template-writing-area cornell-summary-text" data-placeholder="Tóm tắt & tổng hợp kiến thức cốt lõi của trang...">${formatContentToHtml(page.summary || '')}</div>
          </div>
        </div>

        <div class="scholar-footer">
          <span class="footer-left-tag">CORNELL SYSTEM</span>
          <div class="footer-page-box">
            <span>PAGE</span>
            <span class="footer-page-line">${pageNum}</span>
          </div>
        </div>
      </div>
    `;

    attachTemplateInputListeners(sheetEl, page);
  }

  function renderWorkLayout(sheetEl, page, pageNum, isLeft) {
    const actions = (page.actions && page.actions.length === 5) ? page.actions : [
      { checked: false, text: '' },
      { checked: false, text: '' },
      { checked: false, text: '' },
      { checked: false, text: '' },
      { checked: false, text: '' }
    ];

    const actionRowsHtml = actions.map((act, idx) => `
      <div class="action-row" data-idx="${idx}">
        <button type="button" class="action-check-square ${act.checked ? 'checked' : ''}" data-idx="${idx}" title="Đánh dấu hoàn thành"></button>
        ${idx === 0 ? '<span class="section-guide-badge" style="position: static; margin-right: 4px;">ACTION ITEMS & NEXT STEPS</span>' : ''}
        <input type="text" class="action-line-input ${act.checked ? 'done-line' : ''}" data-idx="${idx}" value="${escapeAttr(act.text || '')}" placeholder="Hành động ${idx + 1}, người phụ trách..." />
      </div>
    `).join('');

    sheetEl.innerHTML = `
      <div class="a4-template-sheet work-template-sheet">
        <div class="punch-margin-line"></div>
        ${EDGE_NOTCHES_HTML}
        ${ROYAL_CORNERS_SVG}

        <div class="functional-header">
          <div class="header-top-meta">
            <div class="header-purpose-badge"><span>💼</span> WORK & PROJECT</div>
            <div class="signature-seal-cartouche">
              <span class="seal-user-handle">${escapeHTML((getActiveNotebook() && getActiveNotebook().author) || 'Cá nhân')}</span>
              <span class="seal-user-sub">WORK ARCHIVE</span>
            </div>
          </div>
          <div class="header-main-field">
            <span class="field-label">PROJECT / OBJECTIVE:</span>
            <input type="text" class="field-underline-input project-input" value="${escapeAttr(page.project || page.topic || page.title || '')}" placeholder="Tên dự án, mục tiêu công việc..." />
          </div>
          <div class="header-sub-fields">
            <div class="sub-field-group">
              <span style="font-weight: 700;">DATE:</span>
              <input type="text" class="sub-field-input date-input" value="${escapeAttr(page.date || '')}" placeholder="DD/MM/YYYY" style="width: 75px;" />
              <span style="font-weight: 700; margin-left: 6px;">DEADLINE:</span>
              <input type="text" class="sub-field-input deadline-input" value="${escapeAttr(page.deadline || '')}" placeholder="DD/MM/YYYY" style="width: 75px;" />
            </div>
            <div class="sub-field-group">
              <span style="font-weight: 700;">STATUS:</span>
              <div class="status-pills">
                <button type="button" class="status-pill-btn ${page.status === 'TODO' ? 'active-todo' : ''}" data-status="TODO">[ ] TODO</button>
                <button type="button" class="status-pill-btn ${page.status === 'WIP' || !page.status ? 'active-wip' : ''}" data-status="WIP">[ ] WIP</button>
                <button type="button" class="status-pill-btn ${page.status === 'DONE' ? 'active-done' : ''}" data-status="DONE">[✓] DONE</button>
              </div>
            </div>
          </div>
        </div>

        <div class="work-container">
          <div class="work-body-split">
            <div class="work-side-col">
              <span class="section-guide-badge">AGENDA & DECISIONS</span>
              <div contenteditable="true" class="template-writing-area work-agenda-text" data-placeholder="Chương trình họp, quyết định then chốt, mục tiêu...">${formatContentToHtml(page.agenda || '')}</div>
            </div>
            <div class="work-notes-col">
              <span class="section-guide-badge">NOTES & DISCUSSIONS</span>
              <div contenteditable="true" class="template-writing-area work-notes-text" data-placeholder="Ghi chép thảo luận, ý kiến đóng góp, phân tích...">${formatContentToHtml(page.discussions || page.content || '')}</div>
            </div>
          </div>
          <div class="work-action-area">
            ${actionRowsHtml}
          </div>
        </div>

        <div class="scholar-footer">
          <span class="footer-left-tag">WORK & PROJECT LOG</span>
          <div class="footer-page-box">
            <span>PAGE</span>
            <span class="footer-page-line">${pageNum}</span>
          </div>
        </div>
      </div>
    `;

    attachTemplateInputListeners(sheetEl, page);
  }

  function renderRuledLayout(sheetEl, page, pageNum, isLeft) {
    sheetEl.innerHTML = `
      <div class="a4-template-sheet ruled-template-sheet">
        <div class="punch-margin-line"></div>
        ${EDGE_NOTCHES_HTML}
        ${ROYAL_CORNERS_SVG}

        <div class="functional-header">
          <div class="header-top-meta">
            <div class="header-purpose-badge"><span>✍️</span> GENERAL NOTEBOOK</div>
            <div class="signature-seal-cartouche">
              <span class="seal-user-handle">${escapeHTML((getActiveNotebook() && getActiveNotebook().author) || 'Cá nhân')}</span>
              <span class="seal-user-sub">STUDY ARCHIVE</span>
            </div>
          </div>
          <div class="header-main-field">
            <span class="field-label">SUBJECT / TOPIC:</span>
            <input type="text" class="field-underline-input topic-input" value="${escapeAttr(page.topic || page.title || '')}" placeholder="Chủ đề sổ tay ghi chép kẻ ngang..." />
          </div>
          <div class="header-sub-fields">
            <div class="sub-field-group">
              <span style="font-weight: 700;">DATE:</span>
              <input type="text" class="sub-field-input date-input" value="${escapeAttr(page.date || '')}" placeholder="DD/MM/YYYY" style="width: 80px;" />
            </div>
            <div class="sub-field-group">
              <span style="font-weight: 700;">NO.</span>
              <input type="text" class="sub-field-input no-input" value="${escapeAttr(page.no || String(pageNum).padStart(2, '0'))}" placeholder="01" style="width: 45px;" />
            </div>
          </div>
        </div>

        <div class="ruled-full-canvas">
          <div contenteditable="true" class="template-writing-area ruled-canvas-text" data-placeholder="Bắt đầu viết suy nghĩ, ý tưởng, ghi chép tự do vào các dòng kẻ ngang...">${formatContentToHtml(page.content || '')}</div>
        </div>

        <div class="scholar-footer">
          <span class="footer-left-tag">RULED NOTEBOOK</span>
          <div class="footer-page-box">
            <span>PAGE</span>
            <span class="footer-page-line">${pageNum}</span>
          </div>
        </div>
      </div>
    `;

    attachTemplateInputListeners(sheetEl, page);
  }

  // Space and character width measurement for notebook ruling lines
  let cachedSpaceWidth = 7.5;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '12.5px "Plus Jakarta Sans", -apple-system, sans-serif';
    cachedSpaceWidth = ctx.measureText('\u00A0').width || 7.5;
  } catch (e) {
    cachedSpaceWidth = 7.5;
  }

  function getElementScale(el) {
    if (!el) return appState.zoomLevel || 1.0;
    const rect = el.getBoundingClientRect();
    const offsetW = el.offsetWidth;
    if (offsetW > 0 && rect.width > 0) {
      return rect.width / offsetW;
    }
    return appState.zoomLevel || 1.0;
  }

  function placeCaretAtLine(targetLine, colOffset = 0) {
    if (!targetLine) return;
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();

    if (targetLine.childNodes.length === 0) {
      targetLine.appendChild(document.createElement('br'));
    }

    let textNode = null;
    for (let i = 0; i < targetLine.childNodes.length; i++) {
      if (targetLine.childNodes[i].nodeType === Node.TEXT_NODE) {
        textNode = targetLine.childNodes[i];
        break;
      }
    }

    if (textNode) {
      const len = textNode.textContent.length;
      const offset = Math.max(0, Math.min(colOffset, len));
      range.setStart(textNode, offset);
      range.setEnd(textNode, offset);
    } else {
      range.setStart(targetLine, 0);
      range.setEnd(targetLine, 0);
    }

    sel.removeAllRanges();
    sel.addRange(range);
  }

  function handleWritingAreaClick(editable, e, sheetEl, page) {
    if (!editable) return;
    lastActiveEditable = editable;

    // If user dragged to select text, do not interfere
    if (window.getSelection && window.getSelection().toString().length > 0) {
      return;
    }

    // Check if the click target is an existing line that has text content
    const clickedLine = e.target.closest ? e.target.closest('.template-writing-area > *') : null;
    if (clickedLine && clickedLine.textContent.trim().length > 0) {
      // The user clicked on an existing line with text (e.g. editing words or clicking inside line)
      // Native browser selection handles this with 100% precision. Do not interfere!
      return;
    }

    // Calculate exact CSS coordinates taking into account the zoom/transform scale
    const rect = editable.getBoundingClientRect();
    const scale = getElementScale(editable);

    const clickCssX = (e.clientX - rect.left) / scale + editable.scrollLeft;
    const clickCssY = (e.clientY - rect.top) / scale + editable.scrollTop;

    const style = window.getComputedStyle(editable);
    const paddingTop = parseFloat(style.paddingTop) || 22;
    const lineHeight = parseFloat(style.lineHeight) || 22;
    const paddingLeft = parseFloat(style.paddingLeft) || 8;

    // If user clicked inside an existing EMPTY line (e.g. <div><br></div>):
    if (clickedLine && clickedLine.parentNode === editable) {
      const relX = clickCssX - paddingLeft;
      if (relX > 14) {
        const spacesCount = Math.min(80, Math.max(1, Math.round(relX / cachedSpaceWidth)));
        clickedLine.innerHTML = '\u00A0'.repeat(spacesCount) + '<br>';
        editable.focus();
        placeCaretAtLine(clickedLine, spacesCount);
        if (page && sheetEl) {
          extractTemplateDataFromSheet(sheetEl, page);
          scheduleSave();
        }
      } else {
        editable.focus();
        placeCaretAtLine(clickedLine, 0);
      }
      return;
    }

    // User clicked on empty space below the existing lines (e.target is editable or wrapper)
    let targetLineIndex = 0;
    if (clickCssY > paddingTop) {
      targetLineIndex = Math.floor((clickCssY - paddingTop) / lineHeight);
    }

    // Bound by maximum lines fitting the container height
    const maxLines = Math.max(1, Math.floor((editable.offsetHeight - paddingTop) / lineHeight));
    targetLineIndex = Math.min(targetLineIndex, maxLines - 1);

    // Ensure all direct children are block lines (<div>)
    if (editable.children.length === 0 && editable.childNodes.length > 0) {
      const wrapDiv = document.createElement('div');
      while (editable.firstChild) wrapDiv.appendChild(editable.firstChild);
      editable.appendChild(wrapDiv);
    }

    // Pad empty lines up to targetLineIndex
    while (editable.children.length <= targetLineIndex) {
      const emptyDiv = document.createElement('div');
      emptyDiv.innerHTML = '<br>';
      editable.appendChild(emptyDiv);
    }

    const targetLine = editable.children[targetLineIndex];
    if (!targetLine) return;

    editable.focus();

    // Check horizontal indentation
    const relX = clickCssX - paddingLeft;
    if (relX > 14) {
      const spacesCount = Math.min(80, Math.max(1, Math.round(relX / cachedSpaceWidth)));
      targetLine.innerHTML = '\u00A0'.repeat(spacesCount) + '<br>';
      placeCaretAtLine(targetLine, spacesCount);
    } else {
      placeCaretAtLine(targetLine, 0);
    }

    if (page && sheetEl) {
      extractTemplateDataFromSheet(sheetEl, page);
      scheduleSave();
    }
  }

  function attachTemplateInputListeners(sheetEl, page) {
    if (!sheetEl || !page) return;

    // Listen to all inputs (topic, date, deadline, no, etc.)
    sheetEl.querySelectorAll('input').forEach(input => {
      input.addEventListener('focus', () => { lastActiveTextarea = input; });
      input.addEventListener('click', () => { lastActiveTextarea = input; });
      input.addEventListener('input', () => {
        extractTemplateDataFromSheet(sheetEl, page);
        scheduleSave();
      });
    });

    // Listen to all contenteditable writing areas
    sheetEl.querySelectorAll('.template-writing-area[contenteditable="true"]').forEach(editable => {
      editable.addEventListener('focus', () => {
        lastActiveEditable = editable;
      });
      editable.addEventListener('click', (e) => {
        e.stopPropagation();
        lastActiveEditable = editable;
        saveCurrentSelection();
        handleWritingAreaClick(editable, e, sheetEl, page);
      });
      editable.addEventListener('keyup', () => {
        lastActiveEditable = editable;
        saveCurrentSelection();
      });
      editable.addEventListener('mouseup', () => {
        lastActiveEditable = editable;
        saveCurrentSelection();
      });
      editable.addEventListener('input', () => {
        lastActiveEditable = editable;
        saveCurrentSelection();
        extractTemplateDataFromSheet(sheetEl, page);
        scheduleSave();
      });
    });

    // Also listen to column wrappers so clicking anywhere in the column activates direct line writing
    const colSelectors = [
      '.cornell-notes-col',
      '.cornell-cue-col',
      '.cornell-summary-area',
      '.work-agenda-col',
      '.work-notes-col',
      '.ruled-sheet-body'
    ];
    sheetEl.querySelectorAll(colSelectors.join(', ')).forEach(col => {
      col.addEventListener('click', (e) => {
        if (e.target.closest('input, button, .action-row, .status-pill-btn, .template-writing-area')) return;
        const editable = col.querySelector('.template-writing-area[contenteditable="true"]');
        if (editable) {
          handleWritingAreaClick(editable, e, sheetEl, page);
        }
      });
    });

    // Checkbox clicks for action items
    sheetEl.querySelectorAll('.action-check-square').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx, 10);
        btn.classList.toggle('checked');
        const input = sheetEl.querySelector(`.action-line-input[data-idx="${idx}"]`);
        if (input) {
          input.classList.toggle('done-line', btn.classList.contains('checked'));
        }
        extractTemplateDataFromSheet(sheetEl, page);
        scheduleSave();
      });
    });

    // Status pill clicks
    sheetEl.querySelectorAll('.status-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const st = btn.dataset.status;
        page.status = st;
        sheetEl.querySelectorAll('.status-pill-btn').forEach(b => {
          b.className = 'status-pill-btn';
        });
        if (st === 'TODO') btn.classList.add('active-todo');
        else if (st === 'WIP') btn.classList.add('active-wip');
        else if (st === 'DONE') btn.classList.add('active-done');
        scheduleSave();
      });
    });
  }

  // Render Book Pages (Left and Right)
  function renderBookPages() {
    const nb = getActiveNotebook();
    if (!nb) {
      returnToLibrary();
      return;
    }
    const totalPages = nb.pages.length;
    (nb.pages || []).forEach(p => {
      if (p.textBoxes) delete p.textBoxes;
    });
    let curIdx = appState.activePageIndex;

    if (curIdx >= totalPages) curIdx = Math.max(0, totalPages - 1);
    if (curIdx < 0) curIdx = 0;
    appState.activePageIndex = curIdx;
    nb.lastPageIndex = curIdx;

    // Keep URL in sync with active notebook and page
    if (els.notebookView && !els.notebookView.classList.contains('hidden')) {
      updateUrl({ bookId: nb.id, pageIndex: curIdx }, true);
    }

    const leftPage = nb.pages[curIdx] || { title: 'Trang mới', lang: 'VI', content: '', template: 'cornell' };
    const rightPage = nb.pages[curIdx + 1] || null;

    // Update Header
    if (els.openBookTitle) {
      els.openBookTitle.textContent = nb.title;
    }
    if (els.readerPageInput) {
      els.readerPageInput.value = `${curIdx + 1}`;
    }
    if (els.readerTotalPages) {
      els.readerTotalPages.textContent = `/ ${totalPages}`;
    }

    if (els.btnPrevPage) els.btnPrevPage.disabled = curIdx <= 0;
    if (els.btnNextPage) {
      const step = currentPageMode === '2-page' ? 2 : 1;
      els.btnNextPage.disabled = curIdx + step >= totalPages;
    }

    // Set Template Selector value to active left page's template
    if (els.readerTemplateSelect) {
      els.readerTemplateSelect.value = leftPage.template || 'cornell';
    }

    // Apply active notebook font and font size
    applyFontFamily(nb.fontFamily || appState.fontFamily || 'sans');
    applyFontSize(appState.fontSize || 16);

    // Render Left Page Sheet
    renderSheetContent(els.leftPageSheet, leftPage, curIdx + 1, true);

    // Render Right Page Sheet if in 2-page mode
    if (currentPageMode === '2-page') {
      if (rightPage) {
        renderSheetContent(els.rightPageSheet, rightPage, curIdx + 2, false);
      } else {
        const blankPage = {
          id: 'p-blank-' + (curIdx + 2),
          title: 'TRANG ' + (curIdx + 2),
          topic: `${nb.title} - Trang ${curIdx + 2}`,
          date: new Date().toLocaleDateString('vi-VN'),
          no: String(curIdx + 2).padStart(2, '0'),
          lang: 'EN',
          template: leftPage.template || 'cornell',
          content: ''
        };
        renderSheetContent(els.rightPageSheet, blankPage, curIdx + 2, false);
      }
    }
  }

  // Apply 1-Page vs 2-Page Mode
  function applyPageMode(mode, persistPreference = true) {
    currentPageMode = mode;
    if (persistPreference) appState.pageMode = mode;
    if (mode === '1-page') {
      els.bookSpreadCasing.classList.add('mode-1-page');
      els.btnMode1Page.classList.add('active');
      els.btnMode2Pages.classList.remove('active');
    } else {
      els.bookSpreadCasing.classList.remove('mode-1-page');
      els.btnMode2Pages.classList.add('active');
      els.btnMode1Page.classList.remove('active');
    }
    if (persistPreference) persistState();
    renderBookPages();
  }

  // Apply Zoom Scale (Supports 30% to 350% smoothly)
  function applyZoom(scale) {
    const clampedScale = Math.max(0.3, Math.min(3.5, Math.round(scale * 100) / 100));
    appState.zoomLevel = clampedScale;
    els.bookDeskScaler.style.transform = `scale(${clampedScale})`;
    els.bookDeskScaler.style.transformOrigin = 'top center';

    // Dynamic scroll margin allowance for high zoom levels
    const casing = els.bookSpreadCasing;
    if (casing) {
      const naturalW = casing.offsetWidth || (currentPageMode === '1-page' ? 688 : 1002);
      const naturalH = casing.offsetHeight || (currentPageMode === '1-page' ? 844 : 704);
      const scaledW = naturalW * clampedScale;
      const scaledH = naturalH * clampedScale;

      if (clampedScale > 1) {
        els.bookDeskScaler.style.marginBottom = `${Math.round(scaledH - naturalH + 40)}px`;
        const extraSide = Math.max(0, Math.round((scaledW - naturalW) / 2));
        els.bookDeskScaler.style.marginLeft = `${extraSide}px`;
        els.bookDeskScaler.style.marginRight = `${extraSide}px`;
      } else {
        els.bookDeskScaler.style.marginBottom = '';
        els.bookDeskScaler.style.marginLeft = '';
        els.bookDeskScaler.style.marginRight = '';
      }
    }

    if (els.readerScaleValue) {
      els.readerScaleValue.textContent = `${Math.round(clampedScale * 100)}%`;
    }
    persistState();
  }

  function zoomIn() {
    const cur = Math.round((appState.zoomLevel || 1.0) * 100) / 100;
    const step = cur < 1.0 ? 0.1 : (cur < 2.0 ? 0.15 : 0.25);
    const next = Math.min(3.0, Math.round((cur + step) * 100) / 100);
    if (els.btnFitPage) els.btnFitPage.classList.remove('active');
    if (els.btnFitWidth) els.btnFitWidth.classList.remove('active');
    applyZoom(next);
  }

  function zoomOut() {
    const cur = Math.round((appState.zoomLevel || 1.0) * 100) / 100;
    const step = cur <= 1.0 ? 0.1 : (cur <= 2.0 ? 0.15 : 0.25);
    const next = Math.max(0.3, Math.round((cur - step) * 100) / 100);
    if (els.btnFitPage) els.btnFitPage.classList.remove('active');
    if (els.btnFitWidth) els.btnFitWidth.classList.remove('active');
    applyZoom(next);
  }

  function resetZoom() {
    if (els.btnFitPage) els.btnFitPage.classList.remove('active');
    if (els.btnFitWidth) els.btnFitWidth.classList.remove('active');
    applyZoom(1.0);
  }

  // 3D Page Flip Forward
  function turnPageForward() {
    if (isTurningPage) return;
    const nb = getActiveNotebook();
    const step = currentPageMode === '2-page' ? 2 : 1;

    if (appState.activePageIndex + step >= nb.pages.length) return;

    saveActivePages();
    isTurningPage = true;

    // Trigger 3D Page Flip Animation
    const targetSheet = currentPageMode === '2-page' ? els.rightPageSheet : els.leftPageSheet;
    targetSheet.classList.add('flip-turn-next');

    setTimeout(() => {
      appState.activePageIndex += step;
      renderBookPages();
      targetSheet.classList.remove('flip-turn-next');
      isTurningPage = false;
    }, 550);
  }

  // 3D Page Flip Backward
  function turnPageBackward() {
    if (isTurningPage) return;
    const step = currentPageMode === '2-page' ? 2 : 1;

    if (appState.activePageIndex <= 0) return;

    saveActivePages();
    isTurningPage = true;

    // Trigger 3D Page Flip Animation
    const targetSheet = els.leftPageSheet;
    targetSheet.classList.add('flip-turn-prev');

    setTimeout(() => {
      appState.activePageIndex = Math.max(0, appState.activePageIndex - step);
      renderBookPages();
      targetSheet.classList.remove('flip-turn-prev');
      isTurningPage = false;
    }, 550);
  }

  // Jump to Direct Page Number
  function jumpToPage(pageNum) {
    const nb = getActiveNotebook();
    const idx = Math.max(0, Math.min(pageNum - 1, nb.pages.length - 1));
    saveActivePages();
    appState.activePageIndex = idx;
    renderBookPages();
  }

  // Add Page to Current Notebook
  function addPageToCurrentBook() {
    saveActivePages();
    const nb = getActiveNotebook();
    const newPageNum = nb.pages.length + 1;
    const curPage = nb.pages[appState.activePageIndex] || {};
    const inheritTemplate = curPage.template || 'cornell';

    const newPage = {
      id: 'p-' + Date.now(),
      lang: 'VI',
      title: `TRANG ${newPageNum}`,
      topic: `${nb.title} - Trang ${newPageNum}`,
      date: new Date().toLocaleDateString('vi-VN'),
      no: String(newPageNum).padStart(2, '0'),
      template: inheritTemplate,
      updatedAt: new Date().toISOString(),
      content: ''
    };

    nb.pages.push(newPage);
    nb.updatedAt = newPage.updatedAt;
    nb.lastPageIndex = nb.pages.length - 1;
    persistState();

    // Jump to the newly created page
    appState.activePageIndex = nb.pages.length - 1;
    renderBookPages();
  }

  // Change Template for Active Page (With Safe Content Preservation)
  function changePageTemplate(templateKey) {
    const nb = getActiveNotebook();
    if (!nb) return;
    const curPage = nb.pages[appState.activePageIndex];
    if (!curPage) return;

    const oldTemplate = curPage.template;
    if (oldTemplate === templateKey) return;

    // Extract current values before changing
    extractTemplateDataFromSheet(els.leftPageSheet, curPage);

    // Harmonize content between templates
    if (templateKey === 'cornell') {
      curPage.notes = curPage.notes || curPage.content || curPage.discussions || '';
      curPage.cues = curPage.cues || curPage.agenda || '';
      curPage.summary = curPage.summary || '';
    } else if (templateKey === 'work') {
      curPage.discussions = curPage.discussions || curPage.notes || curPage.content || '';
      curPage.agenda = curPage.agenda || curPage.cues || '';
      curPage.actions = curPage.actions || [
        { checked: false, text: '' },
        { checked: false, text: '' },
        { checked: false, text: '' },
        { checked: false, text: '' },
        { checked: false, text: '' }
      ];
    } else {
      curPage.content = curPage.content || curPage.notes || curPage.discussions || '';
      templateKey = 'ruled';
    }

    curPage.template = templateKey;
    curPage.updatedAt = new Date().toISOString();
    nb.updatedAt = curPage.updatedAt;
    persistState();
    renderBookPages();
  }

  // Rename Current Notebook
  function renameCurrentNotebook() {
    const nb = getActiveNotebook();
    if (!nb) return;
    const newTitle = prompt('Nhập tên mới cho cuốn sổ:', nb.title);
    if (newTitle && newTitle.trim() && newTitle.trim() !== nb.title) {
      nb.title = newTitle.trim();
      nb.updatedAt = new Date().toISOString();
      if (els.openBookTitle) els.openBookTitle.textContent = nb.title;
      updateUrl({ bookId: nb.id, pageIndex: appState.activePageIndex }, true);
      persistState();
      showStatus('Đã đổi tên sổ', 'saved');
    }
  }

  // Delete Current Page
  function deleteCurrentPage() {
    const nb = getActiveNotebook();
    if (!nb) return;
    if (nb.pages.length <= 1) {
      alert('Không thể xóa trang duy nhất của cuốn sổ!');
      return;
    }
    const pageNum = appState.activePageIndex + 1;
    if (confirm(`Bạn có chắc muốn xóa Trang ${pageNum} khỏi cuốn sổ "${nb.title}"?`)) {
      nb.pages.splice(appState.activePageIndex, 1);
      if (appState.activePageIndex >= nb.pages.length) {
        appState.activePageIndex = Math.max(0, nb.pages.length - 1);
      }
      nb.lastPageIndex = appState.activePageIndex;
      nb.updatedAt = new Date().toISOString();
      persistState();
      renderBookPages();
      showStatus('Đã xóa trang', 'saved');
    }
  }

  // Dynamic Fit Page and Fit Width
  function handleFitPage() {
    if (els.btnFitPage) els.btnFitPage.classList.add('active');
    if (els.btnFitWidth) els.btnFitWidth.classList.remove('active');
    const desk = els.openBookWorkspace;
    const casing = els.bookSpreadCasing;
    if (desk && casing) {
      const availH = desk.clientHeight - 40;
      const casingH = casing.offsetHeight || 710;
      const scale = Math.max(0.3, Math.min(3.0, availH / casingH));
      applyZoom(Math.round(scale * 100) / 100);
    } else {
      applyZoom(0.72);
    }
  }

  function handleFitWidth() {
    if (els.btnFitWidth) els.btnFitWidth.classList.add('active');
    if (els.btnFitPage) els.btnFitPage.classList.remove('active');
    const desk = els.openBookWorkspace;
    const casing = els.bookSpreadCasing;
    if (desk && casing) {
      const availW = desk.clientWidth - 40;
      const casingW = casing.offsetWidth || (currentPageMode === '1-page' ? 510 : 1010);
      const scale = Math.max(0.3, Math.min(3.0, availW / casingW));
      applyZoom(Math.round(scale * 100) / 100);
    } else {
      applyZoom(1.0);
    }
  }

  // Stepped Font Sizes Scale (12px up to 128px)
  const FONT_SIZES = [12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 112, 128];

  function updateFontSize(direction, reset = false) {
    const editable = getActiveEditableArea();
    const sel = window.getSelection();
    const hasSelection = editable && sel && !sel.isCollapsed && editable.contains(sel.anchorNode);

    if (hasSelection) {
      applyFontSizeToSelection(editable, direction, reset);
      return;
    }

    if (reset) {
      appState.fontSize = 16;
      applyFontSize(16);
      persistState();
      return;
    }

    const cur = appState.fontSize || 16;
    let idx = FONT_SIZES.findIndex(s => s >= cur);
    if (idx === -1) idx = FONT_SIZES.length - 1;
    if (FONT_SIZES[idx] > cur && direction < 0) {
      idx = Math.max(0, idx - 1);
    } else {
      idx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + direction));
    }
    const next = FONT_SIZES[idx];
    appState.fontSize = next;
    applyFontSize(next);
    persistState();
  }

  function applyFontSizeToSelection(editable, direction, reset = false) {
    if (!editable) return;
    editable.focus();
    restoreCurrentSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return;

    try {
      const range = sel.getRangeAt(0);
      const parent = sel.anchorNode.parentElement;
      let cur = parent ? parseInt(window.getComputedStyle(parent).fontSize) || 16 : 16;
      let nextSize = 16;
      if (!reset) {
        let idx = FONT_SIZES.findIndex(s => s >= cur);
        if (idx === -1) idx = FONT_SIZES.length - 1;
        if (FONT_SIZES[idx] > cur && direction < 0) {
          idx = Math.max(0, idx - 1);
        } else {
          idx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + direction));
        }
        nextSize = FONT_SIZES[idx];
      }

      const span = document.createElement('span');
      if (!reset) {
        span.style.fontSize = `${nextSize}px`;
        span.style.lineHeight = '1.4';
      }
      span.appendChild(range.extractContents());
      range.insertNode(span);
      range.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(range);
      saveCurrentSelection();

      if (els.fontSizeLabel) els.fontSizeLabel.textContent = nextSize;
      editable.dispatchEvent(new Event('input', { bubbles: true }));
      scheduleSave();
    } catch (err) {
      console.warn('Could not apply font size to selection:', err);
    }
  }

  function applyFontSize(size) {
    const s = size || appState.fontSize || 16;
    const nbSize = Math.max(10, Math.round(s * 0.82 * 10) / 10);
    const lineH = Math.max(22, Math.round(nbSize * 1.65));

    document.documentElement.style.setProperty('--editor-font-size', `${s}px`);
    document.documentElement.style.setProperty('--notebook-font-size', `${nbSize}px`);
    document.documentElement.style.setProperty('--notebook-line-height', `${lineH}px`);
    if (els.fontSizeLabel) els.fontSizeLabel.textContent = s;
  }

  const CJK_CALLIGRAPHIC_STACK = '"Kaiti SC", "STKaiti", "KaiTi", "SimKai", "KaiTi_GB2312", "BiauKai", "Noto Serif SC", "Songti SC", "STSong", "SimSun", "Source Han Serif SC", serif';

  const FONT_MAP = {
    'sans': `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ${CJK_CALLIGRAPHIC_STACK}`,
    'vietnam': `'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ${CJK_CALLIGRAPHIC_STACK}`,
    'serif': `'Cormorant Garamond', Georgia, "Noto Serif SC", ${CJK_CALLIGRAPHIC_STACK}`,
    'kaiti': `${CJK_CALLIGRAPHIC_STACK}`,
    'mono': `'JetBrains Mono', monospace, ${CJK_CALLIGRAPHIC_STACK}`
  };

  function applyFontFamily(fontKey) {
    const key = fontKey || (getActiveNotebook() && getActiveNotebook().fontFamily) || appState.fontFamily || 'sans';
    const cssFont = FONT_MAP[key] || FONT_MAP['sans'];
    document.documentElement.style.setProperty('--notebook-font-family', cssFont);
    if (els.fmtFontFamily) els.fmtFontFamily.value = key;
  }

  function applyFontFamilyToSelection(editable, fontValue) {
    if (!editable) return;
    editable.focus();
    restoreCurrentSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const cssFont = FONT_MAP[fontValue] || fontValue;

    if (!sel.isCollapsed) {
      try {
        const range = sel.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontFamily = cssFont;
        span.appendChild(range.extractContents());
        range.insertNode(span);
        range.selectNodeContents(span);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {
        document.execCommand('fontName', false, cssFont);
      }
    } else {
      const nb = getActiveNotebook();
      if (nb) {
        nb.fontFamily = fontValue;
      }
      appState.fontFamily = fontValue;
      applyFontFamily(fontValue);
      persistState();
      showToast(`Đã đổi phông chữ cho sổ.`);
    }
    editable.dispatchEvent(new Event('input', { bubbles: true }));
    scheduleSave();
  }

  function getActiveEditableArea() {
    if (lastActiveEditable && document.contains(lastActiveEditable)) {
      return lastActiveEditable;
    }
    const act = document.activeElement;
    if (act && act.classList && act.classList.contains('template-writing-area')) {
      return act;
    }
    if (els.leftPageSheet) {
      const el = els.leftPageSheet.querySelector('.template-writing-area[contenteditable="true"]');
      if (el) return el;
    }
    return null;
  }

  function applyBadgeToSelection(editable) {
    editable.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    // If already inside a badge, toggle it off
    let parentBadge = range.commonAncestorContainer;
    while (parentBadge && parentBadge !== editable) {
      if (parentBadge.classList && parentBadge.classList.contains('pill-badge')) {
        const textNode = document.createTextNode(parentBadge.textContent);
        parentBadge.parentNode.replaceChild(textNode, parentBadge);
        editable.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      parentBadge = parentBadge.parentNode;
    }

    const selectedText = range.toString() || 'ghi chú';
    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'pill-badge';
    badgeSpan.textContent = selectedText;

    range.deleteContents();
    range.insertNode(badgeSpan);

    const newRange = document.createRange();
    newRange.setStartAfter(badgeSpan);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    editable.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyCodeToSelection(editable) {
    editable.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    let parentCode = range.commonAncestorContainer;
    while (parentCode && parentCode !== editable) {
      if (parentCode.tagName === 'CODE') {
        const textNode = document.createTextNode(parentCode.textContent);
        parentCode.parentNode.replaceChild(textNode, parentCode);
        editable.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      parentCode = parentCode.parentNode;
    }

    const selectedText = range.toString() || 'code';
    const codeEl = document.createElement('code');
    codeEl.textContent = selectedText;

    range.deleteContents();
    range.insertNode(codeEl);

    const newRange = document.createRange();
    newRange.setStartAfter(codeEl);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    editable.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyTodoToSelection(editable) {
    editable.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    const todoSpan = document.createElement('span');
    todoSpan.style.fontFamily = 'monospace';
    todoSpan.style.marginRight = '6px';
    todoSpan.textContent = '☐ ';

    range.insertNode(todoSpan);
    const newRange = document.createRange();
    newRange.setStartAfter(todoSpan);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    editable.dispatchEvent(new Event('input', { bubbles: true }));
  }

  let savedSelectionRange = null;
  let savedSelectionEditable = null;

  function saveCurrentSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRange = sel.getRangeAt(0).cloneRange();
      savedSelectionEditable = lastActiveEditable;
    }
  }

  function restoreCurrentSelection() {
    const target = savedSelectionEditable || lastActiveEditable;
    if (target && document.contains(target)) {
      target.focus();
    }
    if (savedSelectionRange) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRange);
      }
    }
  }

  function applyColorToSelection(editable, color) {
    if (!editable) return;
    editable.focus();
    restoreCurrentSelection();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    try {
      document.execCommand('styleWithCSS', false, true);
    } catch (e) {}

    const hasSelection = !sel.isCollapsed;

    if (color) {
      if (hasSelection) {
        let applied = false;
        try {
          applied = document.execCommand('foreColor', false, color);
        } catch (e) {}

        if (!applied) {
          try {
            const range = sel.getRangeAt(0);
            const span = document.createElement('span');
            span.style.color = color;
            span.appendChild(range.extractContents());
            range.insertNode(span);
            range.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(range);
          } catch (e2) {}
        }
      } else {
        try {
          document.execCommand('foreColor', false, color);
        } catch (e) {}
      }
    } else {
      // Clear color
      try {
        document.execCommand('foreColor', false, 'inherit');
      } catch (e) {
        document.execCommand('removeFormat', false, null);
      }
    }

    editable.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyBgToSelection(editable, bg) {
    if (!editable) return;
    editable.focus();
    restoreCurrentSelection();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    try {
      document.execCommand('styleWithCSS', false, true);
    } catch (e) {}

    const hasSelection = !sel.isCollapsed;

    if (bg) {
      if (hasSelection) {
        let applied = false;
        try {
          // Safari & Chrome on Mac use backColor; Firefox uses hiliteColor
          applied = document.execCommand('hiliteColor', false, bg) || document.execCommand('backColor', false, bg);
        } catch (e) {
          try {
            applied = document.execCommand('backColor', false, bg);
          } catch (e2) {}
        }

        if (!applied) {
          try {
            const range = sel.getRangeAt(0);
            const mark = document.createElement('mark');
            mark.style.backgroundColor = bg;
            mark.style.color = 'inherit';
            mark.appendChild(range.extractContents());
            range.insertNode(mark);
            range.selectNodeContents(mark);
            sel.removeAllRanges();
            sel.addRange(range);
          } catch (e2) {}
        }
      } else {
        try {
          if (!document.execCommand('hiliteColor', false, bg)) {
            document.execCommand('backColor', false, bg);
          }
        } catch (e) {}
      }
    } else {
      // Clear background
      try {
        document.execCommand('backColor', false, 'transparent');
      } catch (e) {
        document.execCommand('removeFormat', false, null);
      }
    }

    editable.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyFormattingToEditable(editable, type, value) {
    if (!editable) return;
    editable.focus();

    if (type === 'badge') {
      applyBadgeToSelection(editable);
      return;
    }
    if (type === 'code') {
      applyCodeToSelection(editable);
      return;
    }
    if (type === 'todo') {
      applyTodoToSelection(editable);
      return;
    }
    if (type === 'color') {
      applyColorToSelection(editable, value);
      return;
    }
    if (type === 'bg') {
      applyBgToSelection(editable, value);
      return;
    }

    switch(type) {
      case 'bold': document.execCommand('bold', false, null); break;
      case 'italic': document.execCommand('italic', false, null); break;
      case 'underline': document.execCommand('underline', false, null); break;
      case 'strike': document.execCommand('strikeThrough', false, null); break;
      case 'h1': document.execCommand('formatBlock', false, '<h1>'); break;
      case 'h2': document.execCommand('formatBlock', false, '<h2>'); break;
      case 'h3': document.execCommand('formatBlock', false, '<h3>'); break;
      case 'bullet': document.execCommand('insertUnorderedList', false, null); break;
      case 'number': document.execCommand('insertOrderedList', false, null); break;
      case 'quote': document.execCommand('formatBlock', false, '<blockquote>'); break;
      case 'hr': document.execCommand('insertHorizontalRule', false, null); break;
      case 'clear': document.execCommand('removeFormat', false, null); break;
      case 'undo': document.execCommand('undo', false, null); break;
      case 'redo': document.execCommand('redo', false, null); break;
    }

    editable.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Universal Formatting for both ProseMirror and Notebook ContentEditable Pages
  function applyFormattingToActiveTarget(type, value) {
    const ed = getCurrentlyFocusedEditor();
    if (ed) {
      switch(type) {
        case 'bold': ed.chain().focus().toggleBold().run(); break;
        case 'italic': ed.chain().focus().toggleItalic().run(); break;
        case 'underline': ed.chain().focus().toggleUnderline().run(); break;
        case 'strike': ed.chain().focus().toggleStrike().run(); break;
        case 'color':
          if (value) ed.chain().focus().setTextColor(value).run();
          else ed.chain().focus().unsetTextColor().run();
          break;
        case 'bg':
          if (value) ed.chain().focus().setTextBg(value).run();
          else ed.chain().focus().unsetTextBg().run();
          break;
        case 'badge': ed.chain().focus().toggleTextBadge().run(); break;
        case 'clear': ed.chain().focus().unsetAllMarks().clearNodes().run(); break;
        case 'h1': ed.chain().focus().toggleHeading({ level: 1 }).run(); break;
        case 'h2': ed.chain().focus().toggleHeading({ level: 2 }).run(); break;
        case 'h3': ed.chain().focus().toggleHeading({ level: 3 }).run(); break;
        case 'bullet': ed.chain().focus().toggleBulletList().run(); break;
        case 'number': ed.chain().focus().toggleOrderedList().run(); break;
        case 'todo': ed.chain().focus().toggleTaskList().run(); break;
        case 'quote': ed.chain().focus().toggleBlockquote().run(); break;
        case 'code': ed.chain().focus().toggleCodeBlock().run(); break;
        case 'hr': ed.chain().focus().setHorizontalRule().run(); break;
        case 'undo': ed.chain().focus().undo().run(); break;
        case 'redo': ed.chain().focus().redo().run(); break;
      }
      return;
    }

    const editable = getActiveEditableArea();
    if (editable && (document.activeElement === editable || editable.contains(document.activeElement) || !document.activeElement || document.activeElement.tagName !== 'INPUT')) {
      applyFormattingToEditable(editable, type, value);
      return;
    }

    let ta = lastActiveTextarea || (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') ? document.activeElement : null);
    if (!ta || !document.contains(ta)) {
      ta = els.leftPageSheet ? els.leftPageSheet.querySelector('input') : null;
    }
    if (ta) {
      applyFormattingToTextarea(ta, type, value);
    }
  }

  function applyFormattingToTextarea(textarea, type, value) {
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value || '';
    const selected = text.substring(start, end);

    let prefix = '';
    let suffix = '';
    let defaultText = 'văn bản';

    switch(type) {
      case 'bold': prefix = '**'; suffix = '**'; defaultText = 'in đậm'; break;
      case 'italic': prefix = '*'; suffix = '*'; defaultText = 'in nghiêng'; break;
      case 'underline': prefix = '<u>'; suffix = '</u>'; defaultText = 'gạch chân'; break;
      case 'strike': prefix = '~~'; suffix = '~~'; defaultText = 'gạch ngang'; break;
      case 'badge': prefix = '<span class="pill-badge">'; suffix = '</span>'; defaultText = 'ghi chú'; break;
      case 'color':
        if (!value) return;
        prefix = `<span style="color: ${value}">`; suffix = '</span>'; break;
      case 'bg':
        if (!value) return;
        prefix = `<mark style="background: ${value}">`; suffix = '</mark>'; break;
      case 'h1': prefix = '\n# '; suffix = '\n'; defaultText = 'Tiêu đề 1'; break;
      case 'h2': prefix = '\n## '; suffix = '\n'; defaultText = 'Tiêu đề 2'; break;
      case 'h3': prefix = '\n### '; suffix = '\n'; defaultText = 'Tiêu đề 3'; break;
      case 'bullet': prefix = '\n• '; suffix = ''; defaultText = 'Danh sách'; break;
      case 'number': prefix = '\n1. '; suffix = ''; defaultText = 'Mục số 1'; break;
      case 'todo': prefix = '\n- [ ] '; suffix = ''; defaultText = 'Việc cần làm'; break;
      case 'quote': prefix = '\n> '; suffix = '\n'; defaultText = 'Trích dẫn'; break;
      case 'code': prefix = '`'; suffix = '`'; defaultText = 'code'; break;
      case 'hr': prefix = '\n\n---\n\n'; suffix = ''; defaultText = ''; break;
      case 'clear': {
        const cleaned = selected.replace(/(\*\*|\*|~~|`)/g, '').replace(/<[^>]+>/g, '');
        textarea.setRangeText(cleaned, start, end, 'select');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      case 'undo':
        document.execCommand('undo');
        return;
      case 'redo':
        document.execCommand('redo');
        return;
    }

    const insertText = selected || defaultText;
    const replacement = prefix + insertText + suffix;
    textarea.setRangeText(replacement, start, end, 'select');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }

  // Format Button States
  function updateFormatButtonStates(activeEd) {
    if (!activeEd) return;
    if (els.fmtBold) els.fmtBold.classList.toggle('is-active', activeEd.isActive('bold'));
    if (els.fmtItalic) els.fmtItalic.classList.toggle('is-active', activeEd.isActive('italic'));
    if (els.fmtUnderline) els.fmtUnderline.classList.toggle('is-active', activeEd.isActive('underline'));
    if (els.fmtStrike) els.fmtStrike.classList.toggle('is-active', activeEd.isActive('strike'));
    if (els.fmtBadgeBtn) els.fmtBadgeBtn.classList.toggle('is-active', activeEd.isActive('textBadge'));

    const textColor = activeEd.getAttributes('textColor').color || 'currentColor';
    if (els.currentColorBar) {
      els.currentColorBar.style.backgroundColor = textColor === 'currentColor' ? 'currentColor' : textColor;
    }
    const textBg = activeEd.getAttributes('textBg').bg || 'transparent';
    if (els.currentBgBar) {
      els.currentBgBar.style.backgroundColor = textBg === 'transparent' ? '#fef08a' : textBg;
    }
  }

  function getCurrentlyFocusedEditor() {
    if (rightEditor && rightEditor.isFocused) return rightEditor;
    if (leftEditor && leftEditor.isFocused) return leftEditor;
    return null;
  }

  function htmlToMarkdown(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;

    temp.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    temp.querySelectorAll('p, div').forEach(el => el.prepend('\n'));
    temp.querySelectorAll('strong, b').forEach(el => { el.textContent = `**${el.textContent}**`; });
    temp.querySelectorAll('em, i').forEach(el => { el.textContent = `*${el.textContent}*`; });
    temp.querySelectorAll('u').forEach(el => { el.textContent = `<u>${el.textContent}</u>`; });
    temp.querySelectorAll('s, strike').forEach(el => { el.textContent = `~~${el.textContent}~~`; });
    temp.querySelectorAll('code').forEach(el => { el.textContent = `\`${el.textContent}\``; });
    temp.querySelectorAll('blockquote').forEach(el => { el.textContent = `\n> ${el.textContent}\n`; });

    return (temp.textContent || temp.innerText || '').trim();
  }

  // Export Markdown
  function exportMarkdown() {
    saveActivePages();
    const nb = getActiveNotebook();
    const markdown = nb.pages.map(p => {
      let pageText = '';
      if (p.template === 'cornell') {
        pageText = `# ${p.topic || p.title || 'Cornell Notes'}\n**Date:** ${p.date || ''} | **No:** ${p.no || ''}\n\n## Cues & Questions\n${htmlToMarkdown(p.cues || '')}\n\n## Notes\n${htmlToMarkdown(p.notes || p.content || '')}\n\n## Summary & Synthesis\n${htmlToMarkdown(p.summary || '')}`;
      } else if (p.template === 'work') {
        const actionLines = (p.actions || []).map(a => `- [${a.checked ? 'x' : ' '}] ${a.text || ''}`).join('\n');
        pageText = `# ${p.project || p.title || 'Work & Project Log'}\n**Date:** ${p.date || ''} | **Deadline:** ${p.deadline || ''} | **Status:** ${p.status || 'WIP'}\n\n## Agenda & Decisions\n${htmlToMarkdown(p.agenda || '')}\n\n## Notes & Discussions\n${htmlToMarkdown(p.discussions || p.content || '')}\n\n## Action Items\n${actionLines}`;
      } else {
        pageText = `# ${p.topic || p.title || 'Ruled Notebook'}\n**Date:** ${p.date || ''} | **No:** ${p.no || ''}\n\n${htmlToMarkdown(p.content || '')}`;
      }
      return pageText;
    }).join('\n\n---\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nb.title.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // JSON Backup / Restore
  function exportJSONBackup() {
    saveActivePages();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `notebook_studio_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function validateImportedState(imported) {
    if (!imported || typeof imported !== 'object' || !Array.isArray(imported.notebooks)) {
      throw new Error('File không có cấu trúc thư viện Notebook Studio hợp lệ.');
    }
    if (imported.notebooks.length > 500) throw new Error('File có quá nhiều cuốn sổ.');
    imported.notebooks.forEach((nb, nbIndex) => {
      if (!nb || typeof nb !== 'object' || typeof nb.title !== 'string' || !Array.isArray(nb.pages)) {
        throw new Error(`Cuốn sổ thứ ${nbIndex + 1} không hợp lệ.`);
      }
      if (nb.pages.length > 5000) throw new Error(`Cuốn sổ “${nb.title}” có quá nhiều trang.`);
      nb.pages.forEach((page, pageIndex) => {
        if (!page || typeof page !== 'object') throw new Error(`Trang ${pageIndex + 1} trong “${nb.title}” không hợp lệ.`);
      });
    });
    return normalizeState(imported);
  }

  function importJSONBackup(file) {
    if (!file || file.size > 25 * 1024 * 1024) {
      showToast('File sao lưu không hợp lệ hoặc lớn hơn 25 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = validateImportedState(JSON.parse(e.target.result));
        if (!confirm(`Khôi phục ${imported.notebooks.length} cuốn sổ từ file này? Thư viện hiện tại sẽ được lưu thành bản sao an toàn.`)) return;
        localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(appState));
        appState = imported;
        currentPageMode = appState.pageMode;
        isTrashView = false;
        if (!persistState()) throw new Error('Không thể lưu thư viện đã nhập.');
        renderLibraryGrid();
        showToast(`Đã khôi phục ${appState.notebooks.length} cuốn sổ.`, 'Hoàn tác', () => {
          const previous = localStorage.getItem(BACKUP_STORAGE_KEY);
          if (!previous) return;
          appState = normalizeState(JSON.parse(previous));
          currentPageMode = appState.pageMode;
          persistState();
          renderLibraryGrid();
        });
      } catch (err) {
        showToast('Không thể khôi phục: ' + err.message);
      }
    };
    reader.onerror = () => showToast('Không thể đọc file sao lưu.');
    reader.readAsText(file);
  }

  // Helpers
  function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function escapeAttr(str) {
    return escapeHTML(str);
  }

  // Setup Global Event Listeners
  function setupEventListeners() {
    // Back to library
    if (els.btnBackToLibrary) els.btnBackToLibrary.addEventListener('click', returnToLibrary);
    if (els.libBrandLogo) els.libBrandLogo.addEventListener('click', returnToLibrary);

    // Library Search & Category
    if (els.libSearchInput) {
      els.libSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderLibraryGrid();
      });
    }
    if (els.libCategoryFilter) {
      els.libCategoryFilter.addEventListener('change', (e) => {
        categoryFilter = e.target.value;
        renderLibraryGrid();
      });
    }
    if (els.libSortSelect) {
      els.libSortSelect.addEventListener('change', (e) => {
        sortMode = e.target.value;
        renderLibraryGrid();
      });
    }
    if (els.btnToggleTrash) {
      els.btnToggleTrash.addEventListener('click', () => {
        isTrashView = !isTrashView;
        renderLibraryGrid();
      });
    }

    // Page Navigation
    if (els.btnPrevPage) els.btnPrevPage.addEventListener('click', turnPageBackward);
    if (els.btnNextPage) els.btnNextPage.addEventListener('click', turnPageForward);

    function handlePageInputJump(e) {
      const nb = getActiveNotebook();
      if (!nb) return;
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 1 && val <= nb.pages.length) {
        jumpToPage(val);
      } else {
        e.target.value = appState.activePageIndex + 1;
      }
    }

    if (els.readerPageInput) {
      els.readerPageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handlePageInputJump(e);
      });
      els.readerPageInput.addEventListener('change', handlePageInputJump);
    }

    // Zoom Controls
    if (els.btnZoomIn) {
      els.btnZoomIn.addEventListener('click', zoomIn);
    }
    if (els.btnZoomOut) {
      els.btnZoomOut.addEventListener('click', zoomOut);
    }
    if (els.readerScaleValue) {
      els.readerScaleValue.addEventListener('click', resetZoom);
    }
    if (els.btnFitPage) {
      els.btnFitPage.addEventListener('click', handleFitPage);
    }
    if (els.btnFitWidth) {
      els.btnFitWidth.addEventListener('click', handleFitWidth);
    }

    // Ctrl/Cmd + Mouse Wheel Zoom
    if (els.openBookWorkspace) {
      els.openBookWorkspace.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (e.deltaY < 0) zoomIn();
          else zoomOut();
        }
      }, { passive: false });
    }

    // Window Resize -> Recalculate Fit if active
    window.addEventListener('resize', () => {
      const isCompactViewport = window.innerWidth <= 900;
      if (!els.notebookView.classList.contains('hidden') && isCompactViewport !== wasCompactViewport) {
        applyPageMode(isCompactViewport ? '1-page' : appState.pageMode, false);
      }
      wasCompactViewport = isCompactViewport;
      if (els.btnFitPage && els.btnFitPage.classList.contains('active')) {
        handleFitPage();
      } else if (els.btnFitWidth && els.btnFitWidth.classList.contains('active')) {
        handleFitWidth();
      }
    });

    // Mode Toggle: 1-Page vs 2-Pages
    if (els.btnMode1Page) {
      els.btnMode1Page.addEventListener('click', () => applyPageMode('1-page'));
    }
    if (els.btnMode2Pages) {
      els.btnMode2Pages.addEventListener('click', () => applyPageMode('2-page'));
    }

    // Template Chooser
    if (els.readerTemplateSelect) {
      els.readerTemplateSelect.addEventListener('change', (e) => {
        changePageTemplate(e.target.value);
      });
    }

    // Add Page & Delete Page
    if (els.btnAddPage) {
      els.btnAddPage.addEventListener('click', addPageToCurrentBook);
    }
    if (els.btnDeleteCurrentPage) {
      els.btnDeleteCurrentPage.addEventListener('click', deleteCurrentPage);
    }

    // Rename & Copy Link Notebook
    if (els.btnRenameBook) {
      els.btnRenameBook.addEventListener('click', renameCurrentNotebook);
    }
    if (els.btnCopyBookLink) {
      els.btnCopyBookLink.addEventListener('click', copyCurrentBookUrl);
    }
    if (els.openBookTitle) {
      els.openBookTitle.addEventListener('click', renameCurrentNotebook);
    }

    // Prevent losing text selection on clicking formatting buttons, swatches, or menus
    document.querySelectorAll('.editor-toolbar .tool-btn, .editor-toolbar .tool-badge-btn, .editor-toolbar .color-swatch, .editor-toolbar .export-menu').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        saveCurrentSelection();
      });
    });

    // Formatting Toolbar Event Listeners (Universal)
    if (els.fmtBold) els.fmtBold.addEventListener('click', () => applyFormattingToActiveTarget('bold'));
    if (els.fmtItalic) els.fmtItalic.addEventListener('click', () => applyFormattingToActiveTarget('italic'));
    if (els.fmtUnderline) els.fmtUnderline.addEventListener('click', () => applyFormattingToActiveTarget('underline'));
    if (els.fmtStrike) els.fmtStrike.addEventListener('click', () => applyFormattingToActiveTarget('strike'));
    if (els.fmtBadgeBtn) els.fmtBadgeBtn.addEventListener('click', () => applyFormattingToActiveTarget('badge'));
    if (els.fmtClear) els.fmtClear.addEventListener('click', () => applyFormattingToActiveTarget('clear'));

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

    // Global selection tracking
    document.addEventListener('selectionchange', () => {
      const act = document.activeElement;
      if (act && act.classList && act.classList.contains('template-writing-area')) {
        lastActiveEditable = act;
        saveCurrentSelection();
      }
    });

    function openPopoverMenu(menuEl, otherMenuEls = []) {
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

    function closeAllPopoverMenus() {
      [els.fmtColorPalette, els.fmtBgPalette, els.exportMenu].forEach(m => {
        if (m) {
          m.setAttribute('hidden', '');
          m.hidden = true;
          m.classList.remove('is-open');
        }
      });
    }

    // Color popover
    if (els.fmtColorBtn && els.fmtColorPalette) {
      els.fmtColorBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        saveCurrentSelection();
      });
      els.fmtColorBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPopoverMenu(els.fmtColorPalette, [els.fmtBgPalette, els.exportMenu]);
      });

      els.fmtColorPalette.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });

      els.fmtColorPalette.querySelectorAll('.color-swatch').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
        });
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

    // Bg popover
    if (els.fmtBgBtn && els.fmtBgPalette) {
      els.fmtBgBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        saveCurrentSelection();
      });
      els.fmtBgBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPopoverMenu(els.fmtBgPalette, [els.fmtColorPalette, els.exportMenu]);
      });

      els.fmtBgPalette.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });

      els.fmtBgPalette.querySelectorAll('.color-swatch').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
        });
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

    // Font family control
    if (els.fmtFontFamily) {
      els.fmtFontFamily.addEventListener('change', (e) => {
        const chosen = e.target.value;
        const editable = getActiveEditableArea();
        const sel = window.getSelection();
        if (editable && sel && !sel.isCollapsed && editable.contains(sel.anchorNode)) {
          applyFontFamilyToSelection(editable, chosen);
        } else {
          const nb = getActiveNotebook();
          if (nb) nb.fontFamily = chosen;
          appState.fontFamily = chosen;
          applyFontFamily(chosen);
          persistState();
          showToast('Đã đổi phông chữ cho sổ.');
        }
      });
    }

    // Font size controls
    if (els.fontIncreaseBtn) els.fontIncreaseBtn.addEventListener('click', () => updateFontSize(1));
    if (els.fontDecreaseBtn) els.fontDecreaseBtn.addEventListener('click', () => updateFontSize(-1));
    if (els.fontResetBtn) els.fontResetBtn.addEventListener('click', () => updateFontSize(0, true));

    // Export popover
    if (els.exportBtn && els.exportMenu) {
      els.exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPopoverMenu(els.exportMenu, [els.fmtColorPalette, els.fmtBgPalette]);
      });

      if (els.exportMdBtn) {
        els.exportMdBtn.addEventListener('click', () => {
          closeAllPopoverMenus();
          exportMarkdown();
        });
      }
      if (els.exportPrintBtn) {
        els.exportPrintBtn.addEventListener('click', () => {
          els.exportMenu.hidden = true;
          window.print();
        });
      }
      if (els.exportJsonBtn) {
        els.exportJsonBtn.addEventListener('click', () => {
          els.exportMenu.hidden = true;
          exportJSONBackup();
        });
      }
      if (els.importJsonBtn && els.fileInputJson) {
        els.importJsonBtn.addEventListener('click', () => {
          els.exportMenu.hidden = true;
          els.fileInputJson.click();
        });
        els.fileInputJson.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            importJSONBackup(e.target.files[0]);
          }
        });
      }
    }

    if (els.btnResetLibrary) {
      els.btnResetLibrary.addEventListener('click', () => {
        if (confirm('Khôi phục danh sách sổ về 4 mẫu sổ ghi chép A4 mặc định (Cornell, Work Notes, Ruled, Freeform)?')) {
          localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(appState));
          appState = normalizeState(JSON.parse(JSON.stringify(INITIAL_LIBRARY_DATA)));
          currentPageMode = appState.pageMode;
          isTrashView = false;
          persistState();
          renderLibraryGrid();
          showToast('Đã khôi phục thư viện mẫu. Bản dữ liệu trước đó đã được giữ làm bản sao an toàn.');
        }
      });
    }

    // Modal: New Book
    if (els.btnOpenNewBookModal) {
      els.btnOpenNewBookModal.addEventListener('click', openNewNotebookModal);
    }

    if (els.btnCloseModal) els.btnCloseModal.addEventListener('click', closeNewNotebookModal);
    if (els.btnCancelModal) els.btnCancelModal.addEventListener('click', closeNewNotebookModal);

    document.querySelectorAll('.cover-color-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.cover-color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedCoverGradient = opt.dataset.gradient;
      });
    });

    if (els.btnConfirmNewNotebook) {
      els.btnConfirmNewNotebook.addEventListener('click', () => {
        const title = els.newNotebookTitle.value.trim() || 'Cuốn Sổ Mới';
        const category = els.newNotebookCategory.value.trim() || 'Ghi chép';
        const template = (els.newNotebookTemplate && els.newNotebookTemplate.value) || 'cornell';
        const newId = 'nb-' + Date.now();
        const createdAt = new Date().toISOString();
        const newBook = {
          id: newId,
          title,
          author: 'Cá nhân',
          category,
          lang: 'EN · VI',
          coverGradient: selectedCoverGradient,
          coverTextColor: '#ffffff',
          createdAt,
          updatedAt: createdAt,
          lastPageIndex: 0,
          isPinned: false,
          pages: [
            {
              id: 'p-' + Date.now() + '-1',
              lang: 'VI',
              title: 'TRANG 1',
              topic: title,
              project: title,
              date: new Date().toLocaleDateString('vi-VN'),
              no: '01',
              deadline: '',
              status: 'WIP',
              template: template,
              updatedAt: createdAt,
              content: `# ${title.toUpperCase()}\n\nBắt đầu ghi chép...\n`
            },
            {
              id: 'p-' + Date.now() + '-2',
              lang: 'EN',
              title: 'TRANG 2',
              topic: title,
              project: title,
              date: new Date().toLocaleDateString('vi-VN'),
              no: '02',
              deadline: '',
              status: 'TODO',
              template: template,
              updatedAt: createdAt,
              content: `# TRANG 2\n\nTiếp tục ghi chép...\n`
            }
          ]
        };

        appState.notebooks.unshift(newBook);
        persistState();
        closeNewNotebookModal();
        openNotebook(newId);
      });
    }

    if (els.newNotebookModal) {
      els.newNotebookModal.addEventListener('click', (e) => {
        if (e.target === els.newNotebookModal) closeNewNotebookModal();
      });
    }

    // Close popovers
    document.addEventListener('click', (e) => {
      const isInsideColor = (els.fmtColorPalette && els.fmtColorPalette.contains(e.target)) || (els.fmtColorBtn && els.fmtColorBtn.contains(e.target));
      const isInsideBg = (els.fmtBgPalette && els.fmtBgPalette.contains(e.target)) || (els.fmtBgBtn && els.fmtBgBtn.contains(e.target));
      const isInsideExport = (els.exportMenu && els.exportMenu.contains(e.target)) || (els.exportBtn && els.exportBtn.contains(e.target));
      if (!isInsideColor && !isInsideBg && !isInsideExport) {
        closeAllPopoverMenus();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && els.newNotebookModal && els.newNotebookModal.classList.contains('open')) {
        closeNewNotebookModal();
      }
    });

    // Save on blur & unload
    window.addEventListener('blur', saveActivePages);
    window.addEventListener('beforeunload', saveActivePages);

    // Arrow keys for page turning (Only when not focused in input/textarea)
    window.addEventListener('keydown', (e) => {
      if (els.notebookView.classList.contains('hidden')) return;

      const activeEl = document.activeElement;
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + / - / 0 Zoom shortcuts
      if (isMod && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '_' || e.key === '0')) {
        e.preventDefault();
        if (e.key === '=' || e.key === '+') {
          zoomIn();
        } else if (e.key === '-' || e.key === '_') {
          zoomOut();
        } else if (e.key === '0') {
          resetZoom();
        }
        return;
      }

      // Handle Cmd/Ctrl shortcuts in textareas & inputs
      if (isMod && activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
        const k = e.key.toLowerCase();
        if (k === 'b') {
          e.preventDefault();
          applyFormattingToTextarea(activeEl, 'bold');
          return;
        } else if (k === 'i') {
          e.preventDefault();
          applyFormattingToTextarea(activeEl, 'italic');
          return;
        } else if (k === 'u') {
          e.preventDefault();
          applyFormattingToTextarea(activeEl, 'underline');
          return;
        } else if (k === 's') {
          e.preventDefault();
          saveActivePages();
          return;
        }
      }

      if (activeEl) {
        const tag = activeEl.tagName;
        if (tag === 'TEXTAREA' || tag === 'INPUT' || activeEl.isContentEditable || activeEl.classList.contains('ProseMirror')) {
          return;
        }
      }

      if (e.key === 'ArrowRight') turnPageForward();
      if (e.key === 'ArrowLeft') turnPageBackward();
    });
  }

  // Initialize
  function init() {
    setupEventListeners();
    setupRouting();
    persistState();
    applyFontSize(appState.fontSize || 16);
    applyFontFamily(appState.fontFamily || 'sans');
    renderLibraryGrid();

    // Deep-link / route recovery on initial page load or reload
    handleRouteFromUrl(true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
