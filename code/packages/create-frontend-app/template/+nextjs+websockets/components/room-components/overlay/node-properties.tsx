'use client';

import React from 'react';
import { useWeave } from '@inditextech/weave-react';
import { useCollaborationRoom } from '@/store/store';
import { PositionProperties } from '../node-properties/position-properties';
import { SizeProperties } from '../node-properties/size-properties';
import { AppearanceProperties } from '../node-properties/appearance-properties';
import { FillProperties } from '../node-properties/fill-properties';
import { StrokeProperties } from '../node-properties/stroke-properties';
import { TextProperties } from '../node-properties/text-properties';
import { ImageProperties } from '../node-properties/image-properties';
import { ColorTokenProperties } from '../node-properties/color-token-properties';
import { FrameProperties } from '../node-properties/frame-properties';
import { CropProperties } from '../node-properties/crop-properties';
import { SIDEBAR_ELEMENTS } from '@/lib/constants';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WeaveSelection } from '@inditextech/weave-types';
import { MetaProperties } from '../node-properties/meta-properties';
import { EllipseProperties } from '../node-properties/ellipse-properties';
import { StarProperties } from '../node-properties/star-properties';
import { ArrowProperties } from '../node-properties/arrow-properties';
import { RegularPolygonProperties } from '../node-properties/regular-polygon-properties';

export const NodeProperties = () => {
  const instance = useWeave((state) => state.instance);
  const actualAction = useWeave((state) => state.actions.actual);
  const node = useWeave((state) => state.selection.node);
  const setNode = useWeave((state) => state.setNode);

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
    if (
      actualAction &&
      [
        'rectangleTool',
        'ellipseTool',
        'regularPolygonTool',
        'brushTool',
        'penTool',
        'imageTool',
        'starTool',
        'arrowTool',
        'colorTokenTool',
        'frameTool',
      ].includes(actualAction)
    ) {
      setNodePropertiesAction('create');
      setSidebarActive(SIDEBAR_ELEMENTS.nodeProperties, 'right');
    }

    if (!actualAction && !node) {
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
      case 'ellipse':
        return 'Ellipse';
      case 'regular-polygon':
        return 'Regular Polygon';
      case 'line':
        return 'Vector path';
      case 'text':
        return 'Text';
      case 'image':
        return 'Image';
      case 'star':
        return 'Star';
      case 'arrow':
        return 'Arrow';
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
      case 'ellipseTool':
        return 'Ellipse';
      case 'regularPolygonTool':
        return 'RegularPolygon';
      case 'brushTool':
        return 'Vector path';
      case 'penTool':
        return 'Vector path';
      case 'imageTool':
        return 'Image';
      case 'starTool':
        return 'Star';
      case 'arrowTool':
        return 'Arrow';
      case 'colorTokenTool':
        return 'Color Token';
      case 'frameTool':
        return 'Frame';
      default:
        return 'Unknown';
    }
  }, [actualAction]);

  React.useEffect(() => {
    if (
      nodePropertiesAction === 'create' &&
      actualAction === 'selectionTool' &&
      actionType === 'Unknown' &&
      nodeType === 'Unknown'
    ) {
      setSidebarActive(null, 'right');
      return;
    }
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
    actualAction,
    actionType,
    nodeType,
    nodePropertiesAction,
    node,
    sidebarRightActive,
    setSidebarActive,
  ]);

  React.useEffect(() => {
    if (!instance) return;

    function handleOnNodeChange({ node }: WeaveSelection) {
      setNode(node);
    }

    instance.addEventListener('onNodeChange', handleOnNodeChange);

    return () => {
      instance.removeEventListener('onNodeChange', handleOnNodeChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, instance]);

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
    <div className="w-full h-full">
      <div className="w-full px-[24px] py-[29px] bg-white flex justify-between items-center border-b border-[#c9c9c9]">
        <div className="flex justify-between font-inter font-light text-[24px] items-center text-md pl-2 uppercase">
          {title}
        </div>
        <div className="flex justify-end items-center gap-1">
          <button
            className="cursor-pointer bg-transparent hover:bg-accent p-[2px]"
            onClick={() => {
              if (!instance) return;
              if (
                actualAction &&
                [
                  'rectangleTool',
                  'ellipseTool',
                  'regularPolygonTool',
                  'brushTool',
                  'penTool',
                  'imageTool',
                  'starTool',
                  'arrowTool',
                  'colorTokenTool',
                  'frameTool',
                ].includes(actualAction)
              ) {
                instance.cancelAction(actualAction);
              }
              instance.selectNodesByKey([]);
              setNodePropertiesAction(undefined);
              setSidebarActive(null, 'right');
            }}
          >
            <X size={16} strokeWidth={1} />
          </button>
        </div>
      </div>
      <ScrollArea className="w-full h-[calc(100%-95px)]">
        <div className="w-full flex flex-col">
          <MetaProperties />
          <ImageProperties />
          <ColorTokenProperties />
          <FrameProperties />
          <PositionProperties />
          <SizeProperties />
          <EllipseProperties />
          <ArrowProperties />
          <StarProperties />
          <RegularPolygonProperties />
          <AppearanceProperties />
          <FillProperties />
          <StrokeProperties />
          <TextProperties />
          <CropProperties />
        </div>
      </ScrollArea>
    </div>
  );
};
