import { useWeave } from '@/components/store';
import type {
  WeaveConnectedUsers,
  WeaveConnectedUsersChangeEvent,
  WeaveNodesSelectionPluginOnNodesChangeEvent,
  WeaveStageZoomChanged,
  WeaveStageZoomPluginOnZoomChangeEvent,
} from '@inditextech/weave-sdk';
import type { WeaveSelection } from '@inditextech/weave-types';
import React from 'react';

export const useWeaveEvents = (): void => {
  const instance = useWeave((state) => state.instance);
  const setZoom = useWeave((state) => state.setZoom);
  const setCanZoomIn = useWeave((state) => state.setCanZoomIn);
  const setCanZoomOut = useWeave((state) => state.setCanZoomOut);
  const setSelectedNodes = useWeave((state) => state.setSelectedNodes);
  const setNode = useWeave((state) => state.setNode);
  const setUsers = useWeave((state) => state.setUsers);

  const onZoomChangeHandler = React.useCallback(
    (zoomInfo: WeaveStageZoomChanged) => {
      setZoom(zoomInfo.scale);
      setCanZoomIn(zoomInfo.canZoomIn);
      setCanZoomOut(zoomInfo.canZoomOut);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onNodesChangeHandler = React.useCallback((nodes: WeaveSelection[]) => {
    if (nodes.length === 1) {
      setNode(nodes[0].node);
    }
    if (nodes.length !== 1) {
      setNode(undefined);
    }

    setSelectedNodes(nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onConnectedUsersChangedHandler = React.useCallback(
    (users: WeaveConnectedUsers) => {
      setUsers(users);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );

  React.useEffect(() => {
    if (!instance) return;

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
