/**
 * Application Constants and System Configuration
 */

export const STORAGE_KEY = 'thao_digital_notebooks_v7';
export const BACKUP_STORAGE_KEY = 'thao_digital_notebooks_v7_previous';
export const STATE_VERSION = 3;
export const SAVE_DEBOUNCE_MS = 600;

export const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28];

export const FONT_FAMILIES = {
  sans: "'CJK-Smart-Enlarged', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  vietnam: "'CJK-Smart-Enlarged', 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "'CJK-Smart-Enlarged', 'Cormorant Garamond', 'Noto Serif SC', Georgia, serif",
  kaiti: "'CJK-Smart-Enlarged', 'Kaiti SC', 'STKaiti', 'KaiTi', 'SimKai', 'Noto Serif SC', serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
  dancing: "'Dancing Script', 'CJK-Smart-Enlarged', cursive",
  caveat: "'Caveat', 'CJK-Smart-Enlarged', cursive",
  patrickhand: "'Patrick Hand', 'CJK-Smart-Enlarged', cursive",
  kalam: "'Kalam', 'CJK-Smart-Enlarged', cursive",
  indieflower: "'Indie Flower', 'CJK-Smart-Enlarged', cursive"
};

export const LINE_HEIGHT_MAP = {
  '24': 24,
  '28': 28,
  '32': 32,
  '36': 36,
  '42': 42,
  'none': null
};

export const COVER_PRESETS = [
  { gradient: 'linear-gradient(135deg, #dc2626, #991b1b)', title: 'Đỏ Rượu / Crimson Red' },
  { gradient: 'linear-gradient(135deg, #1e293b, #0f172a)', title: 'Xanh Đêm / Midnight Navy' },
  { gradient: 'linear-gradient(135deg, #15803d, #166534)', title: 'Xanh Ngọc Lục Bảo / Forest Emerald' },
  { gradient: 'linear-gradient(135deg, #b45309, #78350f)', title: 'Nâu Da Bò / Vintage Tan' },
  { gradient: 'linear-gradient(135deg, #0284c7, #0369a1)', title: 'Xanh Lam / Royal Blue' },
  { gradient: 'linear-gradient(135deg, #f8fafc, #cbd5e1)', title: 'Xám Bạc Tối Giản / Minimalist Slate' }
];
