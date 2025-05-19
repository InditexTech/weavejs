import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { type ComponentProps, useEffect, useState } from 'react';
import { useColorPicker } from '../context/color-picker-context';
import Color, { ColorInstance } from 'color';

/**
 * PercentageInput component
 * An input field for percentage values with validation
 */
const PercentageInput = ({
  className,
  ...props
}: ComponentProps<typeof Input>) => {
  const { color, setColor } = useColorPicker();
  const [actualValue, setActualValue] = useState<ColorInstance>(color);

  useEffect(() => {
    setActualValue(color);
  }, [color]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newColor = Color(color.alpha(Number(e.target.value) / 100));
      setColor(newColor);
    } catch (error) {
      console.error('Invalid color value', error);
    }
  };

  return (
    <div className="relative">
      <Input
        type="number"
        max={100}
        min={0}
        step={1}
        inputMode="numeric"
        pattern="[0-9]*"
        value={Math.round(actualValue.alpha() * 100)}
        onChange={handleInputChange}
        aria-label="Opacity percentage"
        {...props}
        className={cn(
          'h-[40px] w-[4.7rem] rounded-none !text-[14px] font-normal text-black !border-black text-left focus:outline-none bg-transparent uppercase',
          className
        )}
      />
      <span className="-translate-y-1/2 absolute -translate-x-5 top-1/2 right-2 text-muted-foreground text-xs pointer-events-none">
        %
      </span>
    </div>
  );
};

export default PercentageInput;
