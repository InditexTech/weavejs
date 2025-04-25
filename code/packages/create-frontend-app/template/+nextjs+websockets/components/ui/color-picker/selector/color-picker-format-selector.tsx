import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type ComponentProps,
} from "react";
import { useColorPicker } from "../context/color-picker-context";

export type ColorPickerFormatSelectorProps = ComponentProps<typeof SelectTrigger>;

const formats = ["hex", "rgba"];

/**
 * ColorPickerFormatSelector component
 * A dropdown for selecting the color format
 */
export const ColorPickerFormatSelector = ({
  className,
  ...props
}: ColorPickerFormatSelectorProps) => {
  const { mode, setMode } = useColorPicker();

  return (
    <Select value={mode} onValueChange={setMode}>
      <SelectTrigger
        className={cn(
          "h-8 !text-xs rounded-none font-normal text-gray-700",
          className
        )}
        data-size="sm"
        aria-label="Color format"
        {...props}
      >
        <SelectValue placeholder="Format" />
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem key={format} value={format} className="!text-xs font-normal text-gray-700">
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
