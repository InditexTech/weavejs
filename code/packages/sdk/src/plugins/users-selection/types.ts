// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveUser } from '@inditextech/weave-types';
import { WEAVE_USER_SELECTION_KEY } from './constants';

export type WeaveUsersSelectionPluginConfig = {
  getUser: () => WeaveUser;
};

export type WeaveUsersSelectionPluginParams = {
  config: WeaveUsersSelectionPluginConfig;
};

export type WeaveUserSelectionInfo = {
  user: string;
  nodes: string[];
};

export type WeaveUserSelectionKey = typeof WEAVE_USER_SELECTION_KEY;
