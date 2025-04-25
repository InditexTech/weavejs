import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { FONTS } from "@/components/utils/constants";

function InputFontFamily({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [selectedFont, setSelectedFont] = useState<string>(value);
  const [open, setOpen] = useState(false);
  const lastSelectedFontFamily = useRef<string>(value);

  useEffect(() => {
    if (onChange && selectedFont !== lastSelectedFontFamily.current) {
      lastSelectedFontFamily.current = selectedFont;
      onChange(selectedFont);
    }
  }, [selectedFont, onChange]);

  return (
    <div className="flex flex-col items-start justify-start relative">
      <div className="text-zinc-600 mb-1 text-[11px] font-noto-sans-mono font-light">
        Font Family
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="w-full">
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full h-[32px] rounded-none !text-xs text-gray-700 justify-between font-normal bg-transparent shadow-none"
            style={{ fontFamily: selectedFont }}
          >
            {selectedFont}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="rounded-none p-0 w-[var(--radix-popover-trigger-width)]">
          <Command>
            <CommandInput
              className="!text-xs text-gray-700 justify-between font-normal bg-transparent shadow-none"
              placeholder="Search font..."
            />
            <CommandList>
              <CommandEmpty>
                <span className="!text-xs text-gray-700 justify-between font-normal bg-transparent shadow-none">
                  No font found.
                </span>
              </CommandEmpty>
              <CommandGroup>
                {FONTS.map((font) => (
                  <CommandItem
                    key={font.id}
                    value={font.name}
                    onSelect={() => {
                      setSelectedFont(font.name);
                      setOpen(false);
                    }}
                    className="flex items-center"
                  >
                    <span
                      className="!text-xs text-gray-700 justify-between font-normal bg-transparent shadow-none"
                      style={{ fontFamily: font.name }}
                    >
                      {font.name}
                    </span>
                    {selectedFont === font.id && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default InputFontFamily;
