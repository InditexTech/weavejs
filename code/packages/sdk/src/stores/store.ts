import { Weave } from "@/weave";
import { WeaveAwarenessChange, WeaveState } from "@/types";
import { MappedTypeDescription } from "@syncedstore/core/types/doc";
import { syncedStore, getYjsDoc } from "@syncedstore/core";
import { Doc } from "yjs";

export abstract class WeaveStore {
  protected instance!: Weave;
  protected name!: string;
  private state!: MappedTypeDescription<WeaveState>;
  private latestState: WeaveState;
  private document: Doc;

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
    return "storeName";
  }

  register(instance: Weave) {
    this.instance = instance;
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

  abstract connect(): void;

  abstract disconnect(): void;

  abstract onAwarenessChange<K extends string, T>(callback: (changes: WeaveAwarenessChange<K, T>[]) => void): void;

  abstract setAwarenessInfo(field: string, value: unknown): void;

  abstract canUndoStateStep(): boolean;

  abstract canRedoStateStep(): boolean;

  abstract undoStateStep(): void;

  abstract redoStateStep(): void;
}
