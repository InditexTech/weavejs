import { WeaveState } from "@weavejs/sdk";
import { WEAVE_WEBSOCKET_CONNECTION_STATUS } from "./constants";

export type WeaveWebsocketConnectionStatusKeys = keyof typeof WEAVE_WEBSOCKET_CONNECTION_STATUS;
export type WeaveWebsocketConnectionStatus =
  (typeof WEAVE_WEBSOCKET_CONNECTION_STATUS)[WeaveWebsocketConnectionStatusKeys];

export type WeaveUndoRedoChange = {
  canRedo: boolean;
  canUndo: boolean;
  redoStackLength: number;
  undoStackLength: number;
};

export type WeaveWebsocketStoreOptions = {
  roomId: string;
  wsOptions: {
    serverUrl: string;
  };
};

export type WeaveWebsocketStoreCallbacks = {
  onStateChange?: (state: WeaveState) => void;
  onConnectionStatusChange?: (status: WeaveWebsocketConnectionStatus) => void;
  onUndoManagerStatusChange?: (undoManagerStatus: WeaveUndoRedoChange) => void;
};
