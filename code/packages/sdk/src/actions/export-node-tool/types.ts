// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WeaveElementInstance,
  WeaveExportNodeOptions,
} from '@inditextech/weavejs-types';

export type WeaveExportNodeActionParams = {
  node: WeaveElementInstance;
  options?: WeaveExportNodeOptions;
};
