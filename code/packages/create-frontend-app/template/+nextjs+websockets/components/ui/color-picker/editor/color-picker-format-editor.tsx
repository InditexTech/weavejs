import { HTMLAttributes, useMemo } from 'react';
import { ColorPickerHexaInput } from '../text-inputs/color-picker-hexa';
import { useColorPicker } from '../context/color-picker-context';
import { ColorPickerRGBAInput } from '../text-inputs/color-picker-rgba';

export type ColorPickerFormatEditorProps = HTMLAttributes<HTMLDivElement>;

/**
 * ColorPickerFormatEditor component
 * Displays and allows editing of the color value in the selected format
 */
export const ColorPickerFormatEditor = ({
  className,
  ...props
}: ColorPickerFormatEditorProps) => {
  const { mode } = useColorPicker();
  const component = useMemo(() => {
    let component;
    switch (mode) {
      case 'hex':
        component = <ColorPickerHexaInput {...props} className={className} />;
        break;
      case 'rgba':
        component = <ColorPickerRGBAInput {...props} className={className} />;
        break;
      default:
        component = <ColorPickerHexaInput {...props} className={className} />;
    }
    return component;
  }, [className, mode, props]);

  return <>{component}</>;
};
