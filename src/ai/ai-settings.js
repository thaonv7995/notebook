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
  { name: 'Ollama (Local)', url: 'http://localhost:11434/v1', hint: 'Chạy offline máy tính' },
];

const MODEL_PRESETS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Nhanh, thông minh, tiết kiệm', badge: 'Khuyên dùng', badgeClass: 'recommended' },
  { id: 'gpt-4o', name: 'GPT-4o', desc: 'Mạnh nhất OpenAI, suy luận sâu', badge: 'Pro', badgeClass: 'pro' },
  { id: 'deepseek-chat', name: 'DeepSeek-V3', desc: 'Mô hình chat thông minh, giá cực rẻ', badge: 'Tiết kiệm', badgeClass: 'value' },
  { id: 'deepseek-reasoner', name: 'DeepSeek-R1', desc: 'Mô hình suy luận chuyên sâu Reasoning', badge: 'Reasoning', badgeClass: 'pro' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', desc: 'Văn phong tự nhiên (qua OpenRouter)', badge: 'Viết hay', badgeClass: 'pro' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', desc: 'Mã nguồn mở mạnh nhất Meta (Groq/OpenRouter)', badge: 'Open', badgeClass: 'value' },
];

function createPanelHTML() {
  const currentKey = getSavedApiKey();
  const currentBaseUrl = getSavedBaseUrl();
  const currentModel = getPreferredModel();
  const maskedKey = currentKey ? `${currentKey.slice(0, 7)}${'•'.repeat(Math.max(8, currentKey.length - 11))}${currentKey.slice(-4)}` : '';

  const isPresetModel = MODEL_PRESETS.some(m => m.id === currentModel);

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

        <!-- 3. MODEL SELECTION -->
        <div class="ai-settings-section">
          <label class="ai-settings-label">
            🤖 Mô hình AI
            <span class="ai-settings-sublabel">Chọn mô hình gợi ý sẵn hoặc tự nhập bất kỳ model ID nào</span>
          </label>
          <div class="ai-model-options" id="aiModelPresetsList">
            ${MODEL_PRESETS.map(m => `
              <label class="ai-model-option ${currentModel === m.id ? 'is-active' : ''}">
                <input type="radio" name="aiModel" value="${m.id}" ${currentModel === m.id ? 'checked' : ''} />
                <div class="ai-model-card">
                  <span class="ai-model-name">${m.name}</span>
                  <span class="ai-model-badge ai-model-badge--${m.badgeClass}">${m.badge}</span>
                  <span class="ai-model-desc">${m.desc}</span>
                </div>
              </label>
            `).join('')}
          </div>

          <!-- Custom Model ID Input -->
          <div class="ai-custom-model-box">
            <label class="ai-settings-sublabel" for="aiCustomModelInput">Hoặc nhập tên Model ID tùy ý:</label>
            <div class="ai-custom-model-row">
              <input type="text" id="aiCustomModelInput" class="ai-settings-input"
                     placeholder="vd: qwen-2.5-coder-32b, llama3.2, mistralai/mistral-large..."
                     value="${currentModel}" autocomplete="off" spellcheck="false" />
              <button id="aiApplyCustomModel" class="ai-settings-btn" type="button">Áp dụng</button>
            </div>
            <span class="ai-model-active-hint">Đang chọn: <strong id="aiActiveModelLabel">${currentModel}</strong></span>
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
  const modelOptions = panelEl.querySelectorAll('.ai-model-option');

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
      statusEl.innerHTML = `<span class="ai-key-saved">✓ Đã lưu cài đặt! (${masked})</span>`;
    } else {
      statusEl.innerHTML = '<span class="ai-key-empty">✓ Đã lưu URL & Model (Key trống).</span>';
    }
  });

  // Test Connection
  testBtn.addEventListener('click', async () => {
    const key = keyInput.value.trim();
    const baseUrl = baseUrlInput.value.trim() || 'https://api.openai.com/v1';
    const model = customModelInput.value.trim() || getPreferredModel();

    testBtn.disabled = true;
    testBtn.textContent = '⏳ Đang kiểm tra...';
    statusEl.innerHTML = '<span>Đang kết nối tới máy chủ AI...</span>';

    try {
      const result = await testApiKey(key, baseUrl, model);
      if (result.ok) {
        statusEl.innerHTML = `<span class="ai-key-valid">✓ ${result.message || 'Kết nối thành công!'}</span>`;
      } else {
        statusEl.innerHTML = `<span class="ai-key-invalid">✕ ${result.error || 'Kết nối thất bại'}</span>`;
      }
    } catch (err) {
      statusEl.innerHTML = `<span class="ai-key-invalid">✕ Lỗi kết nối: ${err.message}</span>`;
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = '🧪 Test kết nối';
    }
  });

  // Remove Key
  removeBtn.addEventListener('click', () => {
    saveApiKey('');
    keyInput.value = '';
    statusEl.innerHTML = '<span class="ai-key-empty">Đã xóa Key.</span>';
  });

  // Model Presets
  modelOptions.forEach(opt => {
    const radio = opt.querySelector('input[name="aiModel"]');
    radio.addEventListener('change', () => {
      const val = radio.value;
      setPreferredModel(val);
      customModelInput.value = val;
      if (activeModelLabel) activeModelLabel.textContent = val;
      modelOptions.forEach(o => o.classList.remove('is-active'));
      opt.classList.add('is-active');
    });
  });

  // Custom Model Input & Apply
  function updateFromCustomInput() {
    const val = customModelInput.value.trim();
    if (!val) return;
    setPreferredModel(val);
    if (activeModelLabel) activeModelLabel.textContent = val;
    // Check if matches a preset radio
    let matched = false;
    modelOptions.forEach(opt => {
      const radio = opt.querySelector('input[name="aiModel"]');
      if (radio.value === val) {
        radio.checked = true;
        opt.classList.add('is-active');
        matched = true;
      } else {
        radio.checked = false;
        opt.classList.remove('is-active');
      }
    });
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

  if (applyCustomModelBtn) {
    applyCustomModelBtn.addEventListener('click', updateFromCustomInput);
  }
}

export function openSettings() {
  ensurePanel();
  // Refresh values from localStorage
  const keyInput = panelEl.querySelector('#aiApiKeyInput');
  const baseUrlInput = panelEl.querySelector('#aiBaseUrlInput');
  const customModelInput = panelEl.querySelector('#aiCustomModelInput');
  const activeModelLabel = panelEl.querySelector('#aiActiveModelLabel');

  if (keyInput) keyInput.value = getSavedApiKey();
  if (baseUrlInput) baseUrlInput.value = getSavedBaseUrl();
  const currentModel = getPreferredModel();
  if (customModelInput) customModelInput.value = currentModel;
  if (activeModelLabel) activeModelLabel.textContent = currentModel;

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
