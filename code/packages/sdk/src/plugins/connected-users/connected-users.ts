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
  type WeaveConnectedUsersPluginConfig,
  type WeaveConnectedUsersChangeEvent,
} from './types';
import {
  WEAVE_CONNECTED_USER_INFO_KEY,
  WEAVE_CONNECTED_USERS_KEY,
} from './constants';

export class WeaveConnectedUsersPlugin extends WeavePlugin {
  private config!: WeaveConnectedUsersPluginConfig;
  private connectedUsers: Record<string, WeaveUser> = {};
  getLayerName = undefined;
  initLayer: undefined;
  onRender: undefined;

  constructor(params: WeaveConnectedUsersPluginParams) {
    super();

    const { config } = params ?? {};

    this.config = config;

    this.connectedUsers = {};
  }

  getName(): string {
    return WEAVE_CONNECTED_USERS_KEY;
  }

  onInit(): void {
    const store = this.instance.getStore();

    const userInfo = this.config.getUser();
    store.setAwarenessInfo(WEAVE_CONNECTED_USER_INFO_KEY, userInfo);
    this.instance.emitEvent<WeaveConnectedUsersChangeEvent>(
      'onConnectedUsersChange',
      { [userInfo.name]: userInfo }
    );

    this.instance.addEventListener('onConnectionStatusChange', (status) => {
      if (status === 'connected') {
        const userInfo = this.config.getUser();
        store.setAwarenessInfo(WEAVE_CONNECTED_USER_INFO_KEY, userInfo);
      } else {
        store.setAwarenessInfo(WEAVE_CONNECTED_USER_INFO_KEY, undefined);
      }
    });

    this.instance.addEventListener(
      'onAwarenessChange',
      (
        changes: WeaveAwarenessChange<WeaveConnectedUserInfoKey, WeaveUser>[]
      ) => {
        if (!this.enabled) {
          this.connectedUsers = {};
          this.instance.emitEvent<WeaveConnectedUsersChangeEvent>(
            'onConnectedUsersChange',
            {}
          );
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
          this.instance.emitEvent<WeaveConnectedUsersChangeEvent>(
            'onConnectedUsersChange',
            newConnectedUsers
          );
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
