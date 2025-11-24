import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Color from "color";
import { PipetteIcon } from "lucide-react";
import { type ComponentProps, useCallback, useEffect, useState } from "react";
import { useColorPicker } from "../context/color-picker-context";

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

/**
 * ColorPickerEyeDropper component
 * A button that activates the browser's eyedropper tool
 */
export const ColorPickerEyeDropper = ({
  className,
  ...props
}: ColorPickerEyeDropperProps) => {
  const { setColor } = useColorPicker();
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // @ts-expect-error - EyeDropper API is experimental
    setIsSupported(typeof EyeDropper !== "undefined");
  }, []);

  const handleEyeDropper = useCallback(async () => {
    if (!isSupported) {
      console.warn("EyeDropper API is not supported in this browser");
      return;
    }

    try {
      setIsActive(true);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // @ts-expect-error - EyeDropper API is experimental
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();

      const color = Color(result.sRGBHex);

      const [h, s, l] = color.hsl().array();

      const newColor = Color.hsl(h, s, l).alpha(100);

      setTimeout(() => {
        setColor(newColor);
      }, 50);
    } catch (error) {
      if (error instanceof Error && !error.message.includes("aborted")) {
        console.error("EyeDropper failed:", error);
      }
    } finally {
      setTimeout(() => setIsActive(false), 100);
    }
  }, [isSupported, setColor]);

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={handleEyeDropper}
        disabled={isActive}
        title="Pick color from screen"
        aria-label="Pick color from screen"
        className={cn(
          "rounded-none border-none bg-black hover:bg-[#c9c9c9] hover:text-black cursor-pointer shrink-0 text-white",
          isActive && "opacity-50 cursor-not-allowed",
          className,
        )}
        {...props}
      >
        <PipetteIcon size={16} />
      </Button>
      {isActive && (
        <div
          className="fixed inset-0 z-50 bg-transparent cursor-crosshair"
          aria-hidden="true"
        />
      )}
    </div>
  );
};
