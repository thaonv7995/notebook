/**
 * Task Inbox (initial implementation)
 *
 * Placeholder component so main.js integration can compile while
 * the inbox UI is implemented incrementally.
 */

let isOpen = false;
let panelEl = null;

export function setupTaskInbox() {
  if (!panelEl) {
    panelEl = document.createElement('div');
    panelEl.id = 'taskInboxPanel';
    panelEl.hidden = true;
    panelEl.style.cssText = [
      'position:fixed',
      'top:72px',
      'right:16px',
      'width:360px',
      'max-height:70vh',
      'overflow:auto',
      'background:#0f172a',
      'color:#fff',
      'border:1px solid rgba(255,255,255,.08)',
      'border-radius:12px',
      'padding:12px',
      'z-index:10000',
      'box-shadow:0 20px 40px rgba(0,0,0,.35)'
    ].join(';');

    panelEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>Task Inbox</strong>
        <button id="taskInboxCloseBtn" type="button">✕</button>
      </div>
      <div style="margin-top:8px;font-size:12px;opacity:.8">
        Task Center đang được triển khai.
      </div>
      <div
        id="taskInboxCount"
        style="margin-top:6px;font-size:12px;color:#94a3b8"
      >
        0 task
      </div>
      <div
        id="taskInboxList"
        style="margin-top:12px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px"
      >
        <div style="font-size:12px;opacity:.7">
          Chưa có task hiển thị.
        </div>
      </div>
      <div style="margin-top:12px">
        <button id="taskInboxCaptureBtn" type="button">
          Quick Capture
        </button>
      </div>
    `;

    document.body.appendChild(panelEl);

    panelEl.querySelector('#taskInboxCloseBtn')?.addEventListener('click', () => {
      closeTaskInbox();
    });

    panelEl.querySelector('#taskInboxCaptureBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('quick-capture:open'));
      closeTaskInbox();
    });

    panelEl.addEventListener('dblclick', () => {
      openTaskInbox();
    });
  }

  window.addEventListener('task-inbox:close', () => {
    isOpen = false;
    if (panelEl) panelEl.hidden = true;
  });

  window.addEventListener('task-inbox:open', () => {
    openTaskInbox();
  });
}

export function openTaskInbox() {
  isOpen = true;
  if (panelEl) {
    panelEl.hidden = false;

    const countEl = panelEl.querySelector('#taskInboxCount');
    const listEl = panelEl.querySelector('#taskInboxList');

    const tasks = Array.isArray(window.__NOTEBOOK_TASKS__)
      ? window.__NOTEBOOK_TASKS__
      : [];

    if (countEl) {
      countEl.textContent = `${tasks.length} task`;
    }

    if (listEl) {
      listEl.innerHTML = tasks.length
        ? tasks.slice(0, 20).map(task => `
            <div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)">
              <div style="font-weight:600">${task.title || 'Untitled task'}</div>
              <div style="font-size:11px;opacity:.7">
                ${task.status || 'inbox'}
              </div>
            </div>
          `).join('')
        : `
          <div style="font-size:12px;opacity:.7">
            Chưa có task nào trong Inbox.
          </div>
        `;
    }
  }

  window.dispatchEvent(new CustomEvent('task-inbox:opened'));

  console.info('[TaskInbox] open');
}

export function closeTaskInbox() {
  isOpen = false;
  if (panelEl) {
    panelEl.hidden = true;
  }
}

export function isTaskInboxOpen() {
  return isOpen;
}
