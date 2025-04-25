"use client";

import { cn } from "@/lib/utils";
import React from "react";

type ToolbarToggleButtonProps = {
  icon: React.ReactNode;
  onClick: () => void;
  pressed: boolean;
  disabled?: boolean;
};

export const ToolbarToggleButton = ({
  icon,
  onClick,
  pressed,
  disabled = false,
}: Readonly<ToolbarToggleButtonProps>) => {
  const [isPressed, setIsPressed] = React.useState<boolean>(pressed);

  React.useEffect(() => {
    setIsPressed(pressed);
  }, [pressed]);

  return (
    <button
      className={cn(
        "pointer-events-auto cursor-pointer bg-light-background-1 hover:bg-light-background-2 active:bg-light-background-3 disabled:cursor-default disabled:bg-light-background-disabled disabled:text-light-content-disabled px-3 py-3 flex justify-center items-center",
        {
          ["bg-light-background-1"]: !isPressed,
          ["bg-light-background-3"]: isPressed,
        },
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  );
};
