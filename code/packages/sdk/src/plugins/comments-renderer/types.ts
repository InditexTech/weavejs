// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { Vector2d } from 'konva/lib/types';
import { type WeaveUser } from '@inditextech/weave-types';
import type { WeaveCommentStatus } from '@/nodes/comment/types';

export type WeaveCommentsRendererPluginConfig<T> = {
  model: {
    getId: (comment: T) => string;
    getUser: (comment: T) => WeaveUser;
    getPosition: (comment: T) => Vector2d;
    getStatus: (comment: T) => WeaveCommentStatus;
  };
  getUser: () => WeaveUser;
  getUserBackgroundColor: (
    user: WeaveUser
  ) => string | CanvasGradient | undefined;
  getUserForegroundColor: (
    user: WeaveUser
  ) => string | CanvasGradient | undefined;
};

export type WeaveCommentsRendererPluginParams<T> = {
  config: WeaveCommentsRendererPluginConfig<T>;
};
