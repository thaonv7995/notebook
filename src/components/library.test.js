// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { getNotebookSearchText } from './library.js';

describe('getNotebookSearchText', () => {
  it('indexes notebook metadata and page content', () => {
    const searchText = getNotebookSearchText({
      title: 'Kế hoạch sản phẩm',
      author: 'Thảo',
      category: 'Công việc',
      pages: [
        {
          title: 'Roadmap quý 4',
          topic: 'Notebook Studio',
          notes: 'Tối ưu hiệu năng và trải nghiệm offline',
          summary: 'Ưu tiên đồng bộ dữ liệu',
          actions: [
            { text: 'Thêm kiểm thử tự động' }
          ]
        }
      ]
    });

    expect(searchText).toContain('kế hoạch sản phẩm');
    expect(searchText).toContain('notebook studio');
    expect(searchText).toContain('trải nghiệm offline');
    expect(searchText).toContain('thêm kiểm thử tự động');
  });

  it('removes HTML markup without losing searchable text', () => {
    const searchText = getNotebookSearchText({
      title: 'Ghi chú',
      pages: [
        {
          content: '<p><strong>Nội dung quan trọng</strong></p>'
        }
      ]
    });

    expect(searchText).toContain('nội dung quan trọng');
    expect(searchText).not.toContain('<strong>');
    expect(searchText).not.toContain('<p>');
  });

  it('indexes action items from work pages', () => {
    const searchText = getNotebookSearchText({
      title: 'Dự án',
      pages: [
        {
          actions: [
            { checked: false, text: 'Hoàn thiện chức năng tìm kiếm' },
            { checked: true, text: 'Tối ưu bundle PDF' }
          ]
        }
      ]
    });

    expect(searchText).toContain('hoàn thiện chức năng tìm kiếm');
    expect(searchText).toContain('tối ưu bundle pdf');
  });

  it('handles notebooks with missing optional fields', () => {
    expect(() => getNotebookSearchText({ pages: [{}] })).not.toThrow();
    expect(getNotebookSearchText({ pages: [] })).toBe('   ');
  });
});
