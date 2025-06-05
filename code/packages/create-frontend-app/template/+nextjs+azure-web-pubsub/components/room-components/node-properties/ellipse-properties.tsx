'use client';

import React from 'react';
import { WeaveStateElement } from '@inditextech/weave-types';
import { useWeave } from '@inditextech/weave-react';
import { useCollaborationRoom } from '@/store/store';
import { InputNumber } from '../inputs/input-number';
import { ToggleIconButton } from '../toggle-icon-button';
import { Scaling } from 'lucide-react';

export function EllipseProperties() {
  const instance = useWeave((state) => state.instance);
  const node = useWeave((state) => state.selection.node);
  const actualAction = useWeave((state) => state.actions.actual);

  const nodePropertiesAction = useCollaborationRoom(
    (state) => state.nodeProperties.action
  );

  const nodeCreateProps = useCollaborationRoom(
    (state) => state.nodeProperties.createProps
  );

  const [maintainAspectRatio, setMaintainAspectRatio] = React.useState(false);

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

  React.useEffect(() => {
    if (actualNode && typeof actualNode.props.keepAspectRatio !== 'undefined') {
      setMaintainAspectRatio(actualNode.props.keepAspectRatio);
    }
  }, [actualNode]);

  if (!instance || !actualNode || !nodePropertiesAction) {
    return null;
  }

  if (!actualAction && !actualNode) return null;

  if (
    actualAction &&
    ['selectionTool'].includes(actualAction) &&
    !['ellipse'].includes(actualNode.type)
  ) {
    return null;
  }

  if (
    actualAction &&
    !['selectionTool', 'ellipseTool'].includes(actualAction)
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
        <div className="grid grid-cols-2 gap-3 w-full">
          <InputNumber
            label="Radius X"
            value={actualNode.props.radiusX ?? 0.0}
            onChange={(value) => {
              let newRadiusX = value;
              let newRadiusY = actualNode.props.radiusY;
              if (maintainAspectRatio) {
                const ratio =
                  actualNode.props.radiusX / actualNode.props.radiusY;

                newRadiusX = value;
                newRadiusY = value / ratio;
              }

              const updatedNode: WeaveStateElement = {
                ...actualNode,
                props: {
                  ...actualNode.props,
                  radiusX: newRadiusX,
                  radiusY: newRadiusY,
                  keepAspectRatio: maintainAspectRatio,
                },
              };
              updateElement(updatedNode);
            }}
          />
          <InputNumber
            label="Radius Y"
            value={actualNode.props.radiusY ?? 0.0}
            onChange={(value) => {
              let newRadiusX = actualNode.props.radiusX;
              let newRadiusY = value;
              if (maintainAspectRatio) {
                const ratio =
                  actualNode.props.radiusX / actualNode.props.radiusY;

                newRadiusX = value;
                newRadiusY = value / ratio;
              }

              const updatedNode: WeaveStateElement = {
                ...actualNode,
                props: {
                  ...actualNode.props,
                  radiusX: newRadiusX,
                  radiusY: newRadiusY,
                  keepAspectRatio: maintainAspectRatio,
                },
              };
              updateElement(updatedNode);
            }}
          />

          <div className="w-full flex justify-between items-center gap-4 col-span-2">
            <div className="text-[12px] text-[#757575] font-inter font-light text-nowrap">
              Maintain aspect ratio
            </div>
            <div className="w-full flex justify-end items-center gap-1">
              <ToggleIconButton
                kind="switch"
                icon={<Scaling size={20} strokeWidth={1} />}
                pressed={maintainAspectRatio}
                onClick={() => {
                  setMaintainAspectRatio((prev) => !prev);

                  const updatedNode: WeaveStateElement = {
                    ...actualNode,
                    props: {
                      ...actualNode.props,
                      keepAspectRatio: !maintainAspectRatio,
                    },
                  };
                  updateElement(updatedNode);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
