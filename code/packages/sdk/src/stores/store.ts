// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { isEmpty } from 'lodash';
import { Weave } from '@/weave';
import {
  WeaveAwarenessChange,
  WeaveState,
  WeaveStoreBase,
  WeaveUndoRedoChange,
  WeaveStoreOptions,
} from '@inditextech/weave-types';
import { MappedTypeDescription } from '@syncedstore/core/types/doc';
import {
  observeDeep,
  syncedStore,
  getYjsDoc,
  getYjsValue,
} from '@syncedstore/core';
import { Doc, AbstractType, UndoManager } from 'yjs';
import { Logger } from 'pino';

export abstract class WeaveStore implements WeaveStoreBase {
  protected instance!: Weave;
  protected name!: string;
  protected supportsUndoManager!: boolean;
  protected config!: WeaveStoreOptions;

  private state!: MappedTypeDescription<WeaveState>;
  private latestState: WeaveState;
  private document: Doc;
  private logger!: Logger;
  private undoManager!: UndoManager;
  private isRoomLoaded: boolean = false;

  constructor(config: WeaveStoreOptions) {
    this.config = config;
    this.latestState = {
      weave: {},
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

    this.instance
      .getMainLogger()
      .info(`Store with name [${this.getName()}] registered`);

    return this;
  }

  getUser() {
    return this.config.getUser();
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

    config.callbacks?.onRoomLoaded?.(this.isRoomLoaded);
    this.instance.emitEvent('onRoomLoaded', this.isRoomLoaded);

    if (this.supportsUndoManager) {
      const weaveStateValues = getYjsValue(
        this.getState().weave
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as AbstractType<any>;

      if (weaveStateValues) {
        this.undoManager = new UndoManager([weaveStateValues], {
          captureTimeout: 250,
          trackedOrigins: new Set([this.config.getUser().name]),
          ...this.config?.undoManagerOptions,
        });

        this.undoManager.addTrackedOrigin(this.config.getUser().name);

        this.undoManager.on('stack-item-added', () => {
          const change: WeaveUndoRedoChange = {
            canUndo: this.undoManager.canUndo(),
            canRedo: this.undoManager.canRedo(),
            redoStackLength: this.undoManager.redoStack.length,
            undoStackLength: this.undoManager.undoStack.length,
          };

          config.callbacks?.onUndoManagerStatusChange?.(change);
          this.instance.emitEvent('onUndoManagerStatusChange', change);
        });

        this.undoManager.on('stack-item-popped', () => {
          const change: WeaveUndoRedoChange = {
            canUndo: this.undoManager.canUndo(),
            canRedo: this.undoManager.canRedo(),
            redoStackLength: this.undoManager.redoStack.length,
            undoStackLength: this.undoManager.undoStack.length,
          };

          config.callbacks?.onUndoManagerStatusChange?.(change);
          this.instance.emitEvent('onUndoManagerStatusChange', change);
        });
      }
    }

    observeDeep(this.getState(), () => {
      const newState = JSON.parse(JSON.stringify(this.getState()));

      config.callbacks?.onStateChange?.(newState);
      this.instance.emitEvent('onStateChange', newState);

      if (!this.isRoomLoaded && !isEmpty(this.state.weave)) {
        this.instance.setupRenderer();
        this.isRoomLoaded = true;

        config.callbacks?.onRoomLoaded?.(this.isRoomLoaded);
        this.instance.emitEvent('onRoomLoaded', this.isRoomLoaded);
      }
      if (this.isRoomLoaded && !isEmpty(this.state.weave)) {
        this.instance.render();
      }
    });
  }

  canUndoStateStep() {
    if (!this.supportsUndoManager) {
      throw new Error('Undo manager not supported');
    }

    return this.undoManager.canUndo();
  }

  canRedoStateStep() {
    if (!this.supportsUndoManager) {
      throw new Error('Undo manager not supported');
    }

    return this.undoManager.canRedo();
  }

  undoStateStep() {
    if (!this.supportsUndoManager) {
      throw new Error('Undo manager not supported');
    }

    this.undoManager.undo();
  }

  redoStateStep() {
    if (!this.supportsUndoManager) {
      throw new Error('Undo manager not supported');
    }

    this.undoManager.redo();
  }

  abstract connect(): void;

  abstract disconnect(): void;

  abstract onAwarenessChange<K extends string, T>(
    callback: (changes: WeaveAwarenessChange<K, T>[]) => void
  ): void;

  abstract setAwarenessInfo(field: string, value: unknown): void;
}
