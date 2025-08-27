// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DeepPartial, WeaveUser } from '@inditextech/weave-types';
import { WEAVE_COMMENT_TOOL_STATE } from './constants';

export type WeaveCommentToolActionStateKeys =
  keyof typeof WEAVE_COMMENT_TOOL_STATE;
export type WeaveCommentToolActionState =
  (typeof WEAVE_COMMENT_TOOL_STATE)[WeaveCommentToolActionStateKeys];

export type WeaveCommentToolActionConfig<T> = {
  style: {
    cursor: {
      add: string;
      block: string;
    };
  };
  getUser: () => WeaveUser;
  getUserBackgroundColor: (
    user: WeaveUser
  ) => string | CanvasGradient | undefined;
  getUserForegroundColor: (
    user: WeaveUser
  ) => string | CanvasGradient | undefined;
  model: {
    getCreateModel: () => DeepPartial<T>;
  };
};

export type WeaveCommentToolActionParams<T> = {
  config: Pick<
    WeaveCommentToolActionConfig<T>,
    'model' | 'getUser' | 'getUserBackgroundColor' | 'getUserForegroundColor'
  > &
    DeepPartial<Pick<WeaveCommentToolActionConfig<T>, 'style'>>;
};
