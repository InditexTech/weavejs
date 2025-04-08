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
  WeaveStageZoomChanged,
  WeaveConnectedUsersPlugin,
  WeaveConnectedUsersChanged,
  WeaveUsersPointersPlugin,
  WeaveStageDropAreaPlugin,
  WeaveCopyPasteNodesPlugin,
  WeaveNode,
  WeaveAction,
  WeavePlugin,
  WeaveStore,
} from '@inditextech/weavejs-sdk';
import {
  WeaveState,
  WeaveSelection,
  WeaveUser,
  WeaveFont,
  WeaveCallbacks,
  WeaveUndoRedoChange,
  WeaveStatus,
} from '@inditextech/weavejs-types';
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
}: Readonly<WeaveProviderType>) => {
  const selectedNodes = useWeave((state) => state.selection.nodes);

  const setInstance = useWeave((state) => state.setInstance);
  const setAppState = useWeave((state) => state.setAppState);
  const setStatus = useWeave((state) => state.setStatus);
  const setRoomLoaded = useWeave((state) => state.setRoomLoaded);
  const setUsers = useWeave((state) => state.setUsers);
  const setCanUndo = useWeave((state) => state.setCanUndo);
  const setCanRedo = useWeave((state) => state.setCanRedo);
  const setZoom = useWeave((state) => state.setZoom);
  const setCanZoomIn = useWeave((state) => state.setCanZoomIn);
  const setCanZoomOut = useWeave((state) => state.setCanZoomOut);
  const setSelectedNodes = useWeave((state) => state.setSelectedNodes);
  const setNode = useWeave((state) => state.setNode);
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

  const onNodesChange = React.useCallback((nodes: WeaveSelection[]) => {
    if (nodes.length === 1) {
      setNode(nodes[0].node);
    }
    if (nodes.length !== 1) {
      setNode(undefined);
    }

    setSelectedNodes(nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    let weaveInstance: Weave | null = null;

    async function initWeave() {
      const weaveEle = document.getElementById(containerId);
      const weaveEleClientRect = weaveEle?.getBoundingClientRect();

      if (weaveEle) {
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
          instancePlugins.push(new WeaveStageGridPlugin({ gridSize: 50 }));
          instancePlugins.push(new WeaveStagePanningPlugin());
          instancePlugins.push(new WeaveStageResizePlugin());
          instancePlugins.push(
            new WeaveStageZoomPlugin({
              onZoomChange: (zoomInfo: WeaveStageZoomChanged) => {
                setZoom(zoomInfo.scale);
                setCanZoomIn(zoomInfo.canZoomIn);
                setCanZoomOut(zoomInfo.canZoomOut);
              },
            })
          );
          instancePlugins.push(
            new WeaveNodesSelectionPlugin({
              onNodesChange,
            })
          );
          instancePlugins.push(new WeaveStageDropAreaPlugin({}));
          instancePlugins.push(
            new WeaveConnectedUsersPlugin({
              onConnectedUsersChanged: (users: WeaveConnectedUsersChanged) => {
                setUsers(users);
              },
              getUser,
            })
          );
          instancePlugins.push(
            new WeaveUsersPointersPlugin({
              getUser,
            })
          );
          instancePlugins.push(new WeaveCopyPasteNodesPlugin({}));
        }

        weaveInstance = new Weave(
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

        setInstance(weaveInstance);

        await weaveInstance.start();
      }
    }

    initWeave();

    return () => {
      if (weaveInstance) {
        weaveInstance.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
};
