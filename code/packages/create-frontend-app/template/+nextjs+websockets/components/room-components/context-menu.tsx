'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type ContextMenuButtonProps = {
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

export type ContextMenuOption = {
  id: string;
  type: 'button' | 'divider';
} & (
  | {
      type: 'button';
      label: string | React.ReactNode;
      icon?: React.ReactNode;
      disabled?: boolean;
      onClick: () => void;
    }
  | {
      type: 'divider';
    }
);

type ContextMenuProps = {
  show: boolean;
  onChanged: (show: boolean) => void;
  position: { x: number; y: number };
  options: ContextMenuOption[];
};

function ContextMenuButton({
  label,
  icon,
  disabled,
  onClick,
}: Readonly<ContextMenuButtonProps>) {
  return (
    <button
      className={cn(
        '!cursor-pointer w-[calc(100%-8px)] flex justify-between items-center gap-2 font-questrial text-sm text-left whitespace-nowrap m-1 text-foreground px-2 py-1.5',
        {
          ['hover:bg-accent']: !disabled,
          ['!cursor-default hover:bg-white text-muted-foreground']: disabled,
        }
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {icon} <div className="w-full">{label}</div>
    </button>
  );
}

export const ContextMenuRender = ({
  show,
  onChanged,
  position,
  options,
}: Readonly<ContextMenuProps>) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (ref.current && show) {
      const boundingRect = ref.current.getBoundingClientRect();
      let X = boundingRect.x;
      let Y = boundingRect.y;

      X = Math.max(
        20,
        Math.min(X, window.innerWidth - boundingRect.width - 20)
      );
      Y = Math.max(
        20,
        Math.min(Y, window.innerHeight - boundingRect.height - 20)
      );

      ref.current.style.top = `${Y}px`;
      ref.current.style.left = `${X}px`;
    }
  }, [show]);

  React.useEffect(() => {
    function checkIfClickedOutside(e: MouseEvent) {
      if (
        ref.current &&
        e.target !== ref.current &&
        !ref.current.contains(e.target as Node)
      ) {
        ref.current.style.display = `none`;
        onChanged(false);
      }
    }

    function checkIfTouchOutside(e: TouchEvent) {
      console.log(e);
      if (
        ref.current &&
        e.target !== ref.current &&
        !ref.current.contains(e.target as Node)
      ) {
        ref.current.style.display = `none`;
        onChanged(false);
      }
    }

    window.addEventListener('click', checkIfClickedOutside);
    window.addEventListener('touchstart', checkIfTouchOutside);

    return () => {
      window.removeEventListener('click', checkIfClickedOutside);
      window.removeEventListener('touchstart', checkIfTouchOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      className="fixed w-[300px] bg-white flex flex-col border border-zinc-200 shadow-lg"
      style={{
        display: show ? 'block' : 'none',
        top: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: 10,
      }}
    >
      {options.map((option) => {
        if (option.type === 'button') {
          return (
            <ContextMenuButton
              key={option.id}
              label={option.label}
              icon={option.icon}
              disabled={option.disabled ?? false}
              onClick={option.onClick}
            />
          );
        }
        if (option.type === 'divider') {
          return (
            <div key={option.id} className="w-full h-[1px] bg-accent"></div>
          );
        }
      })}
    </div>
  );
};
