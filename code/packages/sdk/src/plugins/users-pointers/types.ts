// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveUser } from '@inditextech/weave-types';
import { WEAVE_USER_POINTER_KEY } from './constants';

export type WeaveUserPointersUIProperties = {
  separation: number;
  pointer: {
    circleRadius: number;
    circleStrokeWidth: number;
  };
  name: {
    fontFamily: string;
    fontSize: number;
    backgroundCornerRadius: number;
    backgroundPaddingX: number;
    backgroundPaddingY: number;
  };
};

export type WeaveUsersPointersPluginConfig = {
  getUser: () => WeaveUser;
  getUserBackgroundColor: (
    user: WeaveUser
  ) => string | CanvasGradient | undefined;
  getUserForegroundColor: (
    user: WeaveUser
  ) => string | CanvasGradient | undefined;
  ui?: WeaveUserPointersUIProperties;
};

export type WeaveUsersPointersPluginParams = {
  config: WeaveUsersPointersPluginConfig;
};

export type WeaveUserPointer = {
  rawUser: WeaveUser;
  user: string;
  name: string;
  x: number;
  y: number;
};

export type WeaveUserPointerKey = typeof WEAVE_USER_POINTER_KEY;
