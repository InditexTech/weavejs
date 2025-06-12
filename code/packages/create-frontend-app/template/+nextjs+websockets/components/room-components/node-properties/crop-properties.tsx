'use client';

import React from 'react';
import { WeaveStateElement } from '@inditextech/weave-types';
import { Check, X, Crop, RotateCcw } from 'lucide-react';
import { useWeave } from '@inditextech/weave-react';
import { useCollaborationRoom } from '@/store/store';
import { InputNumber } from '../inputs/input-number';
import Konva from 'konva';
import { ToggleIconButton } from '../toggle-icon-button';
import { WeaveImageOnCropStartEvent } from '@inditextech/weave-sdk';

export function CropProperties() {
  const instance = useWeave((state) => state.instance);
  const node = useWeave((state) => state.selection.node);

  const [isCropping, setIsCropping] = React.useState(false);

  const nodePropertiesAction = useCollaborationRoom(
    (state) => state.nodeProperties.action
  );

  const actualNode = React.useMemo(() => {
    if (node && nodePropertiesAction === 'update') {
      return node;
    }
    return undefined;
  }, [node, nodePropertiesAction]);

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

  const actualNodeInstance: Konva.Node | undefined = React.useMemo(() => {
    if (!instance || !actualNode) return undefined;

    const stage = instance.getStage();
    if (!stage) return undefined;

    const node: Konva.Group | undefined = stage.findOne(
      `#${actualNode.key}`
    ) as Konva.Group | undefined;

    if (!node) return undefined;

    return node;
  }, [actualNode, instance]);

  React.useEffect(() => {
    if (!instance || !actualNodeInstance) return;

    const handleCropStart = ({
      instance: imageInstance,
    }: WeaveImageOnCropStartEvent) => {
      if (imageInstance.getAttrs().id === actualNodeInstance.getAttrs().id) {
        setIsCropping(true);
      }
    };
    const handleCropEnd = ({
      instance: imageInstance,
    }: WeaveImageOnCropStartEvent) => {
      if (imageInstance.getAttrs().id === actualNodeInstance.getAttrs().id) {
        setIsCropping(false);
      }
    };

    instance.addEventListener('onImageCropStart', handleCropStart);
    instance.addEventListener('onImageCropEnd', handleCropEnd);

    return () => {
      instance.removeEventListener('onImageCropStart', handleCropStart);
      instance.removeEventListener('onImageCropEnd', handleCropEnd);
    };
  }, [instance, actualNodeInstance]);

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
        <div className="flex justify-end items-center gap-1">
          {actualNodeInstance && isCropping && (
            <>
              <button
                className="flex items-center justify-center cursor-pointer p-1 hover:bg-[#f0f0f0]"
                onClick={(e) => {
                  e.stopPropagation();
                  actualNodeInstance.closeCrop('accept');
                }}
              >
                <Check size={20} strokeWidth={1} />
              </button>
              <button
                className="flex items-center justify-center cursor-pointer p-1 hover:bg-[#f0f0f0]"
                onClick={(e) => {
                  e.stopPropagation();
                  actualNodeInstance.closeCrop('cancel');
                }}
              >
                <X size={20} strokeWidth={1} />
              </button>
            </>
          )}
          {actualNodeInstance && !isCropping && (
            <>
              <button
                className="flex items-center justify-center cursor-pointer p-1 hover:bg-[#f0f0f0]"
                onClick={(e) => {
                  e.stopPropagation();
                  actualNodeInstance.triggerCrop();
                }}
              >
                <Crop size={20} strokeWidth={1} />
              </button>
              <ToggleIconButton
                kind="toggle"
                icon={<RotateCcw size={20} strokeWidth={1} />}
                pressedIcon={<RotateCcw size={20} strokeWidth={1} />}
                pressed={actualNode.props.strokeEnabled ?? true}
                onClick={(e) => {
                  e.stopPropagation();
                  const stage = instance.getStage();
                  if (!stage) return;

                  const node = stage.findOne(`#${actualNode.key}`) as
                    | Konva.Node
                    | undefined;

                  if (!node) return;

                  node.resetCrop();
                }}
              />
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        <InputNumber
          label="X"
          value={actualNode.props.cropX ?? 0}
          disabled
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
          disabled
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
          disabled
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
          disabled
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
