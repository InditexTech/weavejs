// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

"use client";

import React from "react";
import { NumberInput } from "./number-input";

type InputNumberProps = {
  label?: string;
  disabled?: boolean;
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
};

export const InputNumber = ({
  label,
  value,
  onChange,
  disabled = false,
  min = -Infinity,
  max = Infinity,
}: Readonly<InputNumberProps>) => {
  const [actualValue, setActualValue] = React.useState<string>(`${value}`);

  React.useEffect(() => {
    setActualValue(`${value}`);
  }, [value]);

  const handleBlur = () => {
    let numberToSave = actualValue === "" ? "0" : actualValue;
    numberToSave = numberToSave.replace(/^0+/, "");
    if (isNaN(parseFloat(numberToSave))) {
      numberToSave = "0";
    }
    onChange?.(parseFloat(actualValue));
  };

  return (
    <NumberInput
      label={label}
      disabled={disabled}
      min={min}
      max={max}
      decimalScale={2}
      className="w-full text-xs font-normal text-gray-700 text-right focus:outline-none bg-transparent"
      value={Number(actualValue)}
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
      onBlur={handleBlur}
    />
  );
};
