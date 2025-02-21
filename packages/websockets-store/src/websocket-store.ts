import { isEqual, orderBy } from "lodash";
import {
  STATE_ACTIONS,
  WeaveStore,
  WeaveAwarenessChange,
  WeaveState,
  GroupsStateChange,
  NodesStateChange,
} from "@weavejs/sdk";
import { observeDeep, getYjsValue } from "@syncedstore/core";
import { AbstractType, UndoManager } from "yjs";
import { WebsocketProvider } from "y-websocket";
import { WeaveWebsocketStoreCallbacks, WeaveWebsocketStoreOptions } from "./types";

export class WeaveWebsocketStore extends WeaveStore {
  private config: WeaveWebsocketStoreOptions;
  private roomId: string;
  private undoManager!: UndoManager;
  private internalProvider!: WebsocketProvider;
  private callbacks!: WeaveWebsocketStoreCallbacks | undefined;
  private initialLoad: boolean;

  constructor(options: WeaveWebsocketStoreOptions, callbacks?: WeaveWebsocketStoreCallbacks) {
    super();

    const { roomId } = options;

    this.config = options;
    this.roomId = roomId;
    this.initialLoad = true;
    this.callbacks = callbacks;
  }

  private init() {
    const {
      wsOptions: { serverUrl },
    } = this.config;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const weaveStateValues = getYjsValue(this.getState().weave) as AbstractType<any>;

    if (weaveStateValues) {
      this.undoManager = new UndoManager([weaveStateValues], {
        captureTimeout: 250,
        captureTransaction: (tran) => tran.beforeState.size !== 0,
      });

      this.undoManager.on("stack-item-added", () => {
        this.callbacks?.onUndoManagerStatusChange?.({
          canUndo: this.undoManager.canUndo(),
          canRedo: this.undoManager.canRedo(),
          redoStackLength: this.undoManager.redoStack.length,
          undoStackLength: this.undoManager.undoStack.length,
        });
      });

      this.undoManager.on("stack-item-popped", () => {
        this.callbacks?.onUndoManagerStatusChange?.({
          canUndo: this.undoManager.canUndo(),
          canRedo: this.undoManager.canRedo(),
          redoStackLength: this.undoManager.redoStack.length,
          undoStackLength: this.undoManager.undoStack.length,
        });
      });
    }

    this.internalProvider = new WebsocketProvider(serverUrl, this.roomId, this.getDocument(), {
      connect: false,
      disableBc: true,
    });

    this.internalProvider.on("status", ({ status }) => {
      this.callbacks?.onConnectionStatusChange?.(status);
    });

    observeDeep(this.getState(), () => {
      try {
        const latestState = this.getLatestState();
        const newState = JSON.parse(JSON.stringify(this.getState(), undefined, 2)) as WeaveState;

        if (isEqual(newState, latestState)) {
          return;
        }

        if (this.initialLoad) {
          // eslint-disable-next-line no-console
          console.log("CREATING INITIAL STATE...");
        }

        this.onGroupsChange(newState);
        this.onNodesChange(newState);

        if (!isEqual(newState, latestState)) {
          this.callbacks?.onStateChange?.(newState);
        }

        if (this.initialLoad) {
          this.initialLoad = false;
        }

        this.setLatestState(newState);
      } catch (error) {
        console.error("Error processing state change:", error);
      }
    });
  }

  onNodesChange(newState: WeaveState) {
    const nodesManager = this.instance.getNodesManager();
    const latestState = this.getLatestState();

    const createChanges: NodesStateChange[] = [];
    const updateChanges: NodesStateChange[] = [];
    const deleteChanges: NodesStateChange[] = [];

    for (const nodeId of Object.keys(newState.weave?.nodes ?? {})) {
      const node = newState.weave.nodes[nodeId];
      const oldNode = latestState.weave.nodes[nodeId];

      if (node && !oldNode) {
        createChanges.push({ action: STATE_ACTIONS.CREATE, value: node });
      }
      if (node && oldNode && !isEqual(node, oldNode)) {
        updateChanges.push({ action: STATE_ACTIONS.UPDATE, value: node });
      }
    }

    for (const nodeId of Object.keys(latestState.weave?.nodes ?? {})) {
      const node = latestState.weave.nodes[nodeId];

      if (!newState.weave.nodes[nodeId]) {
        deleteChanges.push({ action: STATE_ACTIONS.DELETE, value: node });
      }
    }

    const sortedCreateChanges = orderBy(createChanges, ["value.zIndex"], ["asc", "asc"]);
    const sortedDeleteChanges = orderBy(deleteChanges, ["value.zIndex"], ["asc", "asc"]);
    const sortedUpdateChanges = orderBy(updateChanges, ["value.zIndex"], ["asc", "asc"]);

    for (const change of sortedCreateChanges) {
      nodesManager.handleStateChange(change);
    }

    for (const change of sortedUpdateChanges) {
      nodesManager.handleStateChange(change);
    }

    for (const change of sortedDeleteChanges) {
      nodesManager.handleStateChange(change);
    }
  }

  onGroupsChange(newState: WeaveState) {
    const groupsManager = this.instance.getGroupsManager();
    const latestState = this.getLatestState();

    const createChanges: GroupsStateChange[] = [];
    const updateChanges: GroupsStateChange[] = [];
    const deleteChanges: GroupsStateChange[] = [];

    for (const groupId of Object.keys(newState.weave?.groups ?? {})) {
      const group = newState.weave.groups[groupId];
      const oldGroup = latestState.weave.groups[groupId];

      if (group && !oldGroup) {
        createChanges.push({ action: STATE_ACTIONS.CREATE, value: group });
      }
      if (group && oldGroup && !isEqual(group, oldGroup)) {
        updateChanges.push({ action: STATE_ACTIONS.UPDATE, value: group });
      }
    }

    for (const groupId of Object.keys(latestState.weave?.groups ?? {})) {
      const group = latestState.weave.groups[groupId];

      if (!newState.weave.groups[groupId]) {
        deleteChanges.push({ action: STATE_ACTIONS.DELETE, value: group });
      }
    }

    for (const change of createChanges) {
      groupsManager.handleStateChange(change);
    }

    for (const change of updateChanges) {
      groupsManager.handleStateChange(change);
    }

    for (const change of deleteChanges) {
      groupsManager.handleStateChange(change);
    }
  }

  connect() {
    this.init();
    this.internalProvider.connect();
  }

  disconnect() {
    this.internalProvider.connect();
  }

  setAwarenessInfo(field: string, value: unknown) {
    const awareness = this.internalProvider.awareness;
    awareness.setLocalStateField(field, value);
  }

  onAwarenessChange<K extends string, T>(callback: (changes: WeaveAwarenessChange<K, T>[]) => void): void {
    const awareness = this.internalProvider.awareness;
    awareness.on("change", () => {
      const values = Array.from(awareness.getStates().values());
      values.splice(awareness.clientID, 1);
      callback(values as WeaveAwarenessChange<K, T>[]);
    });
  }

  canUndoStateStep() {
    return this.undoManager.canUndo();
  }

  canRedoStateStep() {
    return this.undoManager.canRedo();
  }

  undoStateStep() {
    this.undoManager.undo();
  }

  redoStateStep() {
    this.undoManager.redo();
  }
}
