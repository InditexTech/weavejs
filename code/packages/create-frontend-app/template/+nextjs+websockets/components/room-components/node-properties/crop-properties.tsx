'use client';

import React from 'react';
import { WeaveStateElement } from '@inditextech/weave-types';
import { Crop } from 'lucide-react';
import { useWeave } from '@inditextech/weave-react';
import { useCollaborationRoom } from '@/store/store';
import { ToggleIconButton } from '../toggle-icon-button';
import { InputNumber } from '../inputs/input-number';

export function CropProperties() {
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

  const updateElement = React.useCallback(
    (updatedNode: WeaveStateElement) => {
      if (!instance) return;
      if (nodePropertiesAction === 'update') {
        instance.updateNode(updatedNode);
        return;
      }
    },
    [instance, nodePropertiesAction]
  );

  if (!instance || !actualNode) return null;

  if (!['image'].includes(actualNode.type)) {
    return null;
  }

  return (
    <div className="border-b border-[#c9c9c9] p-[24px] flex flex-col gap-[16px]">
      <div className="w-full flex justify-between items-center gap-3">
        <div className="cursor-pointer hover:no-underline items-center py-0">
          <span className="text-[13px] font-inter font-light uppercase">
            Crop
          </span>
        </div>
        <div className="flex justify-end items-center">
          <ToggleIconButton
            kind="switch"
            icon={<Crop size={16} strokeWidth={1} />}
            pressed={typeof actualNode.props.cropX !== 'undefined'}
            onClick={() => {
              const updatedNode: WeaveStateElement = {
                ...actualNode,
                props: {
                  ...actualNode.props,
                  ...(typeof actualNode.props.cropX !== 'undefined'
                    ? {
                        width: actualNode.props.imageInfo.width,
                        height: actualNode.props.imageInfo.height,
                        cropX: null,
                        cropY: null,
                        cropWidth: null,
                        cropHeight: null,
                      }
                    : {
                        width: actualNode.props.imageInfo.width,
                        height: actualNode.props.imageInfo.height,
                        cropX: 0,
                        cropY: 0,
                        cropWidth: actualNode.props.imageInfo.width,
                        cropHeight: actualNode.props.imageInfo.height,
                      }),
                },
              };
              updateElement(updatedNode);
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        <InputNumber
          label="X"
          value={actualNode.props.cropX ?? 0}
          onChange={(value) => {
            const updatedNode: WeaveStateElement = {
              ...actualNode,
              props: {
                ...actualNode.props,
                cropX: value,
              },
            };
            updateElement(updatedNode);
          }}
        />
        <InputNumber
          label="Y"
          value={actualNode.props.cropY ?? 0}
          onChange={(value) => {
            const updatedNode: WeaveStateElement = {
              ...actualNode,
              props: {
                ...actualNode.props,
                cropY: value,
              },
            };
            updateElement(updatedNode);
          }}
        />
        <InputNumber
          label="Width"
          value={actualNode.props.cropWidth ?? actualNode.props.width}
          onChange={(value) => {
            const updatedNode: WeaveStateElement = {
              ...actualNode,
              props: {
                ...actualNode.props,
                cropWidth: value,
                width: value,
              },
            };
            updateElement(updatedNode);
          }}
        />
        <InputNumber
          label="Height"
          value={actualNode.props.cropHeight ?? actualNode.props.height}
          onChange={(value) => {
            const updatedNode: WeaveStateElement = {
              ...actualNode,
              props: {
                ...actualNode.props,
                cropHeight: value,
                height: value,
              },
            };
            updateElement(updatedNode);
          }}
        />
      </div>
    </div>
  );
}
