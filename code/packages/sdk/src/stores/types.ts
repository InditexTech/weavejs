import { WeaveUser } from '@/types';

export type WeaveUndoManagerOptions = {
  captureTimeout?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackedOrigins?: Set<any>;
};

export type WeaveStoreOptions = {
  getUser: () => WeaveUser;
  undoManagerOptions?: WeaveUndoManagerOptions;
};
