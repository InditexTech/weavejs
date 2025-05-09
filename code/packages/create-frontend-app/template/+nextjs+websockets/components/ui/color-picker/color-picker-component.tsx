// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Color, { ColorInstance } from "color";
import { HTMLAttributes, useEffect, useRef, useState } from "react";
import { ColorPickerContext } from "./context/color-picker-context";
import { cn } from "@/lib/utils";

export type ColorPickerProps = HTMLAttributes<HTMLDivElement> & {
  /** The current color value in #RRGGBBAA format */
  value?: string;
  /** The default color value in #RRGGBBAA format */
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
};

/**
 * ColorPicker component
 * A comprehensive color picker that supports various color formats
 */
export const ColorPicker = ({
  value,
  onChange,
  className,
  ...props
}: ColorPickerProps) => {
  const initialColor = Color(value);

  const [color, setColor] = useState<ColorInstance>(initialColor);
  const [mode, setMode] = useState("hex");

  const lastValue = useRef(Color(initialColor).hexa());

  useEffect(() => {
    if (Color(value).hexa() !== lastValue.current) {
      const externalColor = Color(value);
      setColor(externalColor);
      lastValue.current = externalColor.hexa();
    }
  }, [value]);

  useEffect(() => {
    if (onChange) {
      const newColor = Color(color);
      if (lastValue.current !== newColor.hexa()) {
        onChange(newColor.hexa());
        lastValue.current = newColor.hexa();
      }
    }
  }, [color, onChange]);

  return (
    <ColorPickerContext.Provider
      value={{
        color,
        mode,
        setColor,
        setMode,
        isUpdating: false,
      }}
    >
      <div
        className={cn(
          "grid w-full gap-4 rounded-none transition-opacity duration-150",
          className
        )}
        {...props}
      />
    </ColorPickerContext.Provider>
  );
};
