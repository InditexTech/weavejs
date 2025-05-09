// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

"use client";

import React from "react";
// import { Pin, PinOff } from "lucide-react";
import { WeaveStateElement } from "@inditextech/weave-types";
// import { ToggleIconButton } from "../toggle-icon-button";
import { useWeave } from "@inditextech/weave-react";
import { useCollaborationRoom } from "@/store/store";
import { InputNumber } from "../inputs/input-number";

export function PositionProperties() {
  const instance = useWeave((state) => state.instance);
  const node = useWeave((state) => state.selection.node);

  const nodePropertiesAction = useCollaborationRoom(
    (state) => state.nodeProperties.action
  );

  const updateElement = React.useCallback(
    (updatedNode: WeaveStateElement) => {
      if (!instance) return;
      if (nodePropertiesAction === "update") {
        instance.updateNode(updatedNode);
        return;
      }
    },
    [instance, nodePropertiesAction]
  );

  const onRotationChange = React.useCallback(
    (value: number) => {
      if (!instance || !node) return;

      function degToRad(angle: number) {
        return (angle / 180) * Math.PI;
      }

      function getCenter(shape: WeaveStateElement) {
        const angleRad = degToRad(shape.props.rotation || 0);
        return {
          x:
            (shape.props.x || 0) +
            ((shape.props.width || 0) / 2) * Math.cos(angleRad) +
            ((shape.props.height || 0) / 2) * Math.sin(-angleRad),
          y:
            (shape.props.y || 0) +
            ((shape.props.height || 0) / 2) * Math.cos(angleRad) +
            ((shape.props.width || 0) / 2) * Math.sin(angleRad),
        };
      }

      function rotateAroundPoint(
        shape: WeaveStateElement,
        deltaDeg: number,
        point: { x: number; y: number }
      ) {
        const angleRad = degToRad(deltaDeg);
        const x = Math.round(
          point.x +
            ((shape.props.x || 0) - point.x) * Math.cos(angleRad) -
            ((shape.props.y || 0) - point.y) * Math.sin(angleRad)
        );
        const y = Math.round(
          point.y +
            ((shape.props.x || 0) - point.x) * Math.sin(angleRad) +
            ((shape.props.y || 0) - point.y) * Math.cos(angleRad)
        );
        return {
          ...shape,
          props: {
            ...shape.props,
            rotation: Math.round((shape.props.rotation || 0) + deltaDeg),
            x,
            y,
          },
        };
      }

      function rotateAroundCenter(shape: WeaveStateElement, deltaDeg: number) {
        const center = getCenter(shape);
        return rotateAroundPoint(shape, deltaDeg, center);
      }

      if (!node) return;

      let updatedNode = {
        ...node,
      };
      updatedNode = rotateAroundCenter(
        updatedNode,
        value - (updatedNode.props.rotation || 0)
      );
      updateElement(updatedNode);
    },
    [instance, node, updateElement]
  );

  if (nodePropertiesAction === "create") {
    return null;
  }

  if (!instance || !node) {
    return null;
  }

  return (
    <div className="border-b border-zinc-200">
      <div className="w-full flex justify-between items-center gap-3 p-4 py-3">
        <div className="cursor-pointer hover:no-underline items-center py-0">
          <span className="text-xs font-questrial font-light">Position</span>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 gap-3 w-full">
          <div className="grid grid-cols-2 gap-3 w-full">
            <InputNumber
              label="X (px)"
              value={node.props.x ?? 0}
              onChange={(value) => {
                const updatedNode = {
                  ...node,
                  props: {
                    ...node.props,
                    x: value,
                  },
                };
                updateElement(updatedNode);
              }}
            />
            <InputNumber
              label="Y (px)"
              value={node.props.y ?? 0}
              onChange={(value) => {
                const updatedNode = {
                  ...node,
                  props: {
                    ...node.props,
                    y: value,
                  },
                };
                updateElement(updatedNode);
              }}
            />
          </div>
          <InputNumber
            label="Rotation (deg)"
            value={node.props.rotation ?? 0}
            onChange={onRotationChange}
          />
        </div>
      </div>
    </div>
  );
}
