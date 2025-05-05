// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveUser } from '@inditextech/weave-types';
import { WEAVE_CONNECTED_USER_INFO_KEY } from './constants';

export type WeaveConnectedUsersPluginConfig = {
  getUser: () => WeaveUser;
};

export type WeaveConnectedUsersPluginCallbacks = {
  onConnectedUsersChanged?: WeaveConnectedUsersChangeCallback;
};

export type WeaveConnectedUsersPluginParams = {
  config: WeaveConnectedUsersPluginConfig;
  callbacks?: WeaveConnectedUsersPluginCallbacks;
};

export type WeaveConnectedUsersChanged = {
  [userName: string]: WeaveUser;
};

export type WeaveConnectedUsersChangeCallback = (
  users: WeaveConnectedUsersChanged
) => void;

export type WeaveConnectedUserInfoKey = typeof WEAVE_CONNECTED_USER_INFO_KEY;
