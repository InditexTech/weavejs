'use client';

import React from 'react';
import { useWeave } from '@inditextech/weavejs-react';
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

export const NodeProperties = () => {
  const actualAction = useWeave((state) => state.actions.actual);
  const node = useWeave((state) => state.selection.node);

  const nodePropertiesAction = useCollaborationRoom(
    (state) => state.nodeProperties.action
  );
  const nodePropertiesVisible = useCollaborationRoom(
    (state) => state.nodeProperties.visible
  );

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

  const title = React.useMemo(() => {
    if (nodePropertiesAction === 'create') {
      return actionType;
    }
    return nodeType;
  }, [nodeType, actionType, nodePropertiesAction]);

  if (!nodePropertiesVisible) {
    return null;
  }

  return (
    <div className="w-full justify-center items-center">
      <div className="w-full p-3 border-b">
        <h2 className="text-md font-noto-sans-mono font-light">{title}</h2>
      </div>
      <div className="flex-1">
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
