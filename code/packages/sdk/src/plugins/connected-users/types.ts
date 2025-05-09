// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveUser } from '@inditextech/weave-types';
import { WEAVE_CONNECTED_USER_INFO_KEY } from './constants';

export type WeaveConnectedUsersPluginConfig = {
  getUser: () => WeaveUser;
};

export type WeaveConnectedUsersPluginParams = {
  config: WeaveConnectedUsersPluginConfig;
};

export type WeaveConnectedUsers = {
  [userName: string]: WeaveUser;
};

export type WeaveConnectedUsersChangeEvent = WeaveConnectedUsers;

export type WeaveConnectedUserInfoKey = typeof WEAVE_CONNECTED_USER_INFO_KEY;
