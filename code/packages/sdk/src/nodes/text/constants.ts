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
};

export const TEXT_LAYOUT = {
  ['SMART']: 'smart',
  ['AUTO_ALL']: 'auto-all',
  ['AUTO_HEIGHT']: 'auto-height',
  ['FIXED']: 'fixed',
} as const;
