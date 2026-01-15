// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { isEqual } from 'lodash';
import { WeavePlugin } from '@/plugins/plugin';
import { type WeaveUser } from '@inditextech/weave-types';
import {
  type WeaveConnectedUsersPluginParams,
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
      { [userInfo.id]: userInfo }
    );

    this.instance.addEventListener(
      'onStoreConnectionStatusChange',
      (status) => {
        if (status === 'connected') {
          const userInfo = this.config.getUser();
          store.setAwarenessInfo(WEAVE_CONNECTED_USER_INFO_KEY, userInfo);
        } else {
          store.setAwarenessInfo(WEAVE_CONNECTED_USER_INFO_KEY, undefined);
        }
      }
    );

    this.instance.addEventListener('onUsersChange', () => {
      if (!this.enabled) {
        this.instance.emitEvent<WeaveConnectedUsersChangeEvent>(
          'onConnectedUsersChange',
          {}
        );
        return;
      }

      const actualUsers = this.instance.getUsers();

      const newUsers: Record<string, WeaveUser> = {};
      for (const user of actualUsers) {
        newUsers[user.id] = user;
      }

      if (!isEqual(this.connectedUsers, newUsers)) {
        this.instance.emitEvent<WeaveConnectedUsersChangeEvent>(
          'onConnectedUsersChange',
          newUsers
        );
      }

      this.connectedUsers = newUsers;
    });
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
