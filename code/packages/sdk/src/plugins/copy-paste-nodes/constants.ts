// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export const WEAVE_COPY_PASTE_NODES_KEY = 'copyPasteNodes';
export const WEAVE_COPY_PASTE_PASTE_MODES = {
  ['INTERNAL']: 'internal',
  ['EXTERNAL']: 'external',
  ['NOT_ALLOWED']: 'not-allowed',
  ['CLIPBOARD_API_NOT_SUPPORTED']: 'clipboard-api-not-supported',
} as const;
export const COPY_PASTE_NODES_PLUGIN_STATE = {
  ['IDLE']: 'idle',
  ['PASTING']: 'pasting',
} as const;
