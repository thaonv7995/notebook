// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  parseQuickCapture,
  resolveNotebook
} from './quick-capture-parser.js';

const REFERENCE_DATE = new Date('2026-10-10T12:00:00+07:00');
const NOTEBOOKS = [
  { id: 'nb-work', title: 'Work & Project Log' },
  { id: 'nb-study', title: 'Cornell Study Journal' }
];

describe('quick capture parser', () => {
  it('parses task metadata from a concise capture string', () => {
    const result = parseQuickCapture(
      'Chuẩn bị tài liệu ngày mai 09:30 p1 #Work @meeting @client',
      {
        referenceDate: REFERENCE_DATE,
        notebooks: NOTEBOOKS
      }
    );

    expect(result).toMatchObject({
      type: 'task',
      title: 'Chuẩn bị tài liệu',
      status: 'inbox',
      priority: 1,
      dueDate: '2026-10-11',
      dueTime: '09:30',
      tags: ['meeting', 'client'],
      notebookId: 'nb-work',
      notebookTitle: 'Work & Project Log',
      isValid: true,
      unresolvedNotebook: false
    });
  });

  it('supports Vietnamese and English relative dates', () => {
    const today = parseQuickCapture('Việc hôm nay', {
      referenceDate: REFERENCE_DATE
    });
    const tomorrow = parseQuickCapture('Another task tomorrow', {
      referenceDate: REFERENCE_DATE
    });

    expect(today.title).toBe('Việc');
    expect(today.dueDate).toBe('2026-10-10');
    expect(tomorrow.title).toBe('Another task');
    expect(tomorrow.dueDate).toBe('2026-10-11');
  });

  it('parses explicit dates and note commands', () => {
    const result = parseQuickCapture(
      '/note Ý tưởng sản phẩm 15/11/2026 #Cornell_Study',
      {
        referenceDate: REFERENCE_DATE,
        notebooks: NOTEBOOKS
      }
    );

    expect(result.type).toBe('note');
    expect(result.command).toBe('/note');
    expect(result.title).toBe('Ý tưởng sản phẩm');
    expect(result.dueDate).toBe('2026-11-15');
    expect(result.notebookId).toBe('nb-study');
  });

  it('keeps invalid dates in the title instead of discarding input', () => {
    const result = parseQuickCapture('Kiểm tra 31/02/2026', {
      referenceDate: REFERENCE_DATE
    });

    expect(result.title).toBe('Kiểm tra 31/02/2026');
    expect(result.dueDate).toBe('');
    expect(result.isValid).toBe(true);
  });

  it('marks an unknown notebook without losing the captured title', () => {
    const result = parseQuickCapture('Gửi báo cáo #Unknown', {
      referenceDate: REFERENCE_DATE,
      notebooks: NOTEBOOKS
    });

    expect(result.title).toBe('Gửi báo cáo');
    expect(result.notebookId).toBe('');
    expect(result.notebookQuery).toBe('Unknown');
    expect(result.unresolvedNotebook).toBe(true);
  });

  it('resolves exact identifiers before partial notebook titles', () => {
    expect(resolveNotebook('nb-study', NOTEBOOKS)?.id).toBe('nb-study');
    expect(resolveNotebook('project', NOTEBOOKS)?.id).toBe('nb-work');
    expect(resolveNotebook('', NOTEBOOKS)).toBeNull();
  });
});
