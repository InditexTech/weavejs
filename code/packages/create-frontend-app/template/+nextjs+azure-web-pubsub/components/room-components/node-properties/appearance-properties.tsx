'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { WeaveStateElement } from '@inditextech/weave-types';
import { InputNumber } from '../inputs/input-number';
import { useWeave } from '@inditextech/weave-react';
import { useCollaborationRoom } from '@/store/store';

export function AppearanceProperties() {
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

  if (!instance || !actualAction || !actualNode) return null;

  if (!actualAction && !actualNode) return null;

  if (['colorTokenTool', 'frameTool'].includes(actualAction)) return null;

  return (
    <div className="border-b border-zinc-200">
      <div className="w-full flex justify-between items-center gap-3 p-4 py-3">
        <div className="cursor-pointer hover:no-underline items-center py-0">
          <span className="text-xs font-noto-sans-mono font-light">
            Appearance
          </span>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 w-full">
          <div
            className={cn({
              ['col-span-1']: ['rectangle'].includes(actualNode.type),
              ['col-span-2']: !['rectangle'].includes(actualNode.type),
            })}
          >
            <InputNumber
              label="Opacity (%)"
              max={100}
              min={0}
              value={(actualNode.props.opacity ?? 1) * 100}
              onChange={(value) => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    opacity: value / 100,
                  },
                };
                updateElement(updatedNode);
              }}
            />
          </div>
          {['rectangle'].includes(actualNode.type) && (
            <InputNumber
              label="Corner Radius (px)"
              value={actualNode.props.cornerRadius ?? 0}
              onChange={(value) => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    cornerRadius: value,
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
