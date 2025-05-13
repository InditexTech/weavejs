'use client';

import React from 'react';
import { useWeave } from '@inditextech/weave-react';
import { useCollaborationRoom } from '@/store/store';
import { PositionProperties } from './../node-properties/position-properties';
import { SizeProperties } from './../node-properties/size-properties';
import { AppearanceProperties } from './../node-properties/appearance-properties';
import { FillProperties } from './../node-properties/fill-properties';
import { StrokeProperties } from './../node-properties/stroke-properties';
import { TextProperties } from './../node-properties/text-properties';
import { ImageProperties } from '../node-properties/image-properties';
import { ColorTokenProperties } from '../node-properties/color-token-properties';
import { FrameProperties } from '../node-properties/frame-properties';
import { CropProperties } from '../node-properties/crop-properties';
import { SIDEBAR_ELEMENTS } from '@/lib/constants';
import { X } from 'lucide-react';

export const NodeProperties = () => {
  const instance = useWeave((state) => state.instance);
  const actualAction = useWeave((state) => state.actions.actual);
  const node = useWeave((state) => state.selection.node);

  const sidebarRightActive = useCollaborationRoom(
    (state) => state.sidebar.right.active
  );
  const setSidebarActive = useCollaborationRoom(
    (state) => state.setSidebarActive
  );
  const setNodePropertiesAction = useCollaborationRoom(
    (state) => state.setNodePropertiesAction
  );

  const nodePropertiesAction = useCollaborationRoom(
    (state) => state.nodeProperties.action
  );

  React.useEffect(() => {
    if (!instance) return;

    if (
      actualAction &&
      [
        'rectangleTool',
        'brushTool',
        'penTool',
        'imageTool',
        'colorTokenTool',
        'frameTool',
      ].includes(actualAction)
    ) {
      setNodePropertiesAction('create');
      setSidebarActive(SIDEBAR_ELEMENTS.nodeProperties, 'right');
    }

    if (!actualAction) {
      setNodePropertiesAction(undefined);
      setSidebarActive(null, 'right');
    }

    if (node) {
      setNodePropertiesAction('update');
    }
  }, [actualAction, node, setSidebarActive, setNodePropertiesAction]);

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
      case 'color-token':
        return 'Color Token';
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
        return 'Color Token';
      case 'frameTool':
        return 'Frame';
      default:
        return 'Unknown';
    }
  }, [actualAction]);

  React.useEffect(() => {
    if (nodePropertiesAction === 'create' && actionType) {
      setSidebarActive(SIDEBAR_ELEMENTS.nodeProperties, 'right');
      return;
    }
    if (node && nodePropertiesAction === 'update' && nodeType) {
      setSidebarActive(SIDEBAR_ELEMENTS.nodeProperties, 'right');
      return;
    }
    setSidebarActive(null, 'right');
  }, [
    actionType,
    nodeType,
    nodePropertiesAction,
    node,
    sidebarRightActive,
    setSidebarActive,
  ]);

  const title = React.useMemo(() => {
    if (nodePropertiesAction === 'create') {
      return actionType;
    }
    return nodeType;
  }, [nodeType, actionType, nodePropertiesAction]);

  if (sidebarRightActive !== 'nodeProperties') {
    return null;
  }

  return (
    <div className="w-full justify-center items-center">
      <div className="w-full font-title-xs p-1 bg-white flex justify-between items-center">
        <div className="flex justify-between  h-7 font-questrial font-light items-center text-md pl-2">
          {title}
        </div>
        <div className="flex justify-end items-center gap-1">
          <button
            className="cursor-pointer bg-transparent hover:bg-accent p-2"
            onClick={() => {
              if (instance) {
                instance.selectNodesByKey([]);
              }
              setSidebarActive(null, 'right');
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 border-t border-zinc-200">
        <ImageProperties />
        <ColorTokenProperties />
        <FrameProperties />
        <PositionProperties />
        <SizeProperties />
        <AppearanceProperties />
        <FillProperties />
        <StrokeProperties />
        <TextProperties />
        <CropProperties />
      </div>
    </div>
  );
};
