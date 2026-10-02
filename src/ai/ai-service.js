/**
 * AI Service — Frontend API Client for AI Co-pilot
 *
 * Handles communication with /api/ai/* endpoints,
 * manages API key storage in localStorage,
 * and provides a clean interface for AI operations.
 */

const AI_API_BASE = '/api/ai';
const LS_KEY_API = 'notebook_ai_api_key';
const LS_KEY_MODEL = 'notebook_ai_model';
const LS_KEY_BASE_URL = 'notebook_ai_base_url';

// ─── API Key & Base URL Management ───

export function getSavedApiKey() {
  return localStorage.getItem(LS_KEY_API) || '';
}

export function saveApiKey(key) {
  if (key && key.trim()) {
    localStorage.setItem(LS_KEY_API, key.trim());
  } else {
    localStorage.removeItem(LS_KEY_API);
  }
}

export function getSavedBaseUrl() {
  return localStorage.getItem(LS_KEY_BASE_URL) || 'https://api.openai.com/v1';
}

export function saveBaseUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem(LS_KEY_BASE_URL, url.trim());
  } else {
    localStorage.removeItem(LS_KEY_BASE_URL);
  }
}

export function getPreferredModel() {
  return localStorage.getItem(LS_KEY_MODEL) || 'gpt-4o-mini';
}

export function setPreferredModel(model) {
  if (model && model.trim()) {
    localStorage.setItem(LS_KEY_MODEL, model.trim());
  }
}

// ─── Core AI Request ───

/**
 * Send an AI processing request to the backend.
 *
 * @param {Object} opts
 * @param {string} opts.action - 'write'|'grammar'|'summarize'|'expand'|'professional'|'translate'|'autofill'
 * @param {string} [opts.prompt] - User's instruction / prompt text
 * @param {string} [opts.selectedText] - The selected text to transform
 * @param {string} [opts.fullContext] - Full page context for better results
 * @param {string} [opts.template] - Current page template type
 * @param {string} [opts.targetLang] - Target language for translate action
 * @param {string} [opts.model] - Override model
 * @param {string} [opts.baseUrl] - Override base URL
 * @returns {Promise<{ok: boolean, result?: string, parsedJson?: object, error?: string, usage?: object}>}
 */
export async function processAI(opts = {}) {
  const apiKey = getSavedApiKey();
  const model = opts.model || getPreferredModel();
  const baseUrl = opts.baseUrl || getSavedBaseUrl();

  const body = {
    action: opts.action || 'write',
    prompt: opts.prompt || '',
    selectedText: opts.selectedText || '',
    fullContext: opts.fullContext || '',
    template: opts.template || 'ruled',
    targetLang: opts.targetLang || '',
    model,
    baseUrl,
    constraints: opts.constraints || null,
  };

  // Include user API key if available
  if (apiKey) {
    body.apiKey = apiKey;
  }

  const res = await fetch(`${AI_API_BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:required'));
    throw new Error('Phiên đăng nhập đã hết hạn');
  }

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.error || `Lỗi AI (HTTP ${res.status})`);
  }

  return data;
}

/**
 * Stream an AI processing request via SSE (Server-Sent Events)
 *
 * @param {Object} opts
 * @param {function(string, string): void} [onToken] - Callback for each token (delta, accumulated)
 * @param {function(string): void} [onComplete] - Callback when generation completes
 * @param {function(Error): void} [onError] - Callback on error
 * @returns {Promise<{ok: boolean, result: string}>}
 */
export async function streamAI(opts = {}, onToken, onComplete, onError) {
  const apiKey = getSavedApiKey();
  const model = opts.model || getPreferredModel();
  const baseUrl = opts.baseUrl || getSavedBaseUrl();

  const body = {
    action: opts.action || 'write',
    prompt: opts.prompt || '',
    selectedText: opts.selectedText || '',
    fullContext: opts.fullContext || '',
    template: opts.template || 'ruled',
    targetLang: opts.targetLang || '',
    model,
    baseUrl,
    constraints: opts.constraints || null,
  };

  if (apiKey) {
    body.apiKey = apiKey;
  }

  try {
    const res = await fetch(`${AI_API_BASE}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:required'));
      throw new Error('Phiên đăng nhập đã hết hạn');
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Lỗi AI (HTTP ${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();

        if (payload === '[DONE]') {
          break;
        }

        try {
          const parsed = JSON.parse(payload);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.delta) {
            fullText += parsed.delta;
            if (onToken) onToken(parsed.delta, fullText);
          }
        } catch (e) {
          if (e.message && !e.message.startsWith('Unexpected')) throw e;
        }
      }
    }

    if (onComplete) onComplete(fullText);
    return { ok: true, result: fullText };
  } catch (err) {
    if (onError) onError(err);
    throw err;
  }
}

// ─── Test API Key & Base URL ───

export async function testApiKey(key, baseUrl, model) {
  const targetKey = key !== undefined ? key : getSavedApiKey();
  const targetBaseUrl = baseUrl !== undefined ? baseUrl : getSavedBaseUrl();
  const targetModel = model !== undefined ? model : getPreferredModel();

  const res = await fetch(`${AI_API_BASE}/test-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': targetKey || '',
      'x-base-url': targetBaseUrl || '',
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      apiKey: targetKey,
      baseUrl: targetBaseUrl,
      model: targetModel,
    }),
  });

  const data = await res.json();
  return data;
}

// ─── Convenience Wrappers ───

export function aiGrammarFix(selectedText, template) {
  return processAI({ action: 'grammar', selectedText, template });
}

export function aiSummarize(selectedText, template) {
  return processAI({ action: 'summarize', selectedText, template });
}

export function aiExpand(selectedText, template) {
  return processAI({ action: 'expand', selectedText, template });
}

export function aiProfessional(selectedText, template) {
  return processAI({ action: 'professional', selectedText, template });
}

export function aiTranslate(selectedText, targetLang, template) {
  return processAI({ action: 'translate', selectedText, targetLang, template });
}

export function aiWrite(prompt, fullContext, template) {
  return processAI({ action: 'write', prompt, fullContext, template });
}

export function aiAutofill(prompt, template, fullContext) {
  return processAI({ action: 'autofill', prompt, template, fullContext });
}
