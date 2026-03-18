// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';

export const doPreloadCursors = async (
  cursorsToPreload: Record<string, string>,
  setCursor: (state: string, cursor: string) => void,
  getFallbackCursor: (state: string) => string,
  resetCursors: () => void
) => {
  resetCursors();

  const promiseHandler = (state: string, value: string, src: string) =>
    new Promise<void>((resolveInt, rejectInt) => {
      const img = Konva.Util.createImageElement();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);

        const dataURL = canvas.toDataURL('image/png');

        const tokens = value.split(' ');
        tokens[0] = `url(${dataURL})`;

        setCursor(state, tokens.join(' '));

        resolveInt();
      };
      img.onerror = () => {
        setCursor(state, getFallbackCursor(state));

        rejectInt(new Error(`Failed to load cursor: ${src}`));
      };
      img.src = src;
    });

  return new Promise<void>((resolve) => {
    (async () => {
      const cursors = Object.keys(cursorsToPreload);

      const cursorUrls: {
        state: string;
        value: string;
        src: string;
      }[] = [];

      for (const cursorKey of cursors) {
        const cursorValue = cursorsToPreload[cursorKey];

        const { preload, cursor } = extractCursorUrl(cursorValue);

        if (preload) {
          cursorUrls.push({
            state: cursorKey,
            value: cursorValue,
            src: cursor,
          });
        }
      }

      if (cursorUrls.length > 0) {
        const cursorsPreloading = [];

        for (const { state, value, src } of cursorUrls) {
          cursorsPreloading.push(promiseHandler(state, value, src));
        }

        await Promise.allSettled(cursorsPreloading);
      }

      resolve();
    })();
  });
};

export const extractCursorUrl = (
  cursor: string
): { preload: true; cursor: string } | { preload: false; cursor: null } => {
  const lower = cursor.toLowerCase();
  const start = lower.indexOf('url(');
  if (start === -1)
    return {
      preload: false,
      cursor: null,
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
    if (quote && ch === quote) {
      i++; // consume closing quote
      break;
    }
    if (quote) {
      buf += ch;
    } else {
      if (ch === ')') break;
      buf += ch;
    }
  }

  const url = buf.trim();
  if (!url || (url && !isAllowedUrl(url))) {
    return {
      preload: false,
      cursor: null,
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
