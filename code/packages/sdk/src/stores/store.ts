import { Weave } from "@/weave";
import { WeaveAwarenessChange, WeaveState, WeaveUndoRedoChange } from "@/types";
import { MappedTypeDescription } from "@syncedstore/core/types/doc";
import { observeDeep, syncedStore, getYjsDoc, getYjsValue } from "@syncedstore/core";
import { Doc, AbstractType, UndoManager } from "yjs";
import { Logger } from "pino";

export abstract class WeaveStore {
  protected instance!: Weave;
  protected name!: string;
  protected supportsUndoManager!: boolean;

  private state!: MappedTypeDescription<WeaveState>;
  private latestState: WeaveState;
  private document: Doc;
  private logger!: Logger;
  private undoManager!: UndoManager;

  constructor() {
    this.latestState = {
      weave: {
        key: "stage",
        type: "stage",
        props: {
          id: "stage",
          children: [],
        },
      },
    };
    this.state = syncedStore<WeaveState>({
      weave: {},
    });
    this.document = getYjsDoc(this.state);
  }

  getName(): string {
    return this.name;
  }

  getLogger() {
    return this.logger;
  }

  register(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger(this.getName());

    this.instance.getMainLogger().info(`Store with name [${this.getName()}] registered`);

    return this;
  }

  setState(state: WeaveState) {
    this.state = state;
  }

  setLatestState(newState: WeaveState) {
    this.latestState = newState;
  }

  getLatestState(): WeaveState {
    return this.latestState;
  }

  getDocument(): Doc {
    return this.document;
  }

  getState(): MappedTypeDescription<WeaveState> {
    return this.state;
  }

  getStateJson(): WeaveState {
    return JSON.parse(JSON.stringify(this.state, undefined, 2)) as WeaveState;
  }

  setup() {
    const config = this.instance.getConfiguration();

    if (this.supportsUndoManager) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weaveStateValues = getYjsValue(this.getState().weave) as AbstractType<any>;

      if (weaveStateValues) {
        this.undoManager = new UndoManager([weaveStateValues], {
          captureTimeout: 250,
          captureTransaction: (tran) => tran.beforeState.size !== 0,
        });

        this.undoManager.on("stack-item-added", () => {
          const change: WeaveUndoRedoChange = {
            canUndo: this.undoManager.canUndo(),
            canRedo: this.undoManager.canRedo(),
            redoStackLength: this.undoManager.redoStack.length,
            undoStackLength: this.undoManager.undoStack.length,
          };

          config.callbacks?.onUndoManagerStatusChange?.(change);
          this.instance.emitEvent("onUndoManagerStatusChange", change);
        });

        this.undoManager.on("stack-item-popped", () => {
          const change: WeaveUndoRedoChange = {
            canUndo: this.undoManager.canUndo(),
            canRedo: this.undoManager.canRedo(),
            redoStackLength: this.undoManager.redoStack.length,
            undoStackLength: this.undoManager.undoStack.length,
          };

          config.callbacks?.onUndoManagerStatusChange?.(change);
          this.instance.emitEvent("onUndoManagerStatusChange", change);
        });
      }
    }

    observeDeep(this.getState(), () => {
      const newState = JSON.parse(JSON.stringify(this.getState()));
      config.callbacks?.onStateChange?.(newState);
      this.instance.emitEvent("onStateChange", newState);
      this.instance.render();
    });

    this.instance.getStageManager().setupStage();
  }

  canUndoStateStep() {
    if (!this.supportsUndoManager) {
      throw new Error("Undo manager not supported");
    }

    return this.undoManager.canUndo();
  }

  canRedoStateStep() {
    if (!this.supportsUndoManager) {
      throw new Error("Undo manager not supported");
    }

    return this.undoManager.canRedo();
  }

  undoStateStep() {
    if (!this.supportsUndoManager) {
      throw new Error("Undo manager not supported");
    }

    this.undoManager.undo();
  }

  redoStateStep() {
    if (!this.supportsUndoManager) {
      throw new Error("Undo manager not supported");
    }

    this.undoManager.redo();
  }

  abstract connect(): void;

  abstract disconnect(): void;

  abstract onAwarenessChange<K extends string, T>(callback: (changes: WeaveAwarenessChange<K, T>[]) => void): void;

  abstract setAwarenessInfo(field: string, value: unknown): void;
}
