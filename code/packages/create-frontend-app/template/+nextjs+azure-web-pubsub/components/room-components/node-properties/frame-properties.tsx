// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

"use client";

import React from "react";
import { WeaveStateElement } from "@inditextech/weave-types";
import { useWeave } from "@inditextech/weave-react";
import { useCollaborationRoom } from "@/store/store";
import { InputText } from "../inputs/input-text";
import InputSelect from "../inputs/input-select";
import {
  WEAVE_FRAME_NODE_SIZES,
  WEAVE_FRAME_NODE_SIZES_MULTIPLIER,
  WeaveFrameNodeSizes,
  type WeaveFrameNodeSizesOrientation,
} from "@inditextech/weave-sdk";
import { InputNumber } from "../inputs/input-number";

export function FrameProperties() {
  const instance = useWeave((state) => state.instance);
  const appState = useWeave((state) => state.appState.weave);
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
    if (actualAction && nodePropertiesAction === "create") {
      setActualNode({
        key: "creating",
        type: "undefined",
        props: {
          ...nodeCreateProps,
        },
      });
    }
    if (node && nodePropertiesAction === "update") {
      setActualNode(node);
    }
    if (!actualAction && !node) {
      setActualNode(undefined);
    }
  }, [instance, actualAction, node, nodePropertiesAction, nodeCreateProps]);

  const updateElement = React.useCallback(
    (updatedNode: WeaveStateElement) => {
      if (!instance) return;
      if (actualAction && nodePropertiesAction === "create") {
        instance.updatePropsAction(actualAction, updatedNode.props);
      }
      if (nodePropertiesAction === "update") {
        instance.updateNode(updatedNode);
      }
    },
    [instance, actualAction, nodePropertiesAction]
  );

  if (!instance || !actualNode) return null;

  if (!actualAction && !actualNode) return null;

  if (
    actualAction &&
    ["selectionTool"].includes(actualAction) &&
    !["frame"].includes(actualNode.type)
  ) {
    return null;
  }

  if (actualAction && !["selectionTool", "frameTool"].includes(actualAction))
    return null;

  return (
    <div className="border-b border-zinc-200">
      <div className="w-full flex justify-between items-center gap-3 p-4 py-3">
        <div className="cursor-pointer hover:no-underline items-center py-0">
          <span className="text-xs font-questrial font-light">Frame</span>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 gap-3 w-full">
          <InputText
            label="Title"
            value={`${actualNode.props.title ?? "Frame XXX"}`}
            onChange={(value) => {
              const updatedNode: WeaveStateElement = {
                ...actualNode,
                props: {
                  ...actualNode.props,
                  title: value,
                },
              };
              updateElement(updatedNode);
            }}
          />
          <InputSelect
            label="Orientation"
            options={[
              { label: "Landscape", value: "landscape" },
              { label: "Portrait", value: "portrait" },
            ]}
            disabled={nodePropertiesAction === "update"}
            value={`${actualNode.props.frameOrientation ?? "landscape"}`}
            onChange={(value) => {
              const updatedNode: WeaveStateElement = {
                ...actualNode,
                props: {
                  ...actualNode.props,
                  frameOrientation: value,
                },
              };
              updateElement(updatedNode);
            }}
          />
          <InputSelect
            label="Type"
            options={[
              { label: "A1", value: "A1" },
              { label: "A2", value: "A2" },
              { label: "A3", value: "A3" },
              { label: "A4", value: "A4" },
              { label: "Custom", value: "custom" },
            ]}
            disabled={nodePropertiesAction === "update"}
            value={`${actualNode.props.frameType ?? null}`}
            onChange={(value) => {
              const orientation: WeaveFrameNodeSizesOrientation = (actualNode
                .props.frameOrientation ??
                "landscape") as WeaveFrameNodeSizesOrientation;
              const type: WeaveFrameNodeSizes = (actualNode.props.frameType ??
                "A4") as WeaveFrameNodeSizes;

              const updatedNode: WeaveStateElement = {
                ...actualNode,
                props: {
                  ...actualNode.props,
                  frameType: value,
                  frameWidth:
                    WEAVE_FRAME_NODE_SIZES[orientation][type].width *
                    WEAVE_FRAME_NODE_SIZES_MULTIPLIER,
                  frameHeight:
                    WEAVE_FRAME_NODE_SIZES[orientation][type].height *
                    WEAVE_FRAME_NODE_SIZES_MULTIPLIER,
                },
              };
              updateElement(updatedNode);
            }}
          />
          {actualNode.props.frameType === "custom" && (
            <>
              <InputNumber
                label="Width (px)"
                value={actualNode.props.frameWidth ?? 16}
                disabled={nodePropertiesAction === "update"}
                onChange={(value) => {
                  const updatedNode: WeaveStateElement = {
                    ...actualNode,
                    props: {
                      ...actualNode.props,
                      frameWidth: value,
                    },
                  };
                  updateElement(updatedNode);
                }}
              />

              <InputNumber
                label="Height (px)"
                value={actualNode.props.frameHeight ?? 16}
                disabled={nodePropertiesAction === "update"}
                onChange={(value) => {
                  const updatedNode: WeaveStateElement = {
                    ...actualNode,
                    props: {
                      ...actualNode.props,
                      frameHeight: value,
                    },
                  };
                  updateElement(updatedNode);
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
