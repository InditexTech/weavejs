// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { isEqual } from 'lodash';
import { WeavePlugin } from '@/plugins/plugin';
import { WeaveAwarenessChange, WeaveUser } from '@inditextech/weave-types';
import {
  WeaveConnectedUsersChangeCallback,
  WeaveConnectedUsersPluginParams,
  WeaveConnectedUserInfoKey,
} from './types';
import { WEAVE_CONNECTED_USER_INFO_KEY } from './constants';

export class WeaveConnectedUsersPlugin extends WeavePlugin {
  private connectedUsers: Record<string, WeaveUser> = {};
  private getUser: () => WeaveUser;
  private onConnectedUsersChanged:
    | WeaveConnectedUsersChangeCallback
    | undefined;
  getLayerName = undefined;
  initLayer: undefined;
  render: undefined;

  constructor(params: WeaveConnectedUsersPluginParams) {
    super();

    const { getUser, onConnectedUsersChanged } = params;

    this.connectedUsers = {};

    this.onConnectedUsersChanged = onConnectedUsersChanged;
    this.getUser =
      getUser ?? (() => ({ name: 'Unknown', email: 'unknown@domain.com' }));
  }

  getName() {
    return 'connectedUsers';
  }

  init() {
    const store = this.instance.getStore();

    const userInfo = this.getUser();
    store.setAwarenessInfo(WEAVE_CONNECTED_USER_INFO_KEY, userInfo);
    this.onConnectedUsersChanged?.({ [userInfo.name]: userInfo });

    store.onAwarenessChange(
      (
        changes: WeaveAwarenessChange<WeaveConnectedUserInfoKey, WeaveUser>[]
      ) => {
        if (!this.enabled) {
          this.connectedUsers = {};
          this.onConnectedUsersChanged?.({});
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
          this.onConnectedUsersChanged?.(newConnectedUsers);
        }

        this.connectedUsers = newConnectedUsers;
      }
    );
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}
