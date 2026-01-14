// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveAwarenessChange,
  type WeaveNodeMutexLock,
  type WeaveUser,
  type WeaveUserMutexLock,
} from '@inditextech/weave-types';
import { Weave } from '@/weave';
import { type Logger } from 'pino';
import { WEAVE_CONNECTED_USER_INFO_KEY } from '@/plugins/connected-users/constants';
import type { WeaveMutexLockChangeEvent } from './types';

export class WeaveMutexManager {
  private readonly instance: Weave;
  private readonly logger: Logger;
  private readonly userMutexLocked: Map<string, WeaveUserMutexLock<unknown>> =
    new Map();
  private readonly nodeMutexLocked: Map<string, WeaveNodeMutexLock<unknown>> =
    new Map();
  private readonly WEAVE_USER_MUTEX_LOCK_KEY = 'userMutexLock';

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('mutex-manager');
    this.logger.debug('Mutex manager created');

    this.init();
  }

  private init(): void {
    this.setupMutexManager();
  }

  private setupMutexManager(): void {
    this.instance.addEventListener(
      'onConnectedUsersChange',
      (users: Record<string, WeaveUser>) => {
        const actUser = this.instance.getStore().getUser();
        const userMutexKeys = Array.from(this.userMutexLocked.keys());
        for (const userMutexKey of userMutexKeys) {
          if (actUser.id !== userMutexKey && !users[userMutexKey]) {
            const info = this.userMutexLocked.get(userMutexKey);
            if (info) {
              const user = info.user;
              this.releaseMutexLockRemote(user);
            }
          }
        }
      }
    );

    this.instance.addEventListener(
      'onAwarenessChange',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (changes: WeaveAwarenessChange<string, any>[]) => {
        const actUser = this.instance.getStore().getUser();

        for (const change of changes) {
          if (
            !change[this.WEAVE_USER_MUTEX_LOCK_KEY] &&
            change[WEAVE_CONNECTED_USER_INFO_KEY] &&
            actUser.id !== change[WEAVE_CONNECTED_USER_INFO_KEY].id
          ) {
            const user = change[WEAVE_CONNECTED_USER_INFO_KEY];
            this.releaseMutexLockRemote(user);
            continue;
          }
          if (
            typeof change[this.WEAVE_USER_MUTEX_LOCK_KEY] !== 'undefined' &&
            change[WEAVE_CONNECTED_USER_INFO_KEY] &&
            actUser.id !== change[WEAVE_CONNECTED_USER_INFO_KEY].id
          ) {
            const user = change[WEAVE_CONNECTED_USER_INFO_KEY];
            const mutexInfo = change[this.WEAVE_USER_MUTEX_LOCK_KEY];
            this.setMutexLockRemote(
              {
                nodeIds: mutexInfo.nodeIds,
                operation: mutexInfo.operation,
                metadata: mutexInfo.metadata,
              },
              user
            );
          }
        }
      }
    );
  }

  async acquireMutexLock(
    { nodeIds, operation }: { nodeIds: string[]; operation: string },
    action: () => void | Promise<void>
  ): Promise<void> {
    const lockAcquired = this.setMutexLock({ nodeIds, operation });

    if (lockAcquired) {
      await Promise.resolve(action());
      this.releaseMutexLock();
    }
  }

  getUserMutexLock<T>(userMutexKey: string): WeaveUserMutexLock<T> | undefined {
    if (this.userMutexLocked.get(userMutexKey)) {
      return this.userMutexLocked.get(userMutexKey) as WeaveUserMutexLock<T>;
    }

    return undefined;
  }

  getNodeMutexLock<T>(nodeMutexKey: string): WeaveUserMutexLock<T> | undefined {
    if (this.nodeMutexLocked.get(nodeMutexKey)) {
      return this.nodeMutexLocked.get(nodeMutexKey) as WeaveUserMutexLock<T>;
    }

    return undefined;
  }

  getUserMutexKey(user?: WeaveUser): string {
    const store = this.instance.getStore();
    let userInfo = store.getUser();
    if (typeof user !== 'undefined') {
      userInfo = user;
    }
    return userInfo.id;
  }

  getNodeMutexKey(nodeId: string): string {
    return nodeId;
  }

  setMutexLockRemote<T>(
    {
      nodeIds,
      operation,
      metadata,
    }: { nodeIds: string[]; operation: string; metadata?: T },
    user: WeaveUser
  ): boolean {
    return this.setMutexLock(
      {
        nodeIds,
        operation,
        metadata,
      },
      user,
      false
    );
  }

  setMutexLock<T>(
    {
      nodeIds,
      operation,
      metadata,
    }: {
      nodeIds: string[];
      operation: string;
      metadata?: T;
    },
    userInfo: WeaveUser | undefined = undefined,
    sendAwareness: boolean = true
  ): boolean {
    const store = this.instance.getStore();
    let user = store.getUser();
    if (typeof userInfo !== 'undefined') {
      user = userInfo;
    }

    const userMutexKey = this.getUserMutexKey(user);

    if (this.userMutexLocked.has(userMutexKey)) {
      return false;
    }

    const preLockedNodes: string[] = [];
    for (const nodeId of nodeIds) {
      const nodeMutexKey = this.getNodeMutexKey(nodeId);

      if (!this.nodeMutexLocked.has(nodeMutexKey)) {
        this.nodeMutexLocked.set(nodeMutexKey, {
          user,
          operation,
          metadata,
        });

        const nodeInstance = this.instance.getStage().findOne(`#${nodeId}`);
        if (nodeInstance) {
          nodeInstance.lockMutex(user);
        }

        preLockedNodes.push(nodeMutexKey);
      } else {
        break;
      }
    }

    if (
      preLockedNodes.length === nodeIds.length &&
      !this.userMutexLocked.has(userMutexKey)
    ) {
      this.userMutexLocked.set(userMutexKey, {
        user,
        nodeIds,
        operation,
        metadata,
      });

      if (sendAwareness) {
        store.setAwarenessInfo(this.WEAVE_USER_MUTEX_LOCK_KEY, {
          user,
          nodeIds,
          operation,
          metadata,
        });
      }

      this.instance.emitEvent<WeaveMutexLockChangeEvent>('onMutexLockChange', {
        locks: [...this.userMutexLocked.keys()],
      });

      return true;
    }

    if (preLockedNodes.length !== nodeIds.length) {
      this.userMutexLocked.delete(userMutexKey);
      for (const nodeMutexKey of preLockedNodes) {
        this.nodeMutexLocked.delete(nodeMutexKey);
      }
    }

    return false;
  }

  releaseMutexLockRemote(user: WeaveUser): void {
    this.releaseMutexLock(user, false);
  }

  releaseMutexLock(
    userInfo: WeaveUser | undefined = undefined,
    sendAwareness: boolean = true
  ): void {
    const store = this.instance.getStore();
    let user = store.getUser();
    if (typeof userInfo !== 'undefined') {
      user = userInfo;
    }

    const userMutexKey = this.getUserMutexKey(user);

    if (this.userMutexLocked.has(userMutexKey)) {
      const nodeIds = this.userMutexLocked.get(userMutexKey)!.nodeIds;

      for (const nodeId of nodeIds) {
        const nodeMutexKey = this.getNodeMutexKey(nodeId);

        this.nodeMutexLocked.delete(nodeMutexKey);

        const nodeInstance = this.instance.getStage().findOne(`#${nodeId}`);
        if (nodeInstance) {
          nodeInstance.releaseMutex();
        }
      }

      this.userMutexLocked.delete(userMutexKey);

      if (sendAwareness) {
        store.setAwarenessInfo(this.WEAVE_USER_MUTEX_LOCK_KEY, undefined);
      }

      this.instance.emitEvent('onMutexLockChange', {
        locks: [...this.userMutexLocked.keys()],
      });
    }
  }
}
