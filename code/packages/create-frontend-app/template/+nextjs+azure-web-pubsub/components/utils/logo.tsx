import React from 'react';
import Image from 'next/image';
import logoSrc from '@/assets/images/logo.png';
import { cn } from '@/lib/utils';

type LogoProps = {
  kind?: 'large' | 'small';
  variant?: 'no-text' | 'text';
};

export function Logo({
  kind = 'large',
  variant = 'text',
}: Readonly<LogoProps>) {
  return (
    <div className="p-0 bg-transparent flex justify-start items-center gap-2">
      <Image
        src={logoSrc}
        width={kind === 'large' ? 64 : 40}
        height={kind === 'large' ? 64 : 40}
        className={cn(`object-cover`, {
          ['w-11 h-11']: kind === 'large',
          ['w-[40px] h-[40px]']: kind === 'small',
        })}
        alt="Weave.js logo"
      />
      {variant === 'text' && (
        <div
          className={cn('font-inter font-extralight text-black !normal-case', {
            ['text-[32px]']: kind === 'large',
            ['text-[22px]']: kind === 'small',
          })}
        >
          Weave.js
        </div>
      )}
    </div>
  );
}
