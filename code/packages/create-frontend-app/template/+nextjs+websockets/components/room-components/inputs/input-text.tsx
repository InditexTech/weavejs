'use client';

import React from 'react';
import { Input } from '@/components/ui/input';

type InputTextProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export const InputText = ({
  label,
  value,
  onChange,
}: Readonly<InputTextProps>) => {
  const editingRef = React.useRef<HTMLInputElement>(null);
  const [enterPressed, setEnterPressed] = React.useState<boolean>(false);
  const [editing, setEditing] = React.useState<boolean>(false);
  const [editedValue, setEditedValue] = React.useState<string>(value);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const input = e.target as HTMLInputElement;
        input.blur();
        setEnterPressed(true);
      }
    },
    []
  );

  const handleOnChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditedValue(e.target.value);
    },
    []
  );

  React.useEffect(() => {
    if (editingRef.current) {
      editingRef.current.focus();
    }
  }, [editing]);

  return (
    <div className="flex flex-col items-start justify-start relative">
      {label && (
        <div className="text-[#757575] mb-1 text-[12px] font-inter font-light">
          {label}
        </div>
      )}
      {!editing && (
        <Input
          type="text"
          className="w-full py-0 h-[40px] rounded-none !text-[14px] !border-black font-normal text-black text-left focus:outline-none bg-transparent shadow-none"
          value={value}
          onChange={(e) => {
            if (enterPressed) {
              onChange(e.target.value);
              setEnterPressed(false);
            }
          }}
          onFocus={() => {
            setEditing(true);
            setEditedValue(value);
            window.weaveOnFieldFocus = true;
          }}
        />
      )}
      {editing && (
        <Input
          ref={editingRef}
          type="text"
          className="w-full py-0 h-[40px] rounded-none !text-[14px] !border-black font-normal text-black text-left focus:outline-none bg-transparent shadow-none"
          value={editedValue}
          onChange={handleOnChange}
          onKeyDown={handleKeyDown}
          onBlurCapture={() => {
            window.weaveOnFieldFocus = false;
            setEditing(false);
            onChange(editedValue);
          }}
        />
      )}
    </div>
  );
};
