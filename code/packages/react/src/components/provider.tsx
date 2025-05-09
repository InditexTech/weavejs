// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
  Weave,
  WeaveStageGridPlugin,
  WeaveNodesSelectionPlugin,
  WeaveStagePanningPlugin,
  WeaveStageResizePlugin,
  WeaveStageZoomPlugin,
  WeaveConnectedUsersPlugin,
  WeaveUsersPointersPlugin,
  WeaveStageDropAreaPlugin,
  WeaveCopyPasteNodesPlugin,
  WeaveNode,
  WeaveAction,
  WeavePlugin,
  WeaveStore,
  WeaveContextMenuPlugin,
  WeaveNodesSnappingPlugin,
} from '@inditextech/weave-sdk';
import {
  type WeaveState,
  type WeaveUser,
  type WeaveFont,
  type WeaveCallbacks,
  type WeaveUndoRedoChange,
  type WeaveStatus,
} from '@inditextech/weave-types';
import { useWeave } from './store';

type WeaveProviderType = {
  containerId: string;
  getUser: () => WeaveUser;
  fonts?: WeaveFont[];
  store: WeaveStore;
  nodes?: WeaveNode[];
  actions?: WeaveAction[];
  plugins?: WeavePlugin[];
  customNodes?: WeaveNode[];
  customActions?: WeaveAction[];
  customPlugins?: WeavePlugin[];
  callbacks?: WeaveCallbacks;
  children: React.ReactNode;
};

export const WeaveProvider = ({
  containerId,
  getUser,
  store,
  nodes = [],
  actions = [],
  plugins = [],
  customPlugins = [],
  fonts = [],
  callbacks = {},
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

  const {
    onInstanceStatus,
    onRoomLoaded,
    onStateChange,
    onUndoManagerStatusChange,
    onActiveActionChange,
    ...restCallbacks
  } = callbacks;

  const onInstanceStatusHandler = React.useCallback(
    (status: WeaveStatus) => {
      setStatus(status);
      onInstanceStatus?.(status);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onRoomLoadedHandler = React.useCallback(
    (status: boolean) => {
      setRoomLoaded(status);
      onRoomLoaded?.(status);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onStateChangeHandler = React.useCallback(
    (state: WeaveState) => {
      setAppState(state);
      onStateChange?.(state);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedNodes]
  );

  const onUndoManagerStatusChangeHandler = React.useCallback(
    (undoManagerStatus: WeaveUndoRedoChange) => {
      const { canUndo, canRedo } = undoManagerStatus;
      setCanUndo(canUndo);
      setCanRedo(canRedo);
      onUndoManagerStatusChange?.(undoManagerStatus);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onActiveActionChangeHandler = React.useCallback(
    (actionName: string | undefined) => {
      setActualAction(actionName);
      onActiveActionChange?.(status);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedNodes]
  );

  React.useEffect(() => {
    async function initWeave() {
      const weaveEle = document.getElementById(containerId);
      const weaveEleClientRect = weaveEle?.getBoundingClientRect();

      if (weaveEle && !weaveInstanceRef.current) {
        // Defining instance nodes
        const instanceNodes: WeaveNode[] = [];
        if (nodes.length > 0) {
          for (const node of nodes) {
            instanceNodes.push(node);
          }
        }

        // Defining instance plugins
        const instanceActions: WeaveAction[] = [];
        if (actions.length > 0) {
          for (const action of actions) {
            instanceActions.push(action);
          }
        }

        // Defining instance plugins
        const instancePlugins: WeavePlugin[] = [];
        if (plugins.length > 0) {
          for (const plugin of plugins) {
            instancePlugins.push(plugin);
          }
        } else {
          instancePlugins.push(new WeaveStageGridPlugin());
          instancePlugins.push(new WeaveStagePanningPlugin());
          instancePlugins.push(new WeaveStageResizePlugin());
          instancePlugins.push(new WeaveStageZoomPlugin());
          instancePlugins.push(new WeaveNodesSelectionPlugin());
          instancePlugins.push(new WeaveNodesSnappingPlugin());
          instancePlugins.push(new WeaveStageDropAreaPlugin());
          instancePlugins.push(new WeaveCopyPasteNodesPlugin());
          instancePlugins.push(
            new WeaveConnectedUsersPlugin({
              config: {
                getUser,
              },
            })
          );
          instancePlugins.push(
            new WeaveUsersPointersPlugin({
              config: {
                getUser,
              },
            })
          );
          instancePlugins.push(
            new WeaveContextMenuPlugin({
              config: {
                xOffset: 10,
                yOffset: 10,
              },
            })
          );
        }

        weaveInstanceRef.current = new Weave(
          {
            store,
            nodes,
            actions,
            plugins: [...instancePlugins, ...customPlugins],
            fonts,
            callbacks: {
              ...restCallbacks,
              onInstanceStatus: onInstanceStatusHandler,
              onRoomLoaded: onRoomLoadedHandler,
              onStateChange: onStateChangeHandler,
              onUndoManagerStatusChange: onUndoManagerStatusChangeHandler,
              onActiveActionChange: onActiveActionChangeHandler,
            },
            logger: {
              level: 'info',
            },
          },
          {
            container: containerId,
            width: weaveEleClientRect?.width ?? 1920,
            height: weaveEleClientRect?.height ?? 1080,
          }
        );

        setInstance(weaveInstanceRef.current);
        weaveInstanceRef.current.start();
      }
    }

    initWeave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
};
