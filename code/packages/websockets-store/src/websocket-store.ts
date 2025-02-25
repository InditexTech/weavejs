import { WeaveStore, WeaveAwarenessChange } from "@weavejs/sdk";
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

  constructor(options: WeaveWebsocketStoreOptions, callbacks?: WeaveWebsocketStoreCallbacks) {
    super();

    const { roomId } = options;

    this.name = "weaveWebsocketStore";
    this.config = options;
    this.roomId = roomId;
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
      this.instance.render();
    });

    const stageConfig = this.instance.getStageConfiguration();

    this.getState().weave.key = "stage";
    this.getState().weave.type = "stage";
    this.getState().weave.props = {
      id: "stage",
      container: stageConfig?.container ?? "weave",
      width: stageConfig?.width,
      height: stageConfig?.height,
      children: [
        {
          key: "gridLayer",
          type: "layer",
          props: {
            id: "gridLayer",
            children: [],
          },
        },
        {
          key: "mainLayer",
          type: "layer",
          props: {
            id: "mainLayer",
            children: [],
          },
        },
        {
          key: "selectionLayer",
          type: "layer",
          props: {
            id: "selectionLayer",
            children: [],
          },
        },
        {
          key: "usersPointersLayer",
          type: "layer",
          props: {
            id: "usersPointersLayer",
            children: [],
          },
        },
        {
          key: "imageEditionLayer",
          type: "layer",
          props: {
            id: "imageEditionLayer",
            children: [],
          },
        },
      ],
    };
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
