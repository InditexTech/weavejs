import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Color from "color";
import { type HTMLAttributes, useCallback, useEffect, useState } from "react";
import { useColorPicker } from "../context/color-picker-context";

export type ColorPickerFormatEditorProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerRGBAInput = ({
  className,
  ...props
}: ColorPickerFormatEditorProps) => {
  const { color, setColor } = useColorPicker();
    const [actualValue, setActualValue] = useState<string>(() => {
      const { r, g, b } = color.object();
      const newRGBAColor = `rgba(${r}, ${g}, ${b}, ${color.alpha()})`;
      return newRGBAColor;
    });
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const { r, g, b } = color.object();
    const newRGBAColor = `rgba(${r}, ${g}, ${b}, ${color.alpha().toFixed(2)})`;
    setActualValue(newRGBAColor);
  }, [color]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(false);
    setActualValue(e.target.value);
  };

  const handleBlur = useCallback(() => {
    try {
      const newColor = Color(actualValue);
      setColor(newColor);
    } catch (error) {
      setError(true);
      console.error("Invalid color value", error);
    }
  }, [actualValue, setColor]);

  return (
    <div
      className={cn("relative flex items-center gap-0.5", className)}
      {...props}
    >
      <Input
        type="text"
        value={actualValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        maxLength={25}
        aria-label="RGBA color value"
        className={cn(
          "h-8 rounded-none !text-xs font-normal text-gray-700 text-right focus:outline-none bg-transparent",
          error && "border-red-500",
          !error && "border-zinc-200"
        )}
      />
    </div>
  );
};
