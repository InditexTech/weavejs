// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  // type WeaveAwarenessChange,
  type WeaveUndoManagerOptions,
  type WeaveUser,
} from '@/types';

export type WeaveStoreOptions = {
  getUser: () => WeaveUser;
  undoManagerOptions?: WeaveUndoManagerOptions;
};

export interface WeaveStoreBase {
  connect(): Promise<void>;

  disconnect(): Promise<void>;

  handleAwarenessChange(emit: boolean): void;

  setAwarenessInfo(field: string, value: unknown): void;
}
