"use client";

import React from "react";
import { useWeave } from "@inditextech/weave-react";
import { useCollaborationRoom } from "@/store/store";
import { ColorToken } from "./color-token";
import { SIDEBAR_ELEMENTS } from "@/lib/constants";
import { X } from "lucide-react";

type ColorTokenElement = {
  id: string;
  color: string;
};

export const ColorTokensLibrary = () => {
  const instance = useWeave((state) => state.instance);

  const sidebarLeftActive = useCollaborationRoom(
    (state) => state.sidebar.left.active
  );
  const setSidebarActive = useCollaborationRoom(
    (state) => state.setSidebarActive
  );

  const commonColorTokens: ColorTokenElement[] = React.useMemo(() => {
    return [
      { id: "1", color: "#28282D" },
      { id: "2", color: "#00656B" },
      { id: "3", color: "#D79D00" },
      { id: "4", color: "#3073B7" },
      { id: "5", color: "#953640" },
      { id: "6", color: "#C5AECF" },
      { id: "7", color: "#46295A" },
      { id: "8", color: "#79797C" },
    ];
  }, []);

  if (!instance) {
    return null;
  }

  if (sidebarLeftActive !== SIDEBAR_ELEMENTS.colorTokens) {
    return null;
  }

  return (
    <div className="pointer-events-auto w-full h-full">
      <div className="w-full font-title-xs p-1 bg-white flex justify-between items-center">
        <div className="flex justify-between  h-7 font-questrial font-light items-center text-md pl-2">
          Some Color Tokens
        </div>
        <div className="flex justify-end items-center gap-1">
          <button
            className="cursor-pointer bg-transparent hover:bg-accent p-2"
            onClick={() => {
              setSidebarActive(null);
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full h-[calc(100%-50px)] border-t border-zinc-200">
        <div
          className="grid grid-cols-1 gap-2 w-full weaveDraggable p-4"
          onDragStart={(e) => {
            if (e.target instanceof HTMLDivElement) {
              window.colorTokenDragColor = e.target.dataset.colortoken;
            }
          }}
        >
          {commonColorTokens.map((ele) => {
            return <ColorToken key={ele.id} color={ele.color} />;
          })}
        </div>
      </div>
    </div>
  );
};
