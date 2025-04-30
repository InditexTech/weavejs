// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveUser } from '@inditextech/weave-types';
import { WEAVE_USER_POINTER_KEY } from './constants';

export type WeaveUsersPointersPluginParams = {
  getUser?: () => WeaveUser;
};

export type WeaveUserPointer = {
  user: string;
  x: number;
  y: number;
};

export type WeaveUserPointerKey = typeof WEAVE_USER_POINTER_KEY;
