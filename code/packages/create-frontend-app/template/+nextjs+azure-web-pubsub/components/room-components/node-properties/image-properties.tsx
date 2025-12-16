"use client";

import React from "react";
import { useWeave } from "@inditextech/weave-react";
import { useCollaborationRoom } from "@/store/store";
import { InputNumber } from "../inputs/input-number";

export function ImageProperties() {
  const instance = useWeave((state) => state.instance);
  const node = useWeave((state) => state.selection.node);

  const nodePropertiesAction = useCollaborationRoom(
    (state) => state.nodeProperties.action,
  );

  const actualNode = React.useMemo(() => {
    if (node && nodePropertiesAction === "update") {
      return node;
    }
    return undefined;
  }, [node, nodePropertiesAction]);

  if (!instance || !actualNode) return null;

  if (!["image"].includes(actualNode.type)) {
    return null;
  }

  return (
    <div className="border-b border-[#c9c9c9] p-[24px] flex flex-col gap-[16px]">
      <div className="w-full flex justify-between items-center gap-3">
        <div className="cursor-pointer hover:no-underline items-center py-0">
          <span className="text-[13px] font-inter font-light uppercase">
            Image Info
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        <InputNumber
          label="Width"
          value={actualNode.props.imageInfo.width}
          disabled={true}
        />
        <InputNumber
          label="Height"
          value={actualNode.props.imageInfo.height}
          disabled={true}
        />
      </div>
    </div>
  );
}
