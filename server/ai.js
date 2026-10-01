/**
 * AI Co-pilot & Writing Assistant API Routes
 *
 * Supports OpenAI API (gpt-4o, gpt-4o-mini) with Hybrid API Key mechanism:
 * 1. User personal key passed via 'x-api-key' header or request body
 * 2. Fallback to process.env.OPENAI_API_KEY
 */

import { requireAuth } from './auth.js';

function resolveApiKey(req) {
  const headerKey = req.headers['x-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim().length > 0) {
    return headerKey.trim();
  }
  const bodyKey = req.body && req.body.apiKey;
  if (typeof bodyKey === 'string' && bodyKey.trim().length > 0) {
    return bodyKey.trim();
  }
  return (process.env.OPENAI_API_KEY || '').trim();
}

function resolveEndpointUrl(req, path = '/chat/completions') {
  const headerBase = req.headers['x-base-url'];
  const bodyBase = req.body && req.body.baseUrl;
  let base = (headerBase || bodyBase || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim();
  if (!base) base = 'https://api.openai.com/v1';

  // Normalize: remove trailing slashes
  base = base.replace(/\/+$/, '');

  // If already pointing to the exact path
  if (base.endsWith(path)) return base;

  return `${base}${path}`;
}

function buildSystemPrompt(action, template, targetLang, constraints = {}) {
  const {
    totalLineCapacity = 18,
    remainingLines = 15,
    fontSize = '16px',
    lineHeight = '28px',
    sheetSize = '480x680px',
    pageMode = '2-page',
    charsPerLine = 50,
    areaWidth = '440px'
  } = constraints || {};

  const base = `Bạn là Trợ lý Viết & Soạn Thảo AI (AI Writing Co-pilot) tích hợp trong ứng dụng sổ tay Notebook Studio.
Mục tiêu của bạn là giúp người dùng tạo nội dung ghi chép sâu sắc, rõ ràng, gãy gọn, phù hợp với định dạng trang giấy sổ tay thật.
Ngôn ngữ mặc định: Giữ nguyên ngôn ngữ người dùng yêu cầu hoặc tiếng Việt nếu không chỉ định.

═══════════════════════════════════════════════════════════════════
QUY TẮC CỐT LÕI: KIỂM SOÁT KÍCH THƯỚC TRANG ĐỂ TRÁNH TRÀN TRANG (PAGE OVERFLOW PREVENTION)
═══════════════════════════════════════════════════════════════════
1. ĐẶC ĐIỂM VẬT LÝ CỦA TRANG SỔ:
   - Kích thước trang: ${sheetSize} (Chế độ ${pageMode})
   - Vùng viết rộng: ${areaWidth}
   - Cỡ chữ hiện tại: ${fontSize} | Khoảng cách dòng kẻ: ${lineHeight}
   - Sức chứa tối đa của trang: KHOẢNG ${totalLineCapacity} DÒNG KẺ (Khoảng trống khả dụng: ~${remainingLines} dòng kẻ).
   - Trang sổ CÓ GIỚI HẠN VẬT LÝ CỐ ĐỊNH VÀ BỊ CẮT XÉN (overflow: hidden). NẾU VIẾT QUÁ DÀI, NỘI DUNG SẼ BỊ CHÌM/MẤT KHỎI ĐÁY TRANG!

2. ★★★ QUY TẮC CĂN DÒNG KẺ (CRITICAL — LINE ALIGNMENT) ★★★
   - MỖI DÒNG VĂN BẢN BẠN XUẤT RA (kết thúc bằng \\n) SẼ CHIẾM CHÍNH XÁC 1 DÒNG KẺ TRÊN TRANG.
   - SỐ KÝ TỰ TỐI ĐA MỖI DÒNG: ~${charsPerLine} ký tự (bao gồm dấu gạch đầu dòng, khoảng trắng).
   - NẾU MỘT DÒNG DÀI HƠN ${charsPerLine} KÝ TỰ, NÓ SẼ TỰ ĐỘNG XUỐNG HÀNG (WORD-WRAP) VÀ LÀM LỆCH KHỎI DÒNG KẺ!
   - VÌ VẬY: HÃY VIẾT NGẮN GỌN, TỪNG DÒNG DƯỚI ${charsPerLine} KÝ TỰ. Nếu nội dung dài, hãy ngắt thành nhiều dòng ngắn.
   - Gạch đầu dòng: "- Nội dung ngắn gọn" (đếm cả "- " = 2 ký tự)
   - Tiêu đề: "## Tiêu đề" hoặc "### Tiêu đề nhỏ"

3. TIÊU CHUẨN ĐỘ DÀI BẮT BUỘC:
   - Viết cô đọng, gãy gọn, tinh túy, súc tích. Tuyệt đối không lan man, không lặp ý.
   - Luôn căn chỉnh số lượng câu từ sao cho VỪA KHÍT với diện tích trang, không được phép làm tràn xuống dưới!
   - KHÔNG viết câu hỏi ngược lại cho người dùng. CHỈ VIẾT NỘI DUNG TRỰC TIẾP.

4. QUYỀN ĐIỀU CHỈNH CỠ CHỮ & PHONG CÁCH TRANG (AUTO STYLE & TYPOGRAPHY):
   Bạn CÓ TOÀN QUYỀN tự động tối ưu hóa cỡ chữ và giao diện trang sổ để bài viết hiển thị hoàn hảo nhất:
   - fontSize: từ 11 đến 20 (mặc định 16). Nếu nội dung nhiều kiến thức hoặc hơi dài, bạn CÓ THỂ tự hạ xuống 14 hoặc 15 để trang chứa vừa vặn, không tràn đáy.
   - fontFamily: 'sans' (hiện đại, rõ ràng), 'serif' (sách vở, văn học, cổ điển), 'mono' (kỹ thuật, code).
   - lineHeight: '24', '28', '32', '36' (mặc định '28').
   - paperTone: 'cream' (kem), 'white' (trắng), 'ivory' (ngà), 'aged' (cổ điển), 'mint' (bạc hà), 'rose' (hồng pastel), 'lavender' (tím nhạt).
   - paperTexture: 'grain' (hạt giấy), 'smooth' (mịn), 'kraft' (giấy xi măng), 'linen' (vải lanh), 'washi' (giấy Nhật), 'vellum' (da).

   Khi người dùng yêu cầu chỉnh cỡ chữ/font/màu giấy, hoặc khi bạn thấy cần tinh chỉnh giao diện cho đẹp, hãy kèm đối tượng "styles":
   "styles": {
     "fontSize": 14,
     "fontFamily": "serif",
     "paperTone": "aged",
     "lineHeight": "28"
   }

  if (action === 'grammar') {
    return `${base}
Nhiệm vụ: Sửa toàn bộ lỗi chính tả, dấu câu, ngữ pháp của đoạn văn bản được cung cấp.
QUY TẮC:
- Giữ nguyên ý nghĩa và phong cách gốc của tác giả.
- CHỈ TRẢ VỀ văn bản đã sửa, KHÔNG thêm lời giải thích, lời chào hay định dạng markdown bọc thừa.`;
  }

  if (action === 'summarize') {
    return `${base}
Nhiệm vụ: Tóm tắt súc tích đoạn văn bản được cung cấp thành các ý cốt lõi.
GIỚI HẠN: Tối đa 4 đến 6 gạch đầu dòng ngắn gọn (khoảng 60 - 90 từ) để vừa vặn trong phần tóm tắt của trang sổ.
QUY TẮC:
- Trình bày dạng các gạch đầu dòng rõ ràng.
- CHỈ TRẢ VỀ văn bản tóm tắt, không thêm mở đầu/kết thúc thừa.`;
  }

  if (action === 'expand') {
    return `${base}
Nhiệm vụ: Mở rộng và đào sâu ý tưởng của đoạn văn bản được cung cấp.
GIỚI HẠN: Viết thêm tối đa ${Math.min(remainingLines, 12)} dòng (khoảng 100 - 140 từ) để không tràn trang.
- Bổ sung luận điểm sắc sảo, ví dụ thực tế rõ ràng.
- CHỈ TRẢ VỀ nội dung mở rộng.`;
  }

  if (action === 'professional') {
    return `${base}
Nhiệm vụ: Viết lại đoạn văn bản theo phong cách chuyên nghiệp, trang trọng, mạch lạc (Formal & Professional).
GIỚI HẠN: Giữ độ dài tương đương bản gốc hoặc cô đọng hơn để không làm tăng số dòng.
- CHỈ TRẢ VỀ nội dung đã viết lại.`;
  }

  if (action === 'translate') {
    const lang = targetLang || 'English';
    return `${base}
Nhiệm vụ: Dịch chính xác, tự nhiên đoạn văn bản được cung cấp sang ${lang}.
QUY TẮC:
- Bản dịch mượt mà, đúng ngữ cảnh văn phong viết sổ tay.
- Giữ độ dài vừa vặn tương ứng với bản gốc.
- CHỈ TRẢ VỀ văn bản dịch, không giải thích.`;
  }

  if (action === 'autofill') {
    return `${base}
Nhiệm vụ: Tạo dữ liệu hoàn chỉnh để điền vào trang sổ tay mẫu "${template || 'ruled'}".
BẠN PHẢI TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON HỢP LỆ (KHÔNG bọc trong markdown code fence, KHÔNG giải thích).

QUY CHUẨN SỐ DÒNG & ĐỘ DÀI CHO TỪNG TEMPLATE (ĐỂ VỪA KHÍT TRANG A4, KHÔNG BỊ TRÀN):

1. Nếu template là "vocab":
   - Đúng 5 đến 6 từ vựng.
   - Mỗi câu ví dụ (vocabExample) chỉ dài 1 dòng (dưới 12 từ).
   - Phần Review (vocabReview) tối đa 2 gạch đầu dòng ngắn.
{
  "topic": "Chủ đề từ vựng",
  "vocabWord": "1. Word1 /ipa/\\n2. Word2 /ipa/\\n3. Word3 /ipa/\\n4. Word4 /ipa/\\n5. Word5 /ipa/",
  "vocabMeaning": "1. Định nghĩa tiếng Việt 1\\n2. Định nghĩa tiếng Việt 2\\n3. Định nghĩa tiếng Việt 3\\n4. Định nghĩa tiếng Việt 4\\n5. Định nghĩa tiếng Việt 5",
  "vocabExample": "1. Câu ví dụ ngắn 1.\\n2. Câu ví dụ ngắn 2.\\n3. Câu ví dụ ngắn 3.\\n4. Câu ví dụ ngắn 4.\\n5. Câu ví dụ ngắn 5.",
  "vocabReview": "• Collocation quan trọng\\n• Mẹo ghi nhớ nhanh"
}

2. Nếu template là "quadrant" (Eisenhower):
   - Mỗi ô Q1, Q2, Q3, Q4 chỉ chứa tối đa 3 gạch đầu dòng ngắn (mỗi mục dưới 8 từ).
{
  "topic": "Mục tiêu / Ngữ cảnh",
  "quadrants": {
    "q1": "• Việc gấp & quan trọng 1\\n• Việc 2",
    "q2": "• Kế hoạch dài hạn 1\\n• Kế hoạch 2",
    "q3": "• Việc ủy quyền 1\\n• Việc 2",
    "q4": "• Thói quen cần bỏ 1\\n• Việc 2"
  }
}

3. Nếu template là "work":
   - agenda: 3 đến 4 mục ngắn.
   - discussions: 5 đến 7 gạch đầu dòng cô đọng.
   - actions: chính xác 5 hành động ngắn gọn (mỗi hành động 5-10 từ).
{
  "topic": "Tên cuộc họp / Dự án",
  "agenda": "1. Mục 1\\n2. Mục 2\\n3. Mục 3",
  "discussions": "• Thảo luận chính 1\\n• Quyết định 2\\n• Thống nhất giải pháp",
  "actions": [
    { "checked": false, "text": "Hành động cụ thể 1" },
    { "checked": false, "text": "Hành động cụ thể 2" },
    { "checked": false, "text": "Hành động cụ thể 3" },
    { "checked": false, "text": "Hành động cụ thể 4" },
    { "checked": false, "text": "Hành động cụ thể 5" }
  ]
}

4. Nếu template là "reading":
   - cues: 4 đến 5 ý tưởng cốt lõi.
   - notes: 2 trích dẫn đắt giá (mỗi trích dẫn 1-2 câu).
   - summary: 2 đến 3 câu phản tư bài học (dưới 40 từ).
{
  "topic": "Tên sách — Tác giả",
  "cues": "• Ý tưởng cốt lõi 1\\n• Luận điểm 2\\n• Góc nhìn 3",
  "notes": "\\\"Trích dẫn đắt giá 1\\\"\\n\\n\\\"Trích dẫn đắt giá 2\\\"",
  "summary": "Tóm tắt bài học đúc kết ngắn gọn trong 2-3 câu."
}

5. Nếu template là "cornell":
   - cues (cột trái): 5 đến 6 câu hỏi / từ khóa ôn tập.
   - notes (cột phải): 8 đến 12 dòng ghi chép chi tiết, mạch lạc.
   - summary (đáy trang): bắt buộc tối đa 2 đến 3 câu tổng kết (dưới 40 từ, vì ô đáy trang rất nhỏ).
{
  "topic": "Chủ đề bài học",
  "cues": "• Câu hỏi ôn tập 1\\n• Khái niệm chính 2\\n• Từ khóa 3",
  "notes": "1. Ghi chú cốt lõi 1...\\n2. Ghi chú cốt lõi 2...\\n3. Dẫn chứng thực tế...",
  "summary": "Tổng kết ngắn gọn 2-3 câu toàn bộ nội dung bài học."
}

6. Nếu template là "charting":
   - col1, col2, col3: mỗi cột 3 đến 4 mục đối chiếu ngắn gọn.
   - summary: 2 đến 3 dòng đúc kết.
{
  "topic": "Chủ đề so sánh / Đối chiếu",
  "chartData": {
    "col1": "1. Tiêu chí A...\\n2. Điểm mạnh...",
    "col2": "1. Tiêu chí B...\\n2. Điểm mạnh...",
    "col3": "1. Tiêu chí C...\\n2. Điểm mạnh..."
  },
  "summary": "Tổng hợp kết luận so sánh ngắn gọn."
}

7. Với các template khác ("ruled", "dotgrid", "grid", "blank"):
   - content: tối đa ${Math.min(totalLineCapacity - 2, 20)} dòng (khoảng 150-200 từ), chia thành 2-3 đoạn ngắn hoặc các gạch đầu dòng rõ ràng để không tràn đáy trang.
{
  "topic": "Tiêu đề ghi chép",
  "content": "Nội dung ghi chép chia đoạn gọn gàng, súc tích..."
}`;
  }

  return `${base}
Nhiệm vụ: Viết tiếp hoặc giải quyết yêu cầu của người dùng trên trang sổ tay.
GIỚI HẠN DÒNG: Viết tối đa khoảng ${Math.min(remainingLines, 16)} dòng kẻ (tối đa 150-180 từ).
- Giữ văn phong tự nhiên, mạch lạc, dễ đọc.
- Định dạng gạch đầu dòng hoặc đoạn văn phù hợp với kích thước sổ tay, không làm tràn đáy trang.`;
}

export function aiRoutes(app) {
  // ─── POST /api/ai/test-key — Test AI API Key & Base URL validity ───
  app.post('/api/ai/test-key', requireAuth, async (req, res) => {
    try {
      const apiKey = resolveApiKey(req);
      const chatUrl = resolveEndpointUrl(req, '/chat/completions');
      const isLocal = chatUrl.includes('localhost') || chatUrl.includes('127.0.0.1');

      if (!apiKey && !isLocal) {
        return res.status(400).json({ ok: false, error: 'Chưa cung cấp API Key.' });
      }

      const { model = 'gpt-4o-mini' } = req.body || {};
      const targetModel = (typeof model === 'string' && model.trim()) ? model.trim() : 'gpt-4o-mini';

      const headers = {
        'Content-Type': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // Test with a lightweight ping completion
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = (errData.error && errData.error.message) || `Máy chủ AI trả về mã lỗi HTTP ${response.status}`;
        return res.status(response.status).json({
          ok: false,
          error: errMsg
        });
      }

      res.json({ ok: true, message: `Kết nối thành công tới ${targetModel}!` });
    } catch (err) {
      console.error('Test API key error:', err);
      res.status(500).json({ ok: false, error: 'Không thể kết nối đến máy chủ AI: ' + (err.message || String(err)) });
    }
  });

  // ─── POST /api/ai/process — Execute AI prompt / transform ───
  app.post('/api/ai/process', requireAuth, async (req, res) => {
    try {
      const apiKey = resolveApiKey(req);
      const chatUrl = resolveEndpointUrl(req, '/chat/completions');
      const isLocal = chatUrl.includes('localhost') || chatUrl.includes('127.0.0.1');

      if (!apiKey && !isLocal) {
        return res.status(400).json({
          ok: false,
          error: 'Chưa có API Key. Hãy cấu hình OPENAI_API_KEY trong file .env hoặc bấm nút Cài đặt AI ⚙️ để nhập Key cá nhân.'
        });
      }

      const {
        prompt = '',
        selectedText = '',
        fullContext = '',
        action = 'write',
        template = 'ruled',
        targetLang = '',
        model = 'gpt-4o-mini',
        constraints = {}
      } = req.body || {};

      const targetModel = (typeof model === 'string' && model.trim()) ? model.trim() : 'gpt-4o-mini';
      const systemPrompt = buildSystemPrompt(action, template, targetLang, constraints);

      let userContent = '';
      if (action === 'autofill') {
        userContent = `Yêu cầu tạo trang sổ tay:
- Mẫu template: ${template}
- Chủ đề/Nội dung người dùng muốn viết: "${prompt || selectedText || 'Kiến thức tổng hợp'}"
${fullContext ? `- Ngữ cảnh trang hiện tại: ${fullContext.slice(0, 800)}` : ''}

Hãy trả về duy nhất đối tượng JSON hợp lệ theo đúng cấu trúc của template "${template}".`;
      } else if (selectedText) {
        userContent = `Văn bản gốc cần xử lý:
"""
${selectedText}
"""
${prompt ? `Yêu cầu cụ thể: ${prompt}` : ''}`;
      } else {
        userContent = prompt || 'Hãy viết tiếp nội dung hữu ích cho trang sổ này.';
        if (fullContext) {
          userContent += `\n\n(Ngữ cảnh trang sổ: ${fullContext.slice(0, 1000)})`;
        }
      }

      const headers = {
        'Content-Type': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // Check if provider likely supports response_format json_object (OpenAI, DeepSeek)
      const supportsJsonMode = chatUrl.includes('openai.com') || chatUrl.includes('deepseek.com');

      const requestBody = {
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: action === 'grammar' ? 0.2 : 0.7,
        max_tokens: 2000,
      };

      if (action === 'autofill' && supportsJsonMode) {
        requestBody.response_format = { type: 'json_object' };
      }

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const errMsg = (errBody.error && errBody.error.message) || `Máy chủ AI trả về mã lỗi HTTP ${response.status}`;
        console.error('AI Provider Error:', errMsg);
        return res.status(response.status).json({ ok: false, error: errMsg });
      }

      const data = await response.json();
      const rawText = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content.trim()
        : '';

      let parsedJson = null;
      if (action === 'autofill' || rawText.startsWith('{') || rawText.includes('```json')) {
        try {
          parsedJson = JSON.parse(rawText);
        } catch {
          // If markdown fence was included
          const cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
          try {
            parsedJson = JSON.parse(cleaned);
          } catch (e) {
            // Non-fatal parse warning
          }
        }
      }

      res.json({
        ok: true,
        action,
        template,
        model: targetModel,
        result: rawText,
        parsedJson,
        usage: data.usage || null
      });
    } catch (err) {
      console.error('AI Processing Error:', err);
      res.status(500).json({
        ok: false,
        error: 'Lỗi trong quá trình xử lý AI: ' + (err.message || String(err))
      });
    }
  });
}
