// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { SquareDashed, TextSelect } from "lucide-react";
import { SYSTEM_OS } from "@/lib/utils";
import { HelpShortcutElement } from "./help-shortcut-element";

export const HelpSelection = () => {
  return (
    <div className="w-full grid grid-cols-2 py-3 gap-x-5">
      <div className="flex flex-col gap-3">
        <HelpShortcutElement
          icon={<TextSelect />}
          label="Select all"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⇧ ⌘ A",
            [SYSTEM_OS.OTHER]: "⇧ Ctrl A",
          }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <HelpShortcutElement
          icon={<SquareDashed />}
          label="Select none"
          shortcuts={{
            [SYSTEM_OS.MAC]: "⇧ Esc",
            [SYSTEM_OS.OTHER]: "⇧ Esc",
          }}
        />
      </div>
    </div>
  );
};
