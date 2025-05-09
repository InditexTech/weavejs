// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import Image from "next/image";
import logoSrc from "@/assets/images/logo.png";
import { cn } from "@/lib/utils";

type LogoProps = {
  kind?: "large" | "small";
  variant?: "no-text" | "text";
};

export function Logo({
  kind = "large",
  variant = "text",
}: Readonly<LogoProps>) {
  return (
    <div className="p-0 bg-transparent flex justify-start items-center gap-2">
      <Image
        src={logoSrc}
        width={kind === "large" ? 64 : 32}
        height={kind === "large" ? 64 : 32}
        className={cn(`object-cover`, {
          ["w-11 h-11"]: kind === "large",
          ["w-8 h-8"]: kind === "small",
        })}
        alt="Weave.js logo"
      />
      {variant === "text" && (
        <div className="font-questrial text-muted-foreground !normal-case">
          Weave.js
        </div>
      )}
    </div>
  );
}
