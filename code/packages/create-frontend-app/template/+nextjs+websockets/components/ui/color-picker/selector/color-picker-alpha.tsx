/* eslint-disable @typescript-eslint/no-unused-vars */
import { cn } from "@/lib/utils";
import { Range, Root, Thumb, Track } from "@radix-ui/react-slider";
import {
  type HTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useColorPicker } from "../context/color-picker-context";

export type ColorPickerAlphaProps = HTMLAttributes<HTMLDivElement>;

/**
 * ColorPickerAlpha component
 * A slider for selecting the alpha (transparency) value
 */
export const ColorPickerAlpha = ({
  className,
  dir,
  defaultValue,
  ...props
}: ColorPickerAlphaProps) => {
  const { color, setColor } = useColorPicker();
  const [actualValue, setActualValue] = useState<number>(color.alpha() * 100);

  useEffect(() => {
    setActualValue(color.alpha() * 100);
  }, [color]);

  const solidColor = useMemo(() => color.alpha(1).rgb().string(), [color]);

  const lastAlpha = useRef(color.alpha() * 100);

  const onValueChange = useCallback(
    ([newAlpha]: number[]) => {
      if (newAlpha !== lastAlpha.current) {
        const newColor = color.alpha(newAlpha / 100);
        setColor(newColor);
        lastAlpha.current = newAlpha;
      }
    },
    [color, setColor]
  );

  return (
    <Root
      value={[actualValue]}
      max={100}
      step={1}
      className={cn(
        "relative flex h-5 w-full touch-none items-center transition-opacity duration-200",
        className
      )}
      onValueChange={onValueChange}
      aria-label="Opacity"
      {...props}
    >
      <Track
        className="relative my-0.5 h-3 w-full grow overflow-hidden rounded-full"
        style={{
          background:
            'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
        }}
      >
        <div
          className="absolute inset-0 rounded-full transition-all duration-200"
          style={{
            background: `linear-gradient(90deg, transparent, ${solidColor})`,
          }}
        />
        <Range className="absolute h-full rounded-full bg-transparent" />
      </Track>
      <Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:h-5 hover:w-5" />
    </Root>
  );
};
