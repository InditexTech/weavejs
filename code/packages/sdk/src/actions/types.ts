// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveElementAttributes } from '@inditextech/weavejs-types';

export type WeaveActionPropsChangeCallback = (
  props: WeaveElementAttributes
) => void;

export type WeaveActionCallbacks = {
  onPropsChange?: WeaveActionPropsChangeCallback;
};
