// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WEAVE_NODES_SELECTION_DEFAULT_CONFIG } from '@/plugins/nodes-selection/constants';
import type { WeaveTextProperties } from './types';

export const WEAVE_TEXT_NODE_TYPE = 'text';

export const WEAVE_STAGE_TEXT_EDITION_MODE = 'text-edition';

export const WEAVE_TEXT_NODE_DEFAULT_CONFIG: WeaveTextProperties = {
  transform: {
    ...WEAVE_NODES_SELECTION_DEFAULT_CONFIG.selection,
  },
  outline: {
    enabled: false,
  },
  cursor: {
    color: '#000000',
  },
  edition: {
    borderSize: 2,
  },
  link: {
    defaultColor: '#1155ccff',
    hoverColor: '#3d7be0ff',
  },
};

// Schemes allowed for the `link` attribute of a text node. Anything else
// (javascript:, data:, vbscript:, etc.) is rejected both at the schema
// level and again defensively at click-time, since the URL is untrusted
// user-authored content that another collaborator will click on.
export const WEAVE_TEXT_LINK_ALLOWED_PROTOCOLS = ['http:', 'https:'];

export const TEXT_LAYOUT = {
  ['SMART']: 'smart',
  ['AUTO_ALL']: 'auto-all',
  ['AUTO_HEIGHT']: 'auto-height',
  ['FIXED']: 'fixed',
} as const;
