// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormatEditor,
  ColorPickerHue,
  ColorPickerFormatSelector,
  ColorPickerSaturation,
} from "@/components/ui/color-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type InputColorProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
};

export const InputColor = ({
  label,
  value,
  onChange,
}: Readonly<InputColorProps>) => {
  const [actualValue, setActualValue] = useState<string>(value);

  useEffect(() => {
    setActualValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setActualValue(e.target.value);
  };

  const handleBlur = () => {
    onChange(actualValue);
  };

  return (
    <div className="flex flex-col items-start justify-start relative">
      {label && (
        <div className="text-zinc-600 mb-1 text-[11px] font-questrial font-light">
          {label}
        </div>
      )}
      <div className="w-full flex items-center relative">
        <Popover>
          <PopoverTrigger asChild>
            <div
              className="cursor-pointer shrink-0 w-[32px] h-[32px] mr-1 border border-zinc-200 rounded-none"
              style={{ background: `#${actualValue}` }}
            />
          </PopoverTrigger>
          <PopoverContent>
            <ColorPicker
              value={`#${actualValue}`}
              onChange={(color) => {
                onChange((color as string).slice(1));
              }}
            >
              <ColorPickerSaturation />
              <div className="flex items-center gap-4">
                <ColorPickerEyeDropper />
                <div className="w-full grid gap-1">
                  <ColorPickerHue />
                  <ColorPickerAlpha />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ColorPickerFormatSelector />
                <ColorPickerFormatEditor />
              </div>
            </ColorPicker>
          </PopoverContent>
        </Popover>

        <Input
          type="text"
          className="w-full py-0 h-[32px] rounded-none !text-xs font-normal text-gray-700 text-right focus:outline-none bg-transparent shadow-none"
          value={actualValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              const input = e.target as HTMLInputElement;
              input.blur();
            }
          }}
        />
      </div>
    </div>
  );
};
