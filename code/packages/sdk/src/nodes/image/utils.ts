// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const extractCursorUrl = (
  cursor: string,
  fallback: string
): { preload: boolean; cursor: string } => {
  const lower = cursor.toLowerCase();
  const start = lower.indexOf('url(');
  if (start === -1)
    return {
      preload: false,
      cursor,
    };

  // slice inside url(...)
  let i = start + 4; // after "url("
  const len = cursor.length;

  // skip whitespace
  while (i < len && /\s/.test(cursor[i])) i++;

  let quote: string | null = null;
  if (cursor[i] === '"' || cursor[i] === "'") {
    quote = cursor[i];
    i++;
  }

  let buf = '';
  for (; i < len; i++) {
    const ch = cursor[i];
    if (quote) {
      if (ch === quote) {
        i++; // consume closing quote
        break;
      }
      buf += ch;
    } else {
      if (ch === ')') break;
      buf += ch;
    }
  }

  const url = buf.trim();
  if (!url)
    return {
      preload: false,
      cursor: fallback,
    };

  if (!isAllowedUrl(url)) {
    return {
      preload: false,
      cursor: fallback,
    };
  }

  return {
    preload: true,
    cursor: url,
  };
};

export const isAllowedUrl = (value: string): boolean => {
  // Allow http/https
  if (/^https?:\/\//i.test(value)) return true;

  // Reject known dangerous schemes
  if (/^(javascript|data|blob|ftp):/i.test(value)) return false;

  // Otherwise treat as relative
  return true;
};
