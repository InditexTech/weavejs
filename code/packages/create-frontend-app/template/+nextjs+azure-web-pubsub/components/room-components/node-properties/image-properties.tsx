'use client';

import React from 'react';
import { WeaveStateElement } from '@inditextech/weave-types';
import { useWeave } from '@inditextech/weave-react';
import { useCollaborationRoom } from '@/store/store';
import { InputNumber } from '../inputs/input-number';

export function ImageProperties() {
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
    if (node && nodePropertiesAction === 'update') {
      setActualNode(node);
    }
  }, [instance, actualAction, node, nodePropertiesAction, nodeCreateProps]);

  if (!instance || !actualNode) return null;

  if (!['image'].includes(actualNode.type)) {
    return null;
  }

  return (
    <div className="border-b border-zinc-200">
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3 w-full">
          <InputNumber
            label="Width (px)"
            value={actualNode.props.imageInfo.width}
            disabled={true}
          />
          <InputNumber
            label="Height (px)"
            value={actualNode.props.imageInfo.height}
            disabled={true}
          />
        </div>
      </div>
    </div>
  );
}
