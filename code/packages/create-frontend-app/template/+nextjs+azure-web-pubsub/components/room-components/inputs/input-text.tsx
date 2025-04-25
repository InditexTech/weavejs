"use client";

import React from "react";
import { Input } from "@/components/ui/input";

type InputTextProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export const InputText = ({
  label,
  value,
  onChange,
}: Readonly<InputTextProps>) => {
  const [actualValue, setActualValue] = React.useState<string>(`${value}`);

  React.useEffect(() => {
    setActualValue(`${value}`);
  }, [value]);

  return (
    <div className="flex flex-col items-start justify-start relative">
      {label && (
        <div className="text-zinc-600 mb-1 text-[11px] font-noto-sans-mono font-light">
          {label}
        </div>
      )}
      <Input
        type="text"
        className="w-full py-0 h-[32px] rounded-none !text-xs font-normal text-gray-700 text-left focus:outline-none bg-transparent shadow-none"
        value={actualValue}
        onChange={(e) => {
          setActualValue(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            const input = e.target as HTMLInputElement;
            input.blur();
          }
        }}
        onBlur={() => {
          onChange(actualValue);
        }}
      />
    </div>
  );
};
