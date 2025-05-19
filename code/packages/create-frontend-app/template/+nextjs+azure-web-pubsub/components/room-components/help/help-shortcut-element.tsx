import React from 'react';
import { ShortcutElement } from './shortcut-element';

type HelpShortcutElement = {
  icon: React.ReactElement;
  label: string;
  shortcuts: Record<string, string>;
};

export const HelpShortcutElement = ({
  icon,
  label,
  shortcuts,
}: Readonly<HelpShortcutElement>) => {
  return (
    <div className="flex justify-between items-center text-white">
      <div className="flex gap-2 justify-start items-center">
        {React.cloneElement(icon, { size: 20 })}
        <div className="text-white font-inter text-sm">{label}</div>
      </div>
      <ShortcutElement shortcuts={shortcuts} />
    </div>
  );
};
