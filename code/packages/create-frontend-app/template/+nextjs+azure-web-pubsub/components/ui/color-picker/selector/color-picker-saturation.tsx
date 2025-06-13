import {
  HTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useColorPicker } from '../context/color-picker-context';
import { cn } from '@/lib/utils';
import Color from 'color';
import { hslToRgb, rgbToHsl } from '../utils';

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
      const ctx = canvas.getContext('2d', {
        willReadFrequently: true,
      });
      if (ctx && containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;

        const image = ctx.createImageData(canvas.width, canvas.height);
        for (let y = 0; y < canvas.height; y++) {
          const lightness = 1 - y / canvas.height; // top = 100%
          for (let x = 0; x < canvas.width; x++) {
            const saturation = x / canvas.width;
            const [r, g, b] = hslToRgb(hue, saturation, lightness);
            const i = (y * canvas.width + x) * 4;
            image.data[i] = r;
            image.data[i + 1] = g;
            image.data[i + 2] = b;
            image.data[i + 3] = 255;
          }
        }
        ctx.putImageData(image, 0, 0);
      }
    }
  }, [hue]);

  useEffect(() => {
    renderGradient();
  }, [renderGradient]);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!containerRef.current || !canvasRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const saturation = Math.min(1, Math.max(0, x / rect.width));
      const lightness = Math.max(0, Math.min(1, 1 - y / rect.height)); // inverted Y

      const [r, g, b] = hslToRgb(hue, saturation, lightness);

      setPosition({ x: x, y: y });
      setColor(Color.rgb(r, g, b));
    },
    [hue, setColor]
  );

  useEffect(() => {
    if (isDragging) {
      const onPointerUp = () => setIsDragging(false);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', onPointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };
    }
  }, [isDragging, handlePointerMove]);

  useEffect(() => {
    if (!isDragging && containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();

      const [r, g, b] = color.rgb().array();
      const [, s, l] = rgbToHsl(r, g, b);

      const x = s * width;
      const y = (1 - l) * height;

      setPosition({ x, y });
    }
  }, [color, isDragging]);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'relative aspect-[4/3] w-full cursor-crosshair rounded-none',
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
          className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute h-3 w-3 rounded-full border-2 border-white"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            boxShadow: '0 0 0 2px black',
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </>
  );
};
