// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WeaveAwarenessChange,
  WeaveUndoManagerOptions,
  WeaveUser,
} from '@/types';

export type WeaveStoreOptions = {
  getUser: () => WeaveUser;
  undoManagerOptions?: WeaveUndoManagerOptions;
};

export interface WeaveStoreBase {
  connect(): void;

  disconnect(): void;

  onAwarenessChange<K extends string, T>(
    callback: (changes: WeaveAwarenessChange<K, T>[]) => void
  ): void;

  setAwarenessInfo(field: string, value: unknown): void;
}
