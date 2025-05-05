// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { isEqual } from 'lodash';
import { WeavePlugin } from '@/plugins/plugin';
import {
  type WeaveAwarenessChange,
  type WeaveUser,
} from '@inditextech/weave-types';
import {
  type WeaveConnectedUsersPluginParams,
  type WeaveConnectedUserInfoKey,
  type WeaveConnectedUsersPluginCallbacks,
  type WeaveConnectedUsersPluginConfig,
} from './types';
import {
  WEAVE_CONNECTED_USER_INFO_KEY,
  WEAVE_CONNECTED_USERS_KEY,
} from './constants';

export class WeaveConnectedUsersPlugin extends WeavePlugin {
  private config!: WeaveConnectedUsersPluginConfig;
  private callbacks!: WeaveConnectedUsersPluginCallbacks;
  private connectedUsers: Record<string, WeaveUser> = {};
  getLayerName = undefined;
  initLayer: undefined;
  onRender: undefined;

  constructor(params: WeaveConnectedUsersPluginParams) {
    super();

    const { config, callbacks } = params ?? {};

    this.config = config;
    this.callbacks = callbacks ?? {};

    this.connectedUsers = {};
  }

  getName(): string {
    return WEAVE_CONNECTED_USERS_KEY;
  }

  onInit(): void {
    const store = this.instance.getStore();

    const userInfo = this.config.getUser();
    store.setAwarenessInfo(WEAVE_CONNECTED_USER_INFO_KEY, userInfo);
    this.callbacks?.onConnectedUsersChanged?.({ [userInfo.name]: userInfo });

    store.onAwarenessChange(
      (
        changes: WeaveAwarenessChange<WeaveConnectedUserInfoKey, WeaveUser>[]
      ) => {
        if (!this.enabled) {
          this.connectedUsers = {};
          this.callbacks?.onConnectedUsersChanged?.({});
          return;
        }

        const newConnectedUsers: Record<string, WeaveUser> = {};
        for (const change of changes) {
          if (!change[WEAVE_CONNECTED_USER_INFO_KEY]) {
            continue;
          }

          if (change[WEAVE_CONNECTED_USER_INFO_KEY]) {
            const userInformation = change[WEAVE_CONNECTED_USER_INFO_KEY];
            newConnectedUsers[userInformation.name] = userInformation;
          }
        }

        if (!isEqual(this.connectedUsers, newConnectedUsers)) {
          this.callbacks?.onConnectedUsersChanged?.(newConnectedUsers);
        }

        this.connectedUsers = newConnectedUsers;
      }
    );
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
