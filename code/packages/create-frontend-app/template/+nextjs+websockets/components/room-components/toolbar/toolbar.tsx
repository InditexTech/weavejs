'use client';

import { cn } from '@/lib/utils';
import React from 'react';

type ToolbarProps = {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
};

export const Toolbar = ({
  children,
  orientation = 'vertical',
}: Readonly<ToolbarProps>) => {
  return (
    <div
      className={cn(
        'pointer-events-none gap-[1px] shadow-md px-1 py-1 bg-white border rounded-xl border-zinc-200 pointer-events-auto',
        {
          ['flex']: orientation === 'horizontal',
          ['flex flex-col']: orientation === 'vertical',
        }
      )}
    >
      {children}
    </div>
  );
};
