// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { isEmpty } from 'lodash';
import { Weave } from '@/weave';
import {
  type WeaveState,
  type WeaveStoreBase,
  type WeaveUndoRedoChange,
  type WeaveStoreOptions,
  type WeaveUser,
  type MappedTypeDescription,
  type WeaveStoreConnectionStatus,
  type WeaveStoreOnStoreConnectionStatusChangeEvent,
} from '@inditextech/weave-types';
import {
  observeDeep,
  syncedStore,
  getYjsDoc,
  getYjsValue,
} from '@syncedstore/core';
import { Doc, AbstractType, UndoManager } from 'yjs';
import { type Logger } from 'pino';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveStoreOnNodeChangeEvent,
  WeaveStoreOnRoomLoadedEvent,
  WeaveStoreOnStateChangeEvent,
  WeaveStoreOnUndoRedoChangeEvent,
} from './types';

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

  getLogger(): Logger {
    return this.logger;
  }

  register(instance: Weave): WeaveStore {
    this.instance = instance;
    this.logger = this.instance.getChildLogger(this.getName());

    this.instance
      .getMainLogger()
      .info(`Store with name [${this.getName()}] registered`);

    this.instance.emitEvent<WeaveStoreOnRoomLoadedEvent>(
      'onRoomLoaded',
      this.isRoomLoaded
    );

    return this;
  }

  getUser(): WeaveUser {
    return this.config.getUser();
  }

  setState(state: WeaveState): void {
    this.state = state;
  }

  setLatestState(newState: WeaveState): void {
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

  setup(): void {
    this.isRoomLoaded = false;

    this.instance.emitEvent<WeaveStoreOnRoomLoadedEvent>(
      'onRoomLoaded',
      this.isRoomLoaded
    );

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

          this.instance.emitEvent<WeaveStoreOnUndoRedoChangeEvent>(
            'onUndoManagerStatusChange',
            change
          );
        });

        this.undoManager.on('stack-item-popped', () => {
          const change: WeaveUndoRedoChange = {
            canUndo: this.undoManager.canUndo(),
            canRedo: this.undoManager.canRedo(),
            redoStackLength: this.undoManager.redoStack.length,
            undoStackLength: this.undoManager.undoStack.length,
          };

          this.instance.emitEvent<WeaveStoreOnUndoRedoChangeEvent>(
            'onUndoManagerStatusChange',
            change
          );
        });
      }
    }

    observeDeep(this.getState(), () => {
      const newState: WeaveState = JSON.parse(JSON.stringify(this.getState()));

      this.instance.emitEvent<WeaveStoreOnStateChangeEvent>(
        'onStateChange',
        newState
      );

      const nodesSelectionPlugin =
        this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

      if (
        this.isRoomLoaded &&
        nodesSelectionPlugin &&
        nodesSelectionPlugin.getSelectedNodes().length === 1
      ) {
        const selectedNode = nodesSelectionPlugin.getSelectedNodes()[0];
        const nodeInfo = this.instance.getNode(
          selectedNode.getAttrs().id ?? ''
        );

        if (nodeInfo && nodeInfo.node) {
          this.instance.emitEvent<WeaveStoreOnNodeChangeEvent>('onNodeChange', {
            instance: selectedNode,
            node: JSON.parse(JSON.stringify(nodeInfo.node)),
          });
        }
      }

      if (!this.isRoomLoaded && !isEmpty(this.state.weave)) {
        this.instance.setupRenderer();
        this.isRoomLoaded = true;

        this.instance.emitEvent<WeaveStoreOnRoomLoadedEvent>(
          'onRoomLoaded',
          this.isRoomLoaded
        );
      }
      if (this.isRoomLoaded && !isEmpty(this.state.weave)) {
        this.instance.render();
      }
    });
  }

  canUndoStateStep(): boolean {
    if (!this.supportsUndoManager) {
      throw new Error('Undo manager not supported');
    }

    return this.undoManager.canUndo();
  }

  canRedoStateStep(): boolean {
    if (!this.supportsUndoManager) {
      throw new Error('Undo manager not supported');
    }

    return this.undoManager.canRedo();
  }

  undoStateStep(): void {
    if (!this.supportsUndoManager) {
      throw new Error('Undo manager not supported');
    }

    this.undoManager.undo();
  }

  redoStateStep(): void {
    if (!this.supportsUndoManager) {
      throw new Error('Undo manager not supported');
    }

    this.undoManager.redo();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleConnectionStatusChange(status: WeaveStoreConnectionStatus): void {
    this.instance.emitEvent<WeaveStoreOnStoreConnectionStatusChangeEvent>(
      'onStoreConnectionStatusChange',
      status
    );
  }

  abstract connect(): void;

  abstract disconnect(): void;

  abstract setAwarenessInfo(field: string, value: unknown): void;
}
