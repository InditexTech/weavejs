'use client';

import React from 'react';
import { WeaveStateElement } from '@inditextech/weave-types';
import { useWeave } from '@inditextech/weave-react';
import { useCollaborationRoom } from '@/store/store';
import { InputNumber } from '../inputs/input-number';
import { ToggleIconButton } from '../toggle-icon-button';
import { ArrowLeftFromLine, ArrowRightFromLine } from 'lucide-react';

export function ArrowProperties() {
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
    ['selectionTool'].includes(actualAction) &&
    !['arrow'].includes(actualNode.type)
  ) {
    return null;
  }

  if (actualAction && !['selectionTool', 'arrowTool'].includes(actualAction)) {
    return null;
  }

  return (
    <div className="border-b border-[#c9c9c9] p-[24px] flex flex-col gap-[16px]">
      <div className="w-full flex justify-between items-center gap-3">
        <div className="cursor-pointer hover:no-underline items-center py-0">
          <span className="text-[13px] font-inter font-light uppercase">
            Arrow properties
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 w-full">
        <div className="grid grid-cols-2 gap-3 w-full">
          <InputNumber
            label="Pointer length"
            value={actualNode.props.pointerLength ?? 0.0}
            onChange={(value) => {
              const updatedNode: WeaveStateElement = {
                ...actualNode,
                props: {
                  ...actualNode.props,
                  pointerLength: value,
                },
              };
              updateElement(updatedNode);
            }}
          />
          <InputNumber
            label="Pointer width"
            value={actualNode.props.pointerWidth ?? 0.0}
            onChange={(value) => {
              const updatedNode: WeaveStateElement = {
                ...actualNode,
                props: {
                  ...actualNode.props,
                  pointerWidth: value,
                },
              };
              updateElement(updatedNode);
            }}
          />
          <div className="w-full flex justify-between items-center gap-4 col-span-2">
            <div className="text-[12px] text-[#757575] font-inter font-light text-nowrap">
              Pointer at start
            </div>
            <div className="w-full flex justify-end items-center gap-1">
              <ToggleIconButton
                kind="switch"
                icon={<ArrowLeftFromLine size={20} strokeWidth={1} />}
                pressed={actualNode.props.pointerAtBeginning ?? false}
                onClick={() => {
                  const updatedNode: WeaveStateElement = {
                    ...actualNode,
                    props: {
                      ...actualNode.props,
                      pointerAtBeginning: !(
                        actualNode.props.pointerAtBeginning ?? false
                      ),
                    },
                  };
                  updateElement(updatedNode);
                }}
              />
            </div>
          </div>
          <div className="w-full flex justify-between items-center gap-4 col-span-2">
            <div className="text-[12px] text-[#757575] font-inter font-light text-nowrap">
              Pointer at end
            </div>
            <div className="w-full flex justify-end items-center gap-1">
              <ToggleIconButton
                kind="switch"
                icon={<ArrowRightFromLine size={20} strokeWidth={1} />}
                pressed={actualNode.props.pointerAtEnding ?? true}
                onClick={() => {
                  const updatedNode: WeaveStateElement = {
                    ...actualNode,
                    props: {
                      ...actualNode.props,
                      pointerAtEnding: !(
                        actualNode.props.pointerAtEnding ?? true
                      ),
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
