// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { useWeave } from '@/components/store';
import type {
  WeaveConnectedUsers,
  WeaveConnectedUsersChangeEvent,
  WeaveMutexLockChangeEvent,
  WeaveNodesSelectionPluginOnNodesChangeEvent,
  WeaveNodesSelectionPluginOnSelectionStateEvent,
  WeaveStageZoomChanged,
  WeaveStageZoomPluginOnZoomChangeEvent,
  WeaveStoreOnRoomChangedEvent,
  WeaveStoreOnRoomSwitchingEndEvent,
  WeaveStoreOnRoomSwitchingStartEvent,
} from '@inditextech/weave-sdk';
import type { WeaveSelection } from '@inditextech/weave-types';
import React from 'react';

export const useWeaveEvents = (): void => {
  const instance = useWeave((state) => state.instance);
  const node = useWeave((state) => state.selection.node);
  const setRoomId = useWeave((state) => state.setRoomId);
  const setRoomSwitching = useWeave((state) => state.setRoomSwitching);
  const setZoom = useWeave((state) => state.setZoom);
  const setCanZoomIn = useWeave((state) => state.setCanZoomIn);
  const setCanZoomOut = useWeave((state) => state.setCanZoomOut);
  const setSelectionActive = useWeave((state) => state.setSelectionActive);
  const setSelectedNodes = useWeave((state) => state.setSelectedNodes);
  const setNode = useWeave((state) => state.setNode);
  const setUsers = useWeave((state) => state.setUsers);
  const setUsersLocks = useWeave((state) => state.setUsersLocks);

  const onStoreRoomChangedHandler = React.useCallback(
    ({ room }: WeaveStoreOnRoomChangedEvent) => {
      setRoomId(room);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onRoomSwitchingStartHandler = React.useCallback(
    ({ room }: WeaveStoreOnRoomSwitchingStartEvent) => {
      console.log('Room switching started to room:', room);
      setRoomSwitching(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onRoomSwitchingEndHandler = React.useCallback(
    ({ room }: WeaveStoreOnRoomSwitchingEndEvent) => {
      console.log('Room switching ended to room:', room);
      setRoomSwitching(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

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
      if (nodes.length > 1) {
        setNode(undefined);
      }
      setSelectedNodes(nodes);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node]
  );

  const onConnectedUsersChangedHandler = React.useCallback(
    (users: WeaveConnectedUsers) => {
      setUsers(users);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onMutexLockChangeHandler = React.useCallback(
    ({ locks }: { locks: string[] }) => {
      if (!instance) return;

      const actUsersLocks: Record<string, unknown> = {};
      for (const lockKey of locks) {
        const mutexInfo = instance?.getLockDetails(lockKey);
        if (mutexInfo) {
          actUsersLocks[lockKey] = mutexInfo;
        }
      }
      setUsersLocks(actUsersLocks);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [instance]
  );

  React.useEffect(() => {
    if (!instance) return;

    instance.addEventListener<WeaveStoreOnRoomChangedEvent>(
      'onStoreRoomChanged',
      onStoreRoomChangedHandler
    );
    instance.addEventListener<WeaveStoreOnRoomSwitchingStartEvent>(
      'onRoomSwitchingStart',
      onRoomSwitchingStartHandler
    );
    instance.addEventListener<WeaveStoreOnRoomSwitchingEndEvent>(
      'onRoomSwitchingEnd',
      onRoomSwitchingEndHandler
    );
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
    instance.addEventListener<WeaveMutexLockChangeEvent>(
      'onMutexLockChange',
      onMutexLockChangeHandler
    );

    return () => {
      instance.removeEventListener<WeaveStoreOnRoomChangedEvent>(
        'onStoreRoomChanged',
        onStoreRoomChangedHandler
      );
      instance.removeEventListener<WeaveStoreOnRoomSwitchingStartEvent>(
        'onRoomSwitchingStart',
        onRoomSwitchingStartHandler
      );
      instance.removeEventListener<WeaveStoreOnRoomSwitchingEndEvent>(
        'onRoomSwitchingEnd',
        onRoomSwitchingEndHandler
      );
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
      instance.removeEventListener<WeaveConnectedUsersChangeEvent>(
        'onConnectedUsersChange',
        onConnectedUsersChangedHandler
      );
      instance.removeEventListener<WeaveMutexLockChangeEvent>(
        'onMutexLockChange',
        onMutexLockChangeHandler
      );
    };
  }, [instance]);
};
