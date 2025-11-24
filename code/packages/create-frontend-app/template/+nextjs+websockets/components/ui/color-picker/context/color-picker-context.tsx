import { ColorInstance } from "color";
import { createContext, useContext } from "react";

interface ColorPickerContextValue {
  mode: string;
  setColor: (color: ColorInstance) => void;
  setMode: (mode: string) => void;
  color: ColorInstance;
  isUpdating: boolean;
}

export const ColorPickerContext = createContext<
  ColorPickerContextValue | undefined
>(undefined);

/**
 * Hook to access the ColorPicker context
 * Must be used within a ColorPicker component
 */
export const useColorPicker = () => {
  const context = useContext(ColorPickerContext);

  if (!context) {
    throw new Error("useColorPicker must be used within a ColorPickerProvider");
  }

  return context;
};
