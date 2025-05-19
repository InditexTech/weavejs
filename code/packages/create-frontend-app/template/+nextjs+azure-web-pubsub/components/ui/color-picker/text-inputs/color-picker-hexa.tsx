import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Color from 'color';
import { type HTMLAttributes, useCallback, useEffect, useState } from 'react';
import { useColorPicker } from '../context/color-picker-context';
import PercentageInput from './color-picker-alpha-percentage';

export type ColorPickerFormatEditorProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerHexaInput = ({
  className,
  ...props
}: ColorPickerFormatEditorProps) => {
  const { color, setColor } = useColorPicker();
  const [actualValue, setActualValue] = useState<string>(color.hexa());
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    setActualValue(color.hexa());
  }, [color]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(false);
    if (e.target.value.includes('#')) {
      setActualValue(e.target.value);
    } else {
      setActualValue(`#${e.target.value}`);
    }
  };

  const handleBlur = useCallback(() => {
    try {
      const newColor = Color(actualValue);
      setColor(newColor);
    } catch (error) {
      setError(true);
      console.error('Invalid color value', error);
    }
  }, [actualValue, setColor]);

  return (
    <div
      className={cn('relative flex items-center gap-1', className)}
      {...props}
    >
      <Input
        type="text"
        value={actualValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        maxLength={9}
        aria-label="Hex color value"
        className={cn(
          'h-8 rounded-none !text-[14px] font-normal text-black !border-black text-right focus:outline-none bg-transparent uppercase',
          error && 'border-red-500',
          !error && 'border-zinc-200'
        )}
      />
      <PercentageInput />
    </div>
  );
};
