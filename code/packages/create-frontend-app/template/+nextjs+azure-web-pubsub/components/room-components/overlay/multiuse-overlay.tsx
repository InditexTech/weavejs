'use client';

import React from 'react';
import { useWeave } from '@inditextech/weave-react';
import { NodeProperties } from './node-properties';
import { useCollaborationRoom } from '@/store/store';
import { AnimatePresence } from 'framer-motion';
import OverlayAnimationWrapper from './overlay-animation-wrapper';

export function MultiuseOverlay() {
  const instance = useWeave((state) => state.instance);
  const selectedNodes = useWeave((state) => state.selection.nodes);
  const actualAction = useWeave((state) => state.actions.actual);
  const isActionActive = useWeave((state) => state.actions.active);
  const node = useWeave((state) => state.selection.node);

  const nodePropertiesVisible = useCollaborationRoom(
    (state) => state.nodeProperties.visible
  );
  const contextMenuVisible = useCollaborationRoom(
    (state) => state.contextMenu.show
  );
  const setNodePropertiesAction = useCollaborationRoom(
    (state) => state.setNodePropertiesAction
  );
  const setNodePropertiesVisible = useCollaborationRoom(
    (state) => state.setNodePropertiesVisible
  );

  React.useEffect(() => {
    if (
      isActionActive &&
      actualAction &&
      ['selectionTool'].includes(actualAction) &&
      selectedNodes.length !== 1 &&
      !contextMenuVisible
    ) {
      setNodePropertiesAction(undefined);
      setNodePropertiesVisible(false);
    }
    if (
      isActionActive &&
      actualAction &&
      ['selectionTool'].includes(actualAction) &&
      selectedNodes.length === 1 &&
      !contextMenuVisible
    ) {
      setNodePropertiesAction('update');
      setNodePropertiesVisible(true);
    }
    if (
      isActionActive &&
      actualAction &&
      [
        'rectangleTool',
        'brushTool',
        'penTool',
        'imageTool',
        'colorTokenTool',
        'frameTool',
      ].includes(actualAction) &&
      !contextMenuVisible
    ) {
      setNodePropertiesAction('create');
      setNodePropertiesVisible(true);
    }

    if (!actualAction && selectedNodes.length !== 1) {
      setNodePropertiesVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextMenuVisible, actualAction, selectedNodes]);

  const nodeType = React.useMemo(() => {
    switch (node?.type) {
      case 'group':
        return 'Group';
      case 'rectangle':
        return 'Rectangle';
      case 'line':
        return 'Vector path';
      case 'text':
        return 'Text';
      case 'image':
        return 'Image';
      case 'colorToken':
        return 'Color token';
      case 'frame':
        return 'Frame';
      default:
        return 'Unknown';
    }
  }, [node]);

  const actionType = React.useMemo(() => {
    switch (actualAction) {
      case 'rectangleTool':
        return 'Rectangle';
      case 'brushTool':
        return 'Vector path';
      case 'penTool':
        return 'Vector path';
      case 'imageTool':
        return 'Image';
      case 'colorTokenTool':
        return 'Color token';
      case 'frameTool':
        return 'Frame';
      default:
        return 'Unknown';
    }
  }, [actualAction]);

  if (!instance || !nodePropertiesVisible) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <OverlayAnimationWrapper
        panelId={`nodeProperties-${nodeType}-${actionType}`}
      >
        <NodeProperties />
      </OverlayAnimationWrapper>
    </AnimatePresence>
  );
}
