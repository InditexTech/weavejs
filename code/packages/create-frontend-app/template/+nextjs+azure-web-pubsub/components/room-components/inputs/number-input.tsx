import React from 'react';
import { NumericFormat, NumericFormatProps } from 'react-number-format';
import { Input } from '@/components/ui/input';

export interface NumberInputProps
  extends Omit<NumericFormatProps, 'value' | 'onValueChange'> {
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
      value: controlledValue,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = React.useState<number | undefined>(
      controlledValue ?? defaultValue
    );

    React.useEffect(() => {
      if (controlledValue !== undefined) {
        setValue(controlledValue);
      }
    }, [controlledValue]);

    const handleChange = (values: {
      value: string;
      floatValue: number | undefined;
    }) => {
      const newValue =
        values.floatValue === undefined ? undefined : values.floatValue;
      setValue(newValue);
      if (onValueChange) {
        onValueChange(newValue);
      }
    };

    const handleBlur = () => {
      if (value !== undefined) {
        if (value < min) {
          setValue(min);
          (ref as React.RefObject<HTMLInputElement>).current!.value =
            String(min);
        } else if (value > max) {
          setValue(max);
          (ref as React.RefObject<HTMLInputElement>).current!.value =
            String(max);
        }
      }
    };

    return (
      <div className="flex flex-col items-start justify-start relative">
        {label && (
          <div className="text-zinc-600 mb-1 text-[11px] font-noto-sans-mono font-light">
            {label}
          </div>
        )}

        <div className="w-full flex items-center relative">
          <NumericFormat
            value={value}
            onValueChange={handleChange}
            thousandSeparator={thousandSeparator}
            decimalScale={decimalScale}
            fixedDecimalScale={fixedDecimalScale}
            allowNegative={min < 0}
            valueIsNumericString
            onFocus={() => {
              window.weaveOnFieldFocus = true;
            }}
            onBlurCapture={() => {
              window.weaveOnFieldFocus = false;
              handleBlur();
            }}
            max={max}
            min={min}
            customInput={Input}
            placeholder={placeholder}
            getInputRef={ref}
            {...props}
            className="w-full py-0 h-[32px] rounded-none !text-xs font-normal text-gray-700 text-right focus:outline-none bg-transparent shadow-none"
          />
        </div>
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
