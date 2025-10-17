// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { useWeave } from '@/components/store';
import type {
  WeaveConnectedUsers,
  WeaveConnectedUsersChangeEvent,
  WeaveNodesSelectionPluginOnNodesChangeEvent,
  WeaveNodesSelectionPluginOnSelectionStateEvent,
  WeaveStageZoomChanged,
  WeaveStageZoomPluginOnZoomChangeEvent,
} from '@inditextech/weave-sdk/client';
import type { WeaveSelection } from '@inditextech/weave-types';
import React from 'react';

export const useWeaveEvents = (): void => {
  const instance = useWeave((state) => state.instance);
  const node = useWeave((state) => state.selection.node);
  const setZoom = useWeave((state) => state.setZoom);
  const setCanZoomIn = useWeave((state) => state.setCanZoomIn);
  const setCanZoomOut = useWeave((state) => state.setCanZoomOut);
  const setSelectionActive = useWeave((state) => state.setSelectionActive);
  const setSelectedNodes = useWeave((state) => state.setSelectedNodes);
  const setNode = useWeave((state) => state.setNode);
  const setUsers = useWeave((state) => state.setUsers);

  const onSelectionStateHandler = React.useCallback((active: boolean) => {
    setSelectionActive(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onZoomChangeHandler = React.useCallback(
    (zoomInfo: WeaveStageZoomChanged) => {
      setZoom(zoomInfo.scale);
      setCanZoomIn(zoomInfo.canZoomIn);
      setCanZoomOut(zoomInfo.canZoomOut);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onNodesChangeHandler = React.useCallback(
    (nodes: WeaveSelection[]) => {
      if (nodes.length === 1 && node?.key !== nodes[0].node?.key) {
        setNode(nodes[0].node);
      }
      if (nodes.length === 0) {
        setNode(undefined);
      }
      setSelectedNodes(nodes);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [node]
  );

  const onConnectedUsersChangedHandler = React.useCallback(
    (users: WeaveConnectedUsers) => {
      setUsers(users);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );

  React.useEffect(() => {
    if (!instance) return;

    instance.addEventListener<WeaveNodesSelectionPluginOnSelectionStateEvent>(
      'onSelectionState',
      onSelectionStateHandler
    );
    instance.addEventListener<WeaveStageZoomPluginOnZoomChangeEvent>(
      'onZoomChange',
      onZoomChangeHandler
    );
    instance.addEventListener<WeaveNodesSelectionPluginOnNodesChangeEvent>(
      'onNodesChange',
      onNodesChangeHandler
    );
    instance.addEventListener<WeaveConnectedUsersChangeEvent>(
      'onConnectedUsersChange',
      onConnectedUsersChangedHandler
    );

    return () => {
      instance.removeEventListener<WeaveNodesSelectionPluginOnSelectionStateEvent>(
        'onSelectionState',
        onSelectionStateHandler
      );
      instance.removeEventListener<WeaveStageZoomPluginOnZoomChangeEvent>(
        'onZoomChange',
        onZoomChangeHandler
      );
      instance.removeEventListener<WeaveNodesSelectionPluginOnNodesChangeEvent>(
        'onNodesChange',
        onNodesChangeHandler
      );
      instance.removeEventListener<WeaveConnectedUsersChangeEvent>(
        'onConnectedUsersChange',
        onConnectedUsersChangedHandler
      );
    };
  }, [instance]);
};
