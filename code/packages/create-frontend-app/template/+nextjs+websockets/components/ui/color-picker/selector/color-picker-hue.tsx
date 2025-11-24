/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { cn } from "@/lib/utils";
import { Range, Root, Thumb, Track } from "@radix-ui/react-slider";
import { type HTMLAttributes, useCallback, useState } from "react";
import { useColorPicker } from "../context/color-picker-context";
import Color from "color";
import { changeHue } from "../utils";

export type ColorPickerHueProps = HTMLAttributes<HTMLDivElement>;

/**
 * ColorPickerHue component
 * A slider for selecting the hue value
 */
export const ColorPickerHue = ({
  className,
  dir,
  ...props
}: ColorPickerHueProps) => {
  const { defaultValue, ...restProps } = props;
  const { color, setColor } = useColorPicker();
  const [hueValue, setHueValue] = useState(color.hue());

  const onValueChange = useCallback(
    ([hue]: number[]) => {
      setHueValue(hue);
      const [r, g, b] = color.rgb().array();
      const newColor = changeHue(r, g, b, hue);
      setColor(Color(newColor));
    },
    [color, setColor, setHueValue],
  );

  const onValueCommit = useCallback(
    ([hue]: number[]) => {
      const [r, g, b] = color.rgb().array();
      const newColor = changeHue(r, g, b, hue);
      setColor(Color(newColor));
    },
    [color, setColor],
  );

  return (
    <Root
      value={[hueValue]}
      max={360}
      step={1}
      className={cn(
        "relative flex h-5 w-full touch-none items-center transition-opacity duration-200",
        className,
      )}
      onValueChange={onValueChange}
      onValueCommit={onValueCommit}
      aria-label="Hue"
      {...restProps}
    >
      <Track className="relative my-0.5 h-3 w-full grow overflow-hidden rounded-none bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
        <Range className="absolute h-full" />
      </Track>
      <Thumb className="block h-4 w-4 cursor-pointer rounded-full border border-primary/50 bg-background shadow transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:h-5 hover:w-5" />
    </Root>
  );
};
