'use client';

import React from 'react';
import { WeaveStateElement } from '@inditextech/weave-types';
import { InputNumber } from '../inputs/input-number';
import { useWeave } from '@inditextech/weave-react';
import { useCollaborationRoom } from '@/store/store';

export function SizeProperties() {
  const instance = useWeave((state) => state.instance);
  const node = useWeave((state) => state.selection.node);
  const actualAction = useWeave((state) => state.actions.actual);

  const nodePropertiesAction = useCollaborationRoom(
    (state) => state.nodeProperties.action
  );

  const nodeCreateProps = useCollaborationRoom(
    (state) => state.nodeProperties.createProps
  );

  const [actualNode, setActualNode] = React.useState<
    WeaveStateElement | undefined
  >(node);

  React.useEffect(() => {
    if (!instance) return;
    if (actualAction && nodePropertiesAction === 'create') {
      setActualNode({
        key: 'creating',
        type: 'undefined',
        props: {
          ...nodeCreateProps,
        },
      });
    }
    if (node && nodePropertiesAction === 'update') {
      setActualNode(node);
    }
    if (!actualAction && !node) {
      setActualNode(undefined);
    }
  }, [instance, actualAction, node, nodePropertiesAction, nodeCreateProps]);

  const updateElement = React.useCallback(
    (updatedNode: WeaveStateElement) => {
      if (!instance) return;
      if (actualAction && nodePropertiesAction === 'create') {
        instance.updatePropsAction(actualAction, updatedNode.props);
      }
      if (nodePropertiesAction === 'update') {
        instance.updateNode(updatedNode);
      }
    },
    [instance, actualAction, nodePropertiesAction]
  );

  if (!instance || !actualNode || !nodePropertiesAction) {
    return null;
  }

  if (!actualAction && !actualNode) return null;

  if (
    actualAction &&
    !['selectionTool', 'rectangleTool', 'imageTool'].includes(actualAction)
  ) {
    return null;
  }

  return (
    <div className="border-b border-zinc-200">
      <div className="w-full flex justify-between items-center gap-3 p-4 py-3">
        <div className="cursor-pointer hover:no-underline items-center py-0">
          <span className="text-xs font-noto-sans-mono font-light">Size</span>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 gap-3 w-full">
          <div className="w-full flex gap-3">
            <InputNumber
              label="Width (px)"
              value={actualNode.props.width ?? 0}
              onChange={(value) => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    width: value,
                  },
                };
                updateElement(updatedNode);
              }}
            />
            <InputNumber
              label="Height (px)"
              value={actualNode.props.height ?? 0}
              onChange={(value) => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    height: value,
                  },
                };
                updateElement(updatedNode);
              }}
            />
          </div>
          {['update'].includes(nodePropertiesAction) && (
            <InputNumber
              label="Scale (%)"
              value={(actualNode.props.scaleX ?? 1) * 100}
              onChange={(value) => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    scaleX: value / 100,
                    scaleY: value / 100,
                  },
                };
                updateElement(updatedNode);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
