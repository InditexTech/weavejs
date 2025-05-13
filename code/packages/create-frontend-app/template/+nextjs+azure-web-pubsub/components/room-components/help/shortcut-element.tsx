import React from 'react';
import { cn, SYSTEM_OS } from '@/lib/utils';
import { useGetOs } from '../hooks/use-get-os';

type ShortcutElement = {
  variant?: 'default' | 'light';
  shortcuts: Record<string, string>;
};

export const ShortcutElement = ({
  variant = 'default',
  shortcuts,
}: Readonly<ShortcutElement>) => {
  const os = useGetOs();

  const isMac = React.useMemo(() => os === SYSTEM_OS.MAC, [os]);

  const keys = React.useMemo(() => {
    return isMac ? shortcuts[SYSTEM_OS.MAC] : shortcuts[SYSTEM_OS.OTHER];
  }, [isMac, shortcuts]);

  return (
    <div className="flex gap-1 justify-start items-center">
      {keys.split(' ').map((key) => {
        return (
          <span
            key={key}
            className={cn(
              'inline-flex justify-start items-center p-0.5 px-1.5 rounded-xs font-questrial text-xs',
              {
                ['bg-accent text-black']: variant === 'light',
                ['bg-zinc-800 text-white']: variant === 'default',
              }
            )}
          >
            {key}
          </span>
        );
      })}
    </div>
  );
};
