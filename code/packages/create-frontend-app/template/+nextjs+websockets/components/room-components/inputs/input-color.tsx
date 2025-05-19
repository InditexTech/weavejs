'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormatEditor,
  ColorPickerHue,
  ColorPickerFormatSelector,
  ColorPickerSaturation,
} from '@/components/ui/color-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

  return (
    <div className="flex flex-col items-start justify-start relative">
      {label && (
        <div className="text-[#757575] mb-1 text-[12px] font-inter font-light">
          {label}
        </div>
      )}
      <div className="w-full flex items-center relative">
        <Popover>
          <PopoverTrigger asChild>
            <div
              className="cursor-pointer shrink-0 w-[40px] h-[40px] mr-1 border border-zinc-200 rounded-none"
              style={{ background: actualValue }}
            />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="top"
            alignOffset={0}
            sideOffset={9}
            className="rounded-none border-black"
          >
            <ColorPicker
              value={actualValue}
              onChange={(color) => {
                setActualValue(color as string);
                onChange(color as string);
              }}
              onFocus={() => {
                window.weaveOnFieldFocus = true;
              }}
              onBlurCapture={() => {
                window.weaveOnFieldFocus = false;
                onChange(actualValue);
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
              <div className="flex items-center gap-1">
                <ColorPickerFormatSelector />
                <ColorPickerFormatEditor />
              </div>
            </ColorPicker>
          </PopoverContent>
        </Popover>

        <Input
          type="text"
          className="w-full py-0 h-[40px] rounded-none !text-[14px] !border-black font-normal text-black text-right focus:outline-none bg-transparent shadow-none"
          value={actualValue ?? '#000000ff'}
          onChange={handleInputChange}
          onFocus={() => {
            window.weaveOnFieldFocus = true;
          }}
          onBlurCapture={() => {
            window.weaveOnFieldFocus = false;
            onChange(actualValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
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
