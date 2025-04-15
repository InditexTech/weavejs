"use client";

import { cn } from "@/lib/utils";
import React from "react";

type ToolbarProps = {
  children: React.ReactNode;
  orientation?: "horizontal" | "vertical";
};

export const Toolbar = ({
  children,
  orientation = "vertical",
}: Readonly<ToolbarProps>) => {
  return (
    <div
      className={cn(
        "pointer-events-none gap-[1px] shadow-lg px-1 py-1 bg-white border border-light-border-3 pointer-events-auto",
        {
          ["flex"]: orientation === "horizontal",
          ["flex flex-col"]: orientation === "vertical",
        }
      )}
    >
      {children}
    </div>
  );
};
