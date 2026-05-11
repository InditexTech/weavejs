// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveStateElement } from '@inditextech/weave-types';
import type Konva from 'konva';

export const WEAVE_COPY_PASTE_NODES_KEY = 'copyPasteNodes';
export const WEAVE_COPY_PASTE_PASTE_CATCHER_ID = 'weave-paste-catcher';

export const WEAVE_COPY_PASTE_PASTE_MODES = {
  ['INTERNAL']: 'internal',
  ['EXTERNAL']: 'external',
  ['NOT_ALLOWED']: 'not-allowed',
  ['CLIPBOARD_API_ERROR']: 'clipboard-api-error',
  ['CLIPBOARD_API_NOT_SUPPORTED']: 'clipboard-api-not-supported',
} as const;

export const COPY_PASTE_NODES_PLUGIN_STATE = {
  ['IDLE']: 'idle',
  ['PASTING']: 'pasting',
} as const;

export const WEAVE_COPY_PASTE_CONFIG_DEFAULT = {
  canPasteOnto: (node: WeaveStateElement, atTarget: Konva.Container) => {
    const targetType = atTarget.getAttrs().nodeType;

    if (targetType === 'frame' && node.type === 'frame') {
      return false;
    }

    return true;
  },
  paddingOnPaste: {
    enabled: false,
    paddingX: 0,
    paddingY: 0,
  },
} as const;
