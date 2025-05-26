'use client';

import React from 'react';
import { WeaveStateElement } from '@inditextech/weave-types';
import { useWeave } from '@inditextech/weave-react';
import { useCollaborationRoom } from '@/store/store';
import { InputNumber } from '../inputs/input-number';

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

  const actualNode = React.useMemo(() => {
    if (actualAction && nodePropertiesAction === 'create') {
      return {
        key: 'creating',
        type: 'undefined',
        props: {
          ...nodeCreateProps,
        },
      };
    }
    if (node && nodePropertiesAction === 'update') {
      return node;
    }
    return undefined;
  }, [actualAction, node, nodePropertiesAction, nodeCreateProps]);

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
    <div className="border-b border-[#c9c9c9] p-[24px] flex flex-col gap-[16px]">
      <div className="w-full flex justify-between items-center gap-3">
        <div className="cursor-pointer hover:no-underline items-center py-0">
          <span className="text-[13px] font-inter font-light uppercase">
            Size
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 w-full">
        <div className="grid grid-cols-3 gap-3 w-full">
          <InputNumber
            label="Width"
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
            label="Height"
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
