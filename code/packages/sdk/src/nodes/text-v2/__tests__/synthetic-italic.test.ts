// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  clearSyntheticItalicCache,
  needsSyntheticItalic,
} from '../layout/synthetic-italic';

describe('needsSyntheticItalic', () => {
  it('never slants in a browser (it slants by itself)', () => {
    clearSyntheticItalicCache();
    expect(needsSyntheticItalic('italic 20px Arial')).toBe(false);
    expect(needsSyntheticItalic('italic bold 20px Sansita, sans-serif')).toBe(
      false
    );
  });

  it('ignores fonts that are not italic', () => {
    expect(needsSyntheticItalic('bold 20px Arial')).toBe(false);
    expect(needsSyntheticItalic('20px Arial')).toBe(false);
  });
});
