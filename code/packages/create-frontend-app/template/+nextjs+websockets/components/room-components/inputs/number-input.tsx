import React from "react";
import { NumericFormat, NumericFormatProps } from "react-number-format";
import { Input } from "@/components/ui/input";

export interface NumberInputProps
  extends Omit<NumericFormatProps, "value" | "onValueChange"> {
  label?: string;
  stepper?: number;
  thousandSeparator?: string;
  placeholder?: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  value?: number; // Controlled value
  suffix?: string;
  prefix?: string;
  onValueChange?: (value: number | undefined) => void;
  fixedDecimalScale?: boolean;
  decimalScale?: number;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      label,
      thousandSeparator,
      placeholder,
      defaultValue,
      min = -Infinity,
      max = Infinity,
      onValueChange,
      fixedDecimalScale = false,
      decimalScale = 0,
      value,
      ...props
    },
    ref,
  ) => {
    const editingRef = React.useRef<HTMLInputElement>(null);
    const [editing, setEditing] = React.useState<boolean>(false);
    const [editedValue, setEditedValue] = React.useState<number | undefined>(
      defaultValue,
    );

    const handleChange = React.useCallback(
      (values: { value: string; floatValue: number | undefined }) => {
        const newValue =
          values.floatValue === undefined ? undefined : values.floatValue;

        setEditedValue(newValue);
      },
      [],
    );

    const handleBlur = React.useCallback(() => {
      onValueChange?.(editedValue);

      if (editedValue !== undefined) {
        if (editedValue < min) {
          if (onValueChange) {
            onValueChange(min);
          }
          (ref as React.RefObject<HTMLInputElement>).current!.value =
            String(min);
        } else if (editedValue > max) {
          if (onValueChange) {
            onValueChange(max);
          }
          (ref as React.RefObject<HTMLInputElement>).current!.value =
            String(max);
        }
      }
    }, [editedValue, onValueChange, min, max, ref]);

    React.useEffect(() => {
      if (editingRef.current) {
        editingRef.current.focus();
      }
    }, [editing]);

    return (
      <div className="flex flex-col items-start justify-start relative">
        {label && (
          <div className="text-[#757575] mb-1 text-[12px] font-inter font-light">
            {label}
          </div>
        )}
        <div className="w-full flex items-center relative">
          {!editing && (
            <NumericFormat
              value={value}
              onValueChange={handleChange}
              thousandSeparator={thousandSeparator}
              decimalScale={decimalScale}
              fixedDecimalScale={fixedDecimalScale}
              allowNegative={min < 0}
              valueIsNumericString
              onFocus={() => {
                setEditing(true);
                setEditedValue(value);
                window.weaveOnFieldFocus = true;
              }}
              max={max}
              min={min}
              customInput={Input}
              placeholder={placeholder}
              getInputRef={ref}
              {...props}
              className="w-full py-0 h-[40px] rounded-none !text-[14px] !border-black font-normal text-black text-right focus:outline-none bg-transparent shadow-none"
            />
          )}
          {editing && (
            <NumericFormat
              value={editedValue}
              onValueChange={handleChange}
              thousandSeparator={thousandSeparator}
              decimalScale={decimalScale}
              fixedDecimalScale={fixedDecimalScale}
              allowNegative={min < 0}
              valueIsNumericString
              onBlurCapture={() => {
                window.weaveOnFieldFocus = false;
                setEditing(false);
                handleBlur();
              }}
              max={max}
              min={min}
              customInput={Input}
              placeholder={placeholder}
              getInputRef={editingRef}
              {...props}
              className="w-full py-0 h-[40px] rounded-none !text-[14px] !border-black font-normal text-black text-right focus:outline-none bg-transparent shadow-none"
            />
          )}
        </div>
      </div>
    );
  },
);

NumberInput.displayName = "NumberInput";
