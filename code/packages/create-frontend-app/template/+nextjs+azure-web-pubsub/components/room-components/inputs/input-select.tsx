import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import React from 'react';

function InputSelect({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [selectedOption, setSelectedOption] = useState<string>(value);
  const [open, setOpen] = useState(false);
  const lastSelectedOption = useRef<string>(value);

  useEffect(() => {
    if (onChange && selectedOption !== lastSelectedOption.current) {
      lastSelectedOption.current = selectedOption;
      onChange(selectedOption);
    }
  }, [selectedOption, onChange]);

  return (
    <div className="flex flex-col items-start justify-start relative">
      <div className="text-[#757575] mb-1 text-[12px] font-inter font-light">
        {label}
      </div>
      <Popover
        open={open}
        onOpenChange={(value) => {
          if (!disabled) {
            setOpen(value);
          }
        }}
      >
        <PopoverTrigger className="w-full" asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full pl-3 h-[40px] rounded-none !text-[14px] !border-black text-black justify-between font-normal bg-transparent shadow-none"
          >
            {options.find((option) => option.value === selectedOption)?.label ??
              '-'}
            {!disabled && (
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="rounded-none p-0 w-[var(--radix-popover-trigger-width)] border-black rounded-none">
          <Command>
            <CommandInput
              className="!text-[14px] text-black justify-between font-normal bg-transparent shadow-none"
              onFocus={() => {
                window.weaveOnFieldFocus = true;
              }}
              onBlurCapture={() => {
                window.weaveOnFieldFocus = false;
              }}
              placeholder="Search..."
            />
            <CommandList>
              <CommandEmpty>
                <span className="!text-[14px] rounded-none text-black justify-between font-normal bg-transparent shadow-none">
                  No font found.
                </span>
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      setSelectedOption(option.value);
                      setOpen(false);
                    }}
                    className="flex items-center rounded-none"
                  >
                    <span className="!text-[14px] text-black justify-between font-normal bg-transparent shadow-none">
                      {option.label}
                    </span>
                    {selectedOption === option.value && (
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

export default InputSelect;
