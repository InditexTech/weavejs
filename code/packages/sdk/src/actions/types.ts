// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveElementAttributes } from '@inditextech/weave-types';
import type { WeaveAction } from './action';

export type WeaveActionPropsChangeEvent = {
  instance: WeaveAction;
  props: WeaveElementAttributes;
};
