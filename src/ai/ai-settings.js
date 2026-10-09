/**
 * AI Settings Panel
 *
 * Modal panel for configuring AI API Key, Custom Base URL (OpenRouter, DeepSeek,
 * Ollama, Groq, etc.), and Custom Model preferences.
 * Settings are stored in localStorage for full user privacy and control.
 */

import {
  getSavedApiKey,
  saveApiKey,
  getSavedBaseUrl,
  saveBaseUrl,
  getPreferredModel,
  setPreferredModel,
  testApiKey
} from './ai-service.js';

let panelEl = null;

const BASE_URL_PRESETS = [
  { name: 'OpenAI', url: 'https://api.openai.com/v1', hint: 'Chính chủ OpenAI' },
  { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', hint: 'Claude, Llama, Gemini,...' },
  { name: 'DeepSeek', url: 'https://api.deepseek.com/v1', hint: 'V3 & R1 siêu rẻ' },
  { name: 'Groq', url: 'https://api.groq.com/openai/v1', hint: 'Tốc độ cực nhanh' },
  { name: 'Ollama (Server)', url: 'http://localhost:11434/v1', hint: 'Ollama chạy trên máy chủ' },
];

function createPanelHTML() {
  const currentKey = getSavedApiKey();
  const currentBaseUrl = getSavedBaseUrl();
  const currentModel = getPreferredModel();
  const maskedKey = currentKey ? `${currentKey.slice(0, 7)}${'•'.repeat(Math.max(8, currentKey.length - 11))}${currentKey.slice(-4)}` : '';

  return `
    <div class="ai-settings-backdrop" id="aiSettingsBackdrop"></div>
    <div class="ai-settings-panel" id="aiSettingsPanel" role="dialog" aria-label="AI Settings">
      <div class="ai-settings-header">
        <div class="ai-settings-header-icon">⚙️</div>
        <h2 class="ai-settings-title">Cài đặt AI Co-pilot</h2>
        <button class="ai-settings-close" id="aiSettingsClose" aria-label="Đóng">✕</button>
      </div>

      <div class="ai-settings-body">
        <!-- 1. BASE URL CONFIG -->
        <div class="ai-settings-section">
          <label class="ai-settings-label" for="aiBaseUrlInput">
            🌐 API Base URL
            <span class="ai-settings-sublabel">Tương thích mọi máy chủ chuẩn OpenAI (OpenAI, OpenRouter, DeepSeek, Groq, Ollama,...)</span>
          </label>
          <div class="ai-settings-key-row">
            <input type="text" id="aiBaseUrlInput" class="ai-settings-input"
                   placeholder="https://api.openai.com/v1" value="${currentBaseUrl}"
                   autocomplete="off" spellcheck="false" />
          </div>
          <div class="ai-url-presets">
            ${BASE_URL_PRESETS.map(p => `
              <button type="button" class="ai-url-preset-btn ${currentBaseUrl === p.url ? 'is-active' : ''}" data-url="${p.url}" title="${p.hint}">
                ${p.name}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="ai-settings-divider"></div>

        <!-- 2. API KEY CONFIG -->
        <div class="ai-settings-section">
          <label class="ai-settings-label" for="aiApiKeyInput">
            🔑 API Key
            <span class="ai-settings-sublabel">Khóa API cá nhân (lưu an toàn trong trình duyệt của bạn)</span>
          </label>
          <div class="ai-settings-key-row">
            <input type="password" id="aiApiKeyInput" class="ai-settings-input"
                   placeholder="Nhập API Key... (hoặc bỏ trống nếu dùng Ollama local)" value="${currentKey}"
                   autocomplete="off" spellcheck="false" />
            <button id="aiKeyToggleVisibility" class="ai-settings-icon-btn" title="Hiện/ẩn key" type="button">👁️</button>
          </div>
          <div class="ai-settings-key-status" id="aiKeyStatus">
            ${currentKey ? `<span class="ai-key-saved">✓ Đã lưu: ${maskedKey}</span>` : '<span class="ai-key-empty">Chưa có Key — Dùng key server trong .env hoặc Ollama</span>'}
          </div>
          <div class="ai-settings-key-actions">
            <button id="aiSaveAll" class="ai-settings-btn ai-settings-btn--primary" type="button">💾 Lưu cấu hình</button>
            <button id="aiKeyTest" class="ai-settings-btn" type="button">🧪 Test kết nối</button>
            <button id="aiKeyRemove" class="ai-settings-btn ai-settings-btn--danger" type="button">🗑️ Xóa Key</button>
          </div>
        </div>

        <div class="ai-settings-divider"></div>

        <!-- 3. MODEL SELECTION (CUSTOM ONLY) -->
        <div class="ai-settings-section">
          <label class="ai-settings-label" for="aiCustomModelInput">
            🤖 Mô hình AI (Model ID)
            <span class="ai-settings-sublabel">Nhập tên model ID bất kỳ (ví dụ: gpt-4o-mini, deepseek-chat, claude-3-5-sonnet, gemini-2.0-flash, llama-3.3-70b, qwen-2.5-coder...)</span>
          </label>
          <div class="ai-settings-key-row">
            <input type="text" id="aiCustomModelInput" class="ai-settings-input"
                   placeholder="vd: gpt-4o-mini, deepseek-chat, claude-3.5-sonnet..."
                   value="${currentModel}" autocomplete="off" spellcheck="false" />
          </div>
          <span class="ai-model-active-hint">Đang chọn: <strong id="aiActiveModelLabel">${currentModel}</strong></span>
        </div>

        <div class="ai-settings-divider"></div>

        <!-- 4. BILINGUAL APP INTEGRATION -->
        <div class="ai-settings-section">
          <label class="ai-settings-label" for="bilingualUrlInput">
            📚 Liên kết Thư viện Bilingual App
            <span class="ai-settings-sublabel">Địa chỉ máy chủ Bilingual App để đọc sách song song trong Study Mode</span>
          </label>
          <div class="ai-settings-key-row">
            <input type="text" id="bilingualUrlInput" class="ai-settings-input"
                   placeholder="http://127.0.0.1:27099" value="http://127.0.0.1:27099"
                   autocomplete="off" spellcheck="false" />
          </div>
          <div class="ai-settings-key-status" id="bilingualStatus">
            <span class="ai-key-saved">🔒 Kết nối qua Backend Proxy an toàn (Server-to-Server)</span>
          </div>
          <div class="ai-settings-key-actions">
            <button id="bilingualSaveBtn" class="ai-settings-btn ai-settings-btn--primary" type="button">💾 Lưu cấu hình Sách</button>
            <button id="bilingualTestBtn" class="ai-settings-btn" type="button">🧪 Test kết nối Sách</button>
          </div>
        </div>

        <div class="ai-settings-divider"></div>

        <div class="ai-settings-section ai-settings-info">
          <p>🔒 <strong>Bảo mật tối đa</strong>: API Key và Base URL được lưu hoàn toàn trên trình duyệt của bạn (localStorage). Không bao giờ lưu vào CSDL máy chủ.</p>
          <p>💡 <strong>Gợi ý nhà cung cấp</strong>: Bạn có thể dùng <strong>DeepSeek</strong> cho chi phí siêu rẻ, <strong>OpenRouter</strong> để truy cập mọi mô hình thế giới, hoặc <strong>Ollama</strong> để chạy offline 100% không tốn một đồng nào.</p>
        </div>
      </div>
    </div>
  `;
}

function ensurePanel() {
  if (!panelEl) {
    panelEl = document.getElementById('aiSettingsContainer');
  }
  if (panelEl) return;
  panelEl = document.createElement('div');
  panelEl.id = 'aiSettingsContainer';
  panelEl.className = 'ai-settings-container';
  panelEl.innerHTML = createPanelHTML();
  document.body.appendChild(panelEl);
  bindSettingsEvents();
}

function bindSettingsEvents() {
  const backdrop = panelEl.querySelector('#aiSettingsBackdrop');
  const closeBtn = panelEl.querySelector('#aiSettingsClose');
  const saveAllBtn = panelEl.querySelector('#aiSaveAll');
  const testBtn = panelEl.querySelector('#aiKeyTest');
  const removeBtn = panelEl.querySelector('#aiKeyRemove');
  const keyInput = panelEl.querySelector('#aiApiKeyInput');
  const baseUrlInput = panelEl.querySelector('#aiBaseUrlInput');
  const customModelInput = panelEl.querySelector('#aiCustomModelInput');
  const applyCustomModelBtn = panelEl.querySelector('#aiApplyCustomModel');
  const toggleBtn = panelEl.querySelector('#aiKeyToggleVisibility');
  const statusEl = panelEl.querySelector('#aiKeyStatus');
  const activeModelLabel = panelEl.querySelector('#aiActiveModelLabel');
  const presetBtns = panelEl.querySelectorAll('.ai-url-preset-btn');

  backdrop.addEventListener('click', closeSettings);
  closeBtn.addEventListener('click', closeSettings);

  // Toggle key visibility
  toggleBtn.addEventListener('click', () => {
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
    toggleBtn.textContent = keyInput.type === 'password' ? '👁️' : '🙈';
  });

  // Base URL presets
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      baseUrlInput.value = url;
      presetBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      saveBaseUrl(url);
    });
  });

  // Save All
  saveAllBtn.addEventListener('click', () => {
    const key = keyInput.value.trim();
    const url = baseUrlInput.value.trim() || 'https://api.openai.com/v1';
    const model = customModelInput.value.trim() || getPreferredModel();

    saveApiKey(key);
    saveBaseUrl(url);
    setPreferredModel(model);

    if (key) {
      const masked = `${key.slice(0, 7)}${'•'.repeat(Math.max(8, key.length - 11))}${key.slice(-4)}`;
      statusEl.className = 'ai-key-saved';
      statusEl.textContent = `✓ Đã lưu cài đặt! (${masked})`;
    } else {
      statusEl.className = 'ai-key-empty';
      statusEl.textContent = '✓ Đã lưu URL & Model (Key trống).';
    }
  });

  // Test Connection
  testBtn.addEventListener('click', async () => {
    const key = keyInput.value.trim();
    const baseUrl = baseUrlInput.value.trim() || 'https://api.openai.com/v1';
    const model = customModelInput.value.trim() || getPreferredModel();

    testBtn.disabled = true;
    testBtn.textContent = '⏳ Đang kiểm tra...';
    statusEl.className = '';
    statusEl.textContent = 'Đang kết nối tới máy chủ AI...';

    try {
      const result = await testApiKey(key, baseUrl, model);
      if (result.ok) {
        statusEl.className = 'ai-key-valid';
        statusEl.textContent = `✓ ${String(result.message || 'Kết nối thành công!')}`;
      } else {
        statusEl.className = 'ai-key-invalid';
        statusEl.textContent = `✕ ${String(result.error || 'Kết nối thất bại')}`;
      }
    } catch (err) {
      statusEl.className = 'ai-key-invalid';
      statusEl.textContent = `✕ Lỗi kết nối: ${String(err?.message || 'Không xác định')}`;
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = '🧪 Test kết nối';
    }
  });

  // Remove Key
  removeBtn.addEventListener('click', () => {
    saveApiKey('');
    keyInput.value = '';
    statusEl.className = 'ai-key-empty';
    statusEl.textContent = 'Đã xóa Key.';
  });

  // Custom Model Input & Sync
  function updateFromCustomInput() {
    const val = customModelInput.value.trim();
    if (!val) return;
    setPreferredModel(val);
    if (activeModelLabel) activeModelLabel.textContent = val;
  }

  customModelInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      updateFromCustomInput();
    }
  });

  customModelInput.addEventListener('input', () => {
    const val = customModelInput.value.trim();
    if (val) {
      setPreferredModel(val);
      if (activeModelLabel) activeModelLabel.textContent = val;
    }
  });

  customModelInput.addEventListener('change', updateFromCustomInput);

  // ─── Bilingual App Integration Handlers ───
  const bilingualUrlInput = panelEl.querySelector('#bilingualUrlInput');
  const bilingualStatus = panelEl.querySelector('#bilingualStatus');
  const bilingualSaveBtn = panelEl.querySelector('#bilingualSaveBtn');
  const bilingualTestBtn = panelEl.querySelector('#bilingualTestBtn');

  // Load current Bilingual App config from backend
  if (bilingualUrlInput) {
    fetch('/api/bilingual/config')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.bilingualUrl) {
          bilingualUrlInput.value = data.bilingualUrl;
        }
      })
      .catch(() => {});
  }

  // Save Bilingual App URL
  if (bilingualSaveBtn) {
    bilingualSaveBtn.addEventListener('click', async () => {
      const url = bilingualUrlInput.value.trim();
      if (!url) return;
      bilingualSaveBtn.disabled = true;
      bilingualSaveBtn.textContent = '⏳ Đang lưu...';
      try {
        const res = await fetch('/api/bilingual/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bilingualUrl: url })
        });
        const data = await res.json();
        if (data.ok) {
          bilingualStatus.className = 'ai-key-saved';
          bilingualStatus.textContent = '✓ Đã lưu cấu hình Bilingual URL thành công!';
        } else {
          bilingualStatus.className = 'ai-key-empty';
          bilingualStatus.textContent = `✕ Lỗi: ${String(data.error || 'Không lưu được')}`;
        }
      } catch (err) {
        bilingualStatus.className = 'ai-key-empty';
        bilingualStatus.textContent = `✕ Lỗi kết nối: ${String(err?.message || 'Không xác định')}`;
      } finally {
        bilingualSaveBtn.disabled = false;
        bilingualSaveBtn.textContent = '💾 Lưu cấu hình Sách';
      }
    });
  }

  // Test Bilingual App Connection
  if (bilingualTestBtn) {
    bilingualTestBtn.addEventListener('click', async () => {
      bilingualTestBtn.disabled = true;
      bilingualTestBtn.textContent = '⏳ Đang kiểm tra...';
      bilingualStatus.className = '';
      bilingualStatus.style.color = '#94a3b8';
      bilingualStatus.textContent = '⏳ Đang gửi tín hiệu kiểm tra tới máy chủ...';
      try {
        const res = await fetch('/api/bilingual/test');
        const data = await res.json();
        bilingualStatus.style.color = '';
        if (data.ok) {
          bilingualStatus.className = 'ai-key-saved';
          bilingualStatus.textContent = `✓ ${String(data.message || 'Kết nối thành công!')}`;
        } else {
          bilingualStatus.className = 'ai-key-empty';
          bilingualStatus.textContent = `✕ ${String(data.error || 'Kết nối thất bại')}`;
        }
      } catch (err) {
        bilingualStatus.style.color = '';
        bilingualStatus.className = 'ai-key-empty';
        bilingualStatus.textContent = `✕ Lỗi kết nối: ${String(err?.message || 'Không xác định')}`;
      } finally {
        bilingualTestBtn.disabled = false;
        bilingualTestBtn.textContent = '🧪 Test kết nối Sách';
      }
    });
  }
}

export function openSettings() {
  ensurePanel();
  // Refresh values from localStorage & backend
  const keyInput = panelEl.querySelector('#aiApiKeyInput');
  const baseUrlInput = panelEl.querySelector('#aiBaseUrlInput');
  const customModelInput = panelEl.querySelector('#aiCustomModelInput');
  const activeModelLabel = panelEl.querySelector('#aiActiveModelLabel');
  const bilingualUrlInput = panelEl.querySelector('#bilingualUrlInput');

  if (keyInput) keyInput.value = getSavedApiKey();
  if (baseUrlInput) baseUrlInput.value = getSavedBaseUrl();
  const currentModel = getPreferredModel();
  if (customModelInput) customModelInput.value = currentModel;
  if (activeModelLabel) activeModelLabel.textContent = currentModel;

  if (bilingualUrlInput) {
    fetch('/api/bilingual/config')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.bilingualUrl) {
          bilingualUrlInput.value = data.bilingualUrl;
        }
      })
      .catch(() => {});
  }

  panelEl.classList.add('is-open');
}

export function closeSettings() {
  if (!panelEl) return;
  panelEl.classList.remove('is-open');
}

export function toggleSettings() {
  ensurePanel();
  if (panelEl.classList.contains('is-open')) {
    closeSettings();
  } else {
    openSettings();
  }
}
