import {
  HTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useColorPicker } from "../context/color-picker-context";
import { cn } from "@/lib/utils";
import Color from "color";

export type ColorPickerSaturationProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSaturation = ({
  className,
  ...props
}: ColorPickerSaturationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { color, setColor } = useColorPicker();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const hue = useMemo(() => color.hue(), [color]);

  // Function to render the gradient on the hidden canvas
  const renderGradient = useCallback(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx && containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;

        const gradX = ctx.createLinearGradient(0, 0, width, 0);
        gradX.addColorStop(0.1, "rgb(255,255,255)");
        gradX.addColorStop(0.9, `hsl(${hue}, 100%, 50%)`);
        ctx.fillStyle = gradX;
        ctx.fillRect(0, 0, width, height);

        const gradY = ctx.createLinearGradient(0, 0, 0, height);
        gradY.addColorStop(0.1, "rgba(0,0,0,0)");
        gradY.addColorStop(0.9, "rgba(0,0,0,1)");
        ctx.fillStyle = gradY;
        ctx.fillRect(0, 0, width, height);
      }
    }
  }, [hue]);

  useEffect(() => {
    renderGradient();
  }, [renderGradient]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isDragging || !containerRef.current || !canvasRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(
        0,
        Math.min(rect.width - 1, event.clientX - rect.left)
      );
      const y = Math.max(
        0,
        Math.min(rect.height - 1, event.clientY - rect.top)
      );
      setPosition({ x: x / rect.width, y: y / rect.height });

      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;

        const [r, g, b] = pixel;

        let newColor = Color.rgb(r, g, b);

        const newHsv = newColor.hsv().object();
        const oldHsv = color.hsv().object();

        if (newHsv.s === 0) {
          newHsv.h = oldHsv.h;
        }

        newColor = Color.hsv(newHsv.h, newHsv.s, newHsv.v).alpha(color.alpha());
        setColor(newColor);
      }
    },
    [color, isDragging, setColor]
  );

  useEffect(() => {
    if (isDragging) {
      const onPointerUp = () => setIsDragging(false);
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", onPointerUp);
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };
    }
  }, [isDragging, handlePointerMove]);

  useEffect(() => {
    if (!isDragging && containerRef.current) {
      const { s, v } = color.hsv().object();
      const newX = s / 100;
      const newY = (100 - v) / 100;
      setPosition({ x: newX, y: newY });
    }
  }, [color, isDragging]);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "relative aspect-[4/3] w-full cursor-crosshair rounded-none",
          className
        )}
        style={{
          background: `linear-gradient(0deg, rgb(0,0,0), transparent),linear-gradient(90deg, rgb(255,255,255), hsl(${hue},100%,50%))`,
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
          handlePointerMove(e.nativeEvent);
        }}
        {...props}
      >
        <div
          className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white"
          style={{
            left: `${position.x * 100}%`,
            top: `${position.y * 100}%`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
          }}
        />
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  );
};
