// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveImageProperties } from './types';

export const WEAVE_IMAGE_NODE_TYPE = 'image';

export const WEAVE_IMAGE_CROP_END_TYPE = {
  ['ACCEPT']: 'accept',
  ['CANCEL']: 'cancel',
};

export const WEAVE_IMAGE_DEFAULT_CONFIG: WeaveImageProperties = {
  performance: {
    cache: {
      enabled: false,
    },
  },
  crossOrigin: 'anonymous',
};
