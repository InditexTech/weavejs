// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import type {
  WeaveNode,
  WeaveAction,
  WeavePlugin,
  WeaveStore,
} from '@inditextech/weave-sdk';
import { Weave } from '@inditextech/weave-sdk';
import {
  type WeaveState,
  type WeaveFont,
  type WeaveUndoRedoChange,
  type WeaveStatus,
  WEAVE_INSTANCE_STATUS,
  type WeaveStoreConnectionStatus,
  type WeavePerformanceConfig,
  type WeaveChildLoggerLevel,
} from '@inditextech/weave-types';
import { useWeave } from './store';

type WeaveProviderType = {
  getContainer: () => HTMLElement;
  fonts?: WeaveFont[] | (() => Promise<WeaveFont[]>);
  store: WeaveStore;
  nodes?: WeaveNode[];
  actions?: WeaveAction[];
  plugins?: WeavePlugin[];
  performance?: WeavePerformanceConfig;
  children: React.ReactNode;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logModules?: WeaveChildLoggerLevel[];
};

export const WeaveProvider = ({
  getContainer,
  store,
  nodes = [],
  actions = [],
  plugins = [],
  fonts = [],
  logLevel = 'info',
  logModules = [],
  performance,
  children,
}: Readonly<WeaveProviderType>): React.JSX.Element => {
  const weaveInstanceRef = React.useRef<Weave | null>(null);
  const selectedNodes = useWeave((state) => state.selection.nodes);

  const setInstance = useWeave((state) => state.setInstance);
  const setAppState = useWeave((state) => state.setAppState);
  const setStatus = useWeave((state) => state.setStatus);
  const setRoomLoaded = useWeave((state) => state.setRoomLoaded);
  const setCanUndo = useWeave((state) => state.setCanUndo);
  const setCanRedo = useWeave((state) => state.setCanRedo);
  const setActualAction = useWeave((state) => state.setActualAction);
  const setConnectionStatus = useWeave((state) => state.setConnectionStatus);

  const onInstanceStatusHandler = React.useCallback(
    (status: WeaveStatus) => {
      setStatus(status);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onStoreConnectionStatusChangeHandler = React.useCallback(
    (status: WeaveStoreConnectionStatus) => {
      setConnectionStatus(status);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onRoomLoadedHandler = React.useCallback(
    (status: boolean) => {
      setRoomLoaded(status);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onStateChangeHandler = React.useCallback(
    (state: WeaveState) => {
      setAppState(state);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedNodes]
  );

  const onUndoManagerStatusChangeHandler = React.useCallback(
    (undoManagerStatus: WeaveUndoRedoChange) => {
      const { canUndo, canRedo } = undoManagerStatus;
      setCanUndo(canUndo);
      setCanRedo(canRedo);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onActiveActionChangeHandler = React.useCallback(
    (actionName: string | undefined) => {
      setActualAction(actionName);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedNodes]
  );

  React.useEffect(() => {
    async function initWeave() {
      const weaveEle: Element = getContainer();

      if (!weaveEle) {
        throw new Error(`Weave container not defined.`);
      }

      const weaveEleClientRect = weaveEle?.getBoundingClientRect();

      if (weaveEle && !weaveInstanceRef.current) {
        weaveInstanceRef.current = new Weave(
          {
            store,
            nodes,
            actions,
            plugins,
            fonts,
            performance,
            logger: {
              level: logLevel,
              modules: logModules,
            },
          },
          {
            container: weaveEle as HTMLDivElement,
            width: weaveEleClientRect?.width ?? 1920,
            height: weaveEleClientRect?.height ?? 1080,
          }
        );

        weaveInstanceRef.current.addEventListener(
          'onInstanceStatus',
          onInstanceStatusHandler
        );

        weaveInstanceRef.current.addEventListener(
          'onStoreConnectionStatusChange',
          onStoreConnectionStatusChangeHandler
        );

        weaveInstanceRef.current.addEventListener(
          'onRoomLoaded',
          onRoomLoadedHandler
        );

        weaveInstanceRef.current.addEventListener(
          'onStateChange',
          onStateChangeHandler
        );

        weaveInstanceRef.current.addEventListener(
          'onUndoManagerStatusChange',
          onUndoManagerStatusChangeHandler
        );

        weaveInstanceRef.current.addEventListener(
          'onActiveActionChange',
          onActiveActionChangeHandler
        );

        setInstance(weaveInstanceRef.current);
        weaveInstanceRef.current.start();
      }
    }

    setStatus(WEAVE_INSTANCE_STATUS.IDLE);
    setRoomLoaded(false);
    initWeave();

    return () => {
      weaveInstanceRef.current?.removeEventListener(
        'onInstanceStatus',
        onInstanceStatusHandler
      );

      weaveInstanceRef.current?.removeEventListener(
        'onStoreConnectionStatusChange',
        onStoreConnectionStatusChangeHandler
      );

      weaveInstanceRef.current?.removeEventListener(
        'onRoomLoaded',
        onRoomLoadedHandler
      );

      weaveInstanceRef.current?.removeEventListener(
        'onStateChange',
        onStateChangeHandler
      );

      weaveInstanceRef.current?.removeEventListener(
        'onUndoManagerStatusChange',
        onUndoManagerStatusChangeHandler
      );

      weaveInstanceRef.current?.removeEventListener(
        'onActiveActionChange',
        onActiveActionChangeHandler
      );

      setStatus(WEAVE_INSTANCE_STATUS.IDLE);
      setRoomLoaded(false);
      weaveInstanceRef.current?.destroy();
      weaveInstanceRef.current = null;
    };
  }, []);

  return <>{children}</>;
};
