'use client';

import React from 'react';
import { WeaveStateElement } from '@inditextech/weavejs-types';
import {
  Eye,
  EyeOff,
  Hexagon,
  Slash,
  Spline,
  Tally1,
  Tally2,
  Tally3,
} from 'lucide-react';
import { InputColor } from '../inputs/input-color';
import { InputNumber } from '../inputs/input-number';
import { ToggleIconButton } from '../toggle-icon-button';
import { useWeave } from '@inditextech/weavejs-react';
import { useCollaborationRoom } from '@/store/store';

export function StrokeProperties() {
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

  if (!instance || !actualAction || !actualNode) {
    return null;
  }

  if (!actualAction && !actualNode) return null;

  if (['colorTokenTool', 'frameTool'].includes(actualAction)) return null;

  if (['text', 'colorToken', 'frame'].includes(actualNode.type)) {
    return null;
  }

  return (
    <div className="border-b border-zinc-200">
      <div className="w-full flex justify-between items-center gap-3 p-4 py-3">
        <div className="cursor-pointer hover:no-underline items-center py-0">
          <span className="text-xs font-noto-sans-mono font-light">Stroke</span>
        </div>
        <ToggleIconButton
          kind="toggle"
          icon={<Eye size={12} />}
          pressedIcon={<EyeOff size={12} />}
          pressed={actualNode.props.strokeEnabled ?? true}
          onClick={(e) => {
            e.stopPropagation();
            const updatedNode: WeaveStateElement = {
              ...actualNode,
              props: {
                ...actualNode.props,
                strokeEnabled: !(actualNode.props.strokeEnabled ?? true),
              },
            };
            updateElement(updatedNode);
          }}
        />
      </div>
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 w-full">
          <InputColor
            label="Color (#RGBA)"
            value={`${(actualNode.props.stroke ?? '#000000FF').replace(
              '#',
              ''
            )}`}
            onChange={(value) => {
              const updatedNode: WeaveStateElement = {
                ...actualNode,
                props: {
                  ...actualNode.props,
                  stroke: `#${value}`,
                },
              };
              updateElement(updatedNode);
            }}
          />
          <InputNumber
            label="Width (px)"
            value={actualNode.props.strokeWidth ?? 1}
            onChange={(value) => {
              const updatedNode: WeaveStateElement = {
                ...actualNode,
                props: {
                  ...actualNode.props,
                  strokeWidth: value,
                },
              };
              updateElement(updatedNode);
            }}
          />
          {(['line'].includes(actualNode.type) ||
            ['brushTool', 'penTool'].includes(actualAction)) && (
            <>
              <div className="col-span-2">
                <InputNumber
                  label="Tension"
                  value={actualNode.props.tension ?? 0}
                  onChange={(value) => {
                    const updatedNode: WeaveStateElement = {
                      ...actualNode,
                      props: {
                        ...actualNode.props,
                        tension: value,
                      },
                    };
                    updateElement(updatedNode);
                  }}
                />
              </div>
              <div className="w-full flex justify-between items-center gap-4 col-span-2">
                <div className="text-[11px] text-zinc-600 font-noto-sans-mono font-light text-nowrap">
                  Line join
                </div>
                <div className="w-full flex justify-end items-center gap-1">
                  <ToggleIconButton
                    kind="switch"
                    icon={<Tally1 size={16} />}
                    pressed={(actualNode.props.lineJoin ?? 'miter') === 'miter'}
                    onClick={() => {
                      const updatedNode: WeaveStateElement = {
                        ...actualNode,
                        props: {
                          ...actualNode.props,
                          lineJoin: 'miter',
                        },
                      };
                      updateElement(updatedNode);
                    }}
                  />
                  <ToggleIconButton
                    kind="switch"
                    icon={<Tally2 size={16} />}
                    pressed={(actualNode.props.lineJoin ?? 'miter') === 'round'}
                    onClick={() => {
                      const updatedNode: WeaveStateElement = {
                        ...actualNode,
                        props: {
                          ...actualNode.props,
                          lineJoin: 'round',
                        },
                      };
                      updateElement(updatedNode);
                    }}
                  />
                  <ToggleIconButton
                    kind="switch"
                    icon={<Tally3 size={16} />}
                    pressed={(actualNode.props.lineJoin ?? 'miter') === 'bevel'}
                    onClick={() => {
                      const updatedNode: WeaveStateElement = {
                        ...actualNode,
                        props: {
                          ...actualNode.props,
                          lineJoin: 'bevel',
                        },
                      };
                      updateElement(updatedNode);
                    }}
                  />
                </div>
              </div>
              <div className="w-full flex justify-between items-center gap-4 col-span-2">
                <div className="text-[11px] text-zinc-600 font-noto-sans-mono font-light text-nowrap">
                  Line cap
                </div>
                <div className="w-full flex justify-end items-center gap-1">
                  <ToggleIconButton
                    kind="switch"
                    icon={<Tally1 size={16} />}
                    pressed={(actualNode.props.lineCap ?? 'butt') === 'butt'}
                    onClick={() => {
                      const updatedNode: WeaveStateElement = {
                        ...actualNode,
                        props: {
                          ...actualNode.props,
                          lineCap: 'butt',
                        },
                      };
                      updateElement(updatedNode);
                    }}
                  />
                  <ToggleIconButton
                    kind="switch"
                    icon={<Tally2 size={16} />}
                    pressed={(actualNode.props.lineCap ?? 'butt') === 'round'}
                    onClick={() => {
                      const updatedNode: WeaveStateElement = {
                        ...actualNode,
                        props: {
                          ...actualNode.props,
                          lineCap: 'round',
                        },
                      };
                      updateElement(updatedNode);
                    }}
                  />
                  <ToggleIconButton
                    kind="switch"
                    icon={<Tally3 size={16} />}
                    pressed={(actualNode.props.lineCap ?? 'butt') === 'square'}
                    onClick={() => {
                      const updatedNode: WeaveStateElement = {
                        ...actualNode,
                        props: {
                          ...actualNode.props,
                          lineCap: 'square',
                        },
                      };
                      updateElement(updatedNode);
                    }}
                  />
                </div>
              </div>
              <div className="w-full flex justify-between items-center gap-4 col-span-2">
                <div className="text-[11px] text-zinc-600 font-noto-sans-mono font-light text-nowrap">
                  Open / Closed
                </div>
                <div className="w-full flex justify-end items-center gap-1">
                  <ToggleIconButton
                    kind="switch"
                    icon={<Slash size={16} />}
                    pressed={(actualNode.props.closed ?? false) === false}
                    onClick={() => {
                      const updatedNode: WeaveStateElement = {
                        ...actualNode,
                        props: {
                          ...actualNode.props,
                          closed: false,
                        },
                      };
                      updateElement(updatedNode);
                    }}
                  />
                  <ToggleIconButton
                    kind="switch"
                    icon={<Hexagon size={16} />}
                    pressed={(actualNode.props.closed ?? false) === true}
                    onClick={() => {
                      const updatedNode: WeaveStateElement = {
                        ...actualNode,
                        props: {
                          ...actualNode.props,
                          closed: true,
                        },
                      };
                      updateElement(updatedNode);
                    }}
                  />
                </div>
              </div>
              <div className="w-full flex justify-between items-center gap-4 col-span-2">
                <div className="text-[11px] text-zinc-600 font-noto-sans-mono font-light text-nowrap">
                  Bezier
                </div>
                <div className="w-full flex justify-end items-center gap-1">
                  <ToggleIconButton
                    kind="switch"
                    icon={<Spline size={16} />}
                    pressed={(actualNode.props.bezier ?? false) === true}
                    onClick={() => {
                      const updatedNode: WeaveStateElement = {
                        ...actualNode,
                        props: {
                          ...actualNode.props,
                          bezier: !(actualNode.props.bezier ?? false),
                        },
                      };
                      updateElement(updatedNode);
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
