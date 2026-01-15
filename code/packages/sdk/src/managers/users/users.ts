// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveAwarenessChange,
  type WeaveUser,
} from '@inditextech/weave-types';
import { Weave } from '@/weave';
import { type Logger } from 'pino';
import type { WeaveUserInfoKey } from './types';
import { WEAVE_USER_INFO_KEY } from './constants';

export class WeaveUsersManager {
  private readonly instance: Weave;
  private readonly logger: Logger;
  private connectedUsers: Map<string, WeaveUser>;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('users-manager');
    this.logger.debug('Users manager created');

    this.connectedUsers = new Map();

    this.init();
  }

  private init(): void {
    this.instance.addEventListener(
      'onAwarenessChange',
      (changes: WeaveAwarenessChange<WeaveUserInfoKey, WeaveUser>[]) => {
        let usersChanged = false;

        const actualUsers = Array.from(this.connectedUsers.values());

        const users = [];
        for (const change of changes) {
          if (!change[WEAVE_USER_INFO_KEY]) {
            continue;
          }

          if (change[WEAVE_USER_INFO_KEY]) {
            const userInformation = change[WEAVE_USER_INFO_KEY];
            users.push(userInformation);
          }
        }

        for (const user of users) {
          if (!this.connectedUsers.has(user.id)) {
            this.logger.debug(`User connected: ${user.name}`);
            this.connectedUsers.set(user.id, user);
            usersChanged = true;
          }
        }

        for (const userInformation of actualUsers) {
          const user = users.find((u) => u.id === userInformation.id);
          if (user === undefined) {
            this.logger.debug(`User disconnected: ${userInformation.name}`);
            this.connectedUsers.delete(userInformation.id);
            usersChanged = true;
          }
        }

        if (usersChanged) {
          this.instance.emitEvent('onUsersChange');
        }
      }
    );
  }

  public getUsers(): WeaveUser[] {
    return Array.from(this.connectedUsers.values());
  }
}
