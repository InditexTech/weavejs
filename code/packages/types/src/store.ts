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
