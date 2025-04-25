"use client";

import React from "react";
import { useWeave } from "@inditextech/weavejs-react";

export const SelectionInformation = () => {
  const instance = useWeave((state) => state.instance);
  const selectedNodes = useWeave((state) => state.selection.nodes);

  if (!instance) {
    return null;
  }

  if (selectedNodes.length <= 1) {
    return null;
  }

  return (
    <div className="w-full justify-center items-center rounded-lg">
      <div className="w-full h-full flex flex-col gap-[1px] bg-light-background-1">
        <div className="w-full font-title-xs p-4 border-b border-light-border-3 bg-light-background-2">
          Selected elements
        </div>
        <div className="w-full flex flex-col gap-1">
          {selectedNodes.map((node) => {
            const stage = instance.getStage();
            try {
              const box = node.instance.getClientRect();
              node.instance.toImage({
                x: box.x,
                y: box.y,
                width: box.width * stage.scaleX(),
                height: box.height * stage.scaleY(),
                callback(img) {
                  const containerNode = document.getElementById(`selection_${node.node.key}_image_container`);
                  if (containerNode) {
                    containerNode.innerHTML = "";
                    img.style.width = "100%";
                    img.style.height = "100%";
                    img.style.objectFit = "contain";
                    containerNode.appendChild(img);
                  }
                },
              });
            } catch (ex) {
              console.error(ex);
            }
            return (
              <div
                key={node.node.key}
                id={`selection_${node.node.key}`}
                className="px-4 py-3 border-b border-light-border-3 flex flex-col"
              >
                <div className="w-full grid grid-cols-[1fr_50px] gap-1">
                  <div className="w-full h-full flex flex-col justify-center items-start">
                    <div className="font-mono font-body-m-light w-full">{node.node.props.nodeType}</div>
                  </div>
                  <div
                    className="w-full h-[50px] border border-light-border-3 p-1"
                    id={`selection_${node.node.key}_image_container`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
